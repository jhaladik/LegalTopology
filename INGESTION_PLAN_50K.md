# Decision Ingestion Plan: 50K Lower Court Decisions

**Date:** 2025-09-27
**Status:** Ready for 2,000 → 50,000 decisions
**Current corpus:** ~1,000 Supreme Court decisions + 3,081 Civil Code sections

---

## Critical Parameters Review

### 1. **Embedding Model** ✅
```toml
OPENAI_MODEL = "text-embedding-3-large"
EMBEDDING_DIMENSIONS = "1536"
```

**Status:** ✅ Correct
- `text-embedding-3-large` is the most powerful OpenAI embedding model
- 1536 dimensions provide excellent semantic precision
- **Do NOT change** - changing model would require re-ingesting entire corpus

---

### 2. **Weight Calculation** ⚠️ NEEDS REVIEW

**Current formula** (`worker/src/weights/calculator.ts:14-43`):

```typescript
weight = court_weight × recency × citation_factor × binding × en_banc × overruled

Where:
- court_weight:
  - Nejvyšší soud (Supreme): 10.0
  - Vrchní soud (High): 5.0
  - Krajský soud (Regional): 2.0
  - Okresní soud (District): 1.0

- recency = exp(-0.15 × years_old)
  - 2025 decision: 1.0
  - 2020 decision: 0.47
  - 2015 decision: 0.22
  - 2010 decision: 0.10
  - 2005 decision: 0.05

- citation_factor = 1 + log1p(citation_count) × 0.2
  - 0 citations: 1.0
  - 10 citations: 1.48
  - 50 citations: 1.77
  - 100 citations: 1.93

- binding: ×2.0 if is_binding=true
- en_banc: ×1.5 if en_banc=true
- overruled: ×0.1 if overruled=true
```

#### **Issues Identified:**

1. **Recency decay too aggressive** ⚠️
   - 2010 decision gets 0.10 weight (90% penalty)
   - Lower court decisions from 2015 with regional court weight 2.0:
     - Final weight = 2.0 × 0.22 = **0.44**
   - This may be too harsh for stable doctrines (property law, contracts)

2. **Court hierarchy may over-penalize lower courts** ⚠️
   - District court decision from 2020: 1.0 × 0.47 = **0.47**
   - Supreme court decision from 2020: 10.0 × 0.47 = **4.7**
   - Ratio: 10:1 - is this correct?

3. **is_binding defaults to TRUE** ⚠️
   - In `ingest-decision.ts:62`: `is_binding: true` default
   - Lower court decisions should likely be `is_binding: false`
   - This adds ×2.0 multiplier unintentionally

4. **Citation count unknown for most decisions** ℹ️
   - Defaults to 0 (citation_factor = 1.0)
   - Could be enriched later from database

---

### 3. **Proposed Weight Adjustments**

#### **Option A: Conservative (Recommended for first 2K)**
```typescript
// Slower recency decay
recency = Math.exp(-0.08 × yearsOld);  // was -0.15

// Adjusted court weights to reduce Supreme Court dominance
COURT_WEIGHTS = {
  'Nejvyšší soud': 5.0,     // was 10.0
  'Vrchní soud': 3.0,        // was 5.0
  'Krajský soud': 2.0,       // unchanged
  'Okresní soud': 1.0        // unchanged
};

// Fix is_binding default for lower courts
if (court !== 'Nejvyšší soud') {
  is_binding: false  // no ×2.0 multiplier
}
```

**Resulting weights:**
- Supreme 2020: 5.0 × 0.62 × 2.0 = **6.2**
- Regional 2020: 2.0 × 0.62 = **1.24**
- District 2020: 1.0 × 0.62 = **0.62**
- Supreme 2010: 5.0 × 0.25 × 2.0 = **2.5**
- Regional 2010: 2.0 × 0.25 = **0.5**

Ratio Supreme:Regional = 5:1 (more balanced than 10:1)

#### **Option B: Aggressive (If Option A shows lower courts too weak)**
```typescript
recency = Math.exp(-0.05 × yearsOld);  // even slower

COURT_WEIGHTS = {
  'Nejvyšší soud': 4.0,
  'Vrchní soud': 2.5,
  'Krajský soud': 1.8,
  'Okresní soud': 1.0
};
```

---

### 4. **Text Preparation** ✅

**Statute embedding** (`prompts.ts:3-11`):
```
Legal Statute - Civil Code Section §{section} - {chapter}

{text}

[This is a statutory provision from Czech Civil Code, effective {version_date}]
```
✅ Correct - statutes get clear context

**Decision embedding** (`prompts.ts:13-27`):
```
Court Decision - {court} ({year})
Case: {case_id}
Interprets: {statute_refs}

{text}

[This is judicial interpretation from Czech {court}]
```
✅ Correct - decisions tagged with court level and statute references

---

### 5. **Chunking Strategy** ✅

**Decision chunking** (`decision-chunker.ts:135-204`):

1. **Principle chunk** (pravni_veta):
   - Weight: `base_weight × 1.2` ✅ (20% boost for legal principles)
   - Subtype: `'principle'`
   - **Purpose:** Abstract legal rule, should match queries strongly

2. **Full decision sections**:
   - Weight: `base_weight`
   - Subtype: `'full_decision'`
   - Max size: 14,000 chars (reasonable for embedding)
   - Split by Roman numerals (I, II, III, IV, V)

✅ **Chunking is correct** - two-layer approach:
- Principles for doctrine matching
- Full text for factual context

---

### 6. **Classification** ✅

**Legal classifier** (`legal-classifier.ts`):
- Classifies decisions into legal frameworks (civil/trestni/spravni)
- Detects subject areas automatically
- Adds metadata: `legal_framework`, `legal_area`, `primary_statutes`

✅ This enriches searchability without affecting weights

---

### 7. **Vector Storage Metadata** ✅

**Stored in Vectorize** (`processor-service.ts:71-81`):
```javascript
{
  ...metadata,  // court, date, case_id, etc.
  weight: weight,
  text: truncated_text,  // first 5000 chars
  indexed_at: timestamp,
  embedding_model: "text-embedding-3-large",

  // From classifier:
  legal_framework: "civil",
  legal_area: "property",
  primary_statutes: ["§2991", "§3004"],
  classified: true
}
```

✅ All necessary metadata present

**Note:** Vectorize uses `weight` metadata but **does NOT apply it to cosine similarity scores automatically**. We would need to multiply scores by weight in application code if we want weighted retrieval.

---

### 8. **Current Query Behavior** ⚠️ NOT USING WEIGHTS

**In `query-topology.ts:115-119`:**
```typescript
const baseResults = await env.VECTORIZE.query(baseEmbedding, {
  topK: topK * 2,
  returnMetadata: true,
  returnValues: false
});
```

**Vectorize returns:**
- `score`: cosine similarity (0-1)
- `metadata`: includes `weight` field

**But we're NOT multiplying `score × weight`!**

This means:
- Supreme Court decision (weight 6.2) with score 0.60 → **displayed as 0.60**
- District Court decision (weight 0.62) with score 0.60 → **displayed as 0.60**

They rank equally, which is WRONG.

---

## 🚨 **CRITICAL FIX NEEDED**

### **Apply Weights in Query Results**

Need to modify ALL query handlers to multiply scores by weights:

```typescript
const baseResults = await env.VECTORIZE.query(baseEmbedding, {
  topK: topK * 4,  // Get more results before weighting
  returnMetadata: true,
  returnValues: false
});

// Apply weights to scores
const weightedResults = baseResults.matches.map((m: any) => ({
  ...m,
  raw_score: m.score,
  weighted_score: m.score * (m.metadata.weight || 1.0),
  score: m.score * (m.metadata.weight || 1.0)  // Override score
}));

// Re-sort by weighted score
weightedResults.sort((a, b) => b.weighted_score - a.weighted_score);

// Take topK after re-ranking
const topResults = weightedResults.slice(0, topK);
```

**Files to update:**
1. `query-topology.ts` - base search and doctrine probing
2. `synthesize-topology.ts` - if it queries directly
3. `query.ts` - old query handler

---

## Recommended Ingestion Plan

### **Phase 1: Test Batch (200 decisions)**

1. **Fix weight application in queries** (CRITICAL)
2. **Adjust weight formula** (Option A - Conservative)
3. **Test with 200 diverse decisions:**
   - 50 Regional Court (Krajský) 2020-2025
   - 50 Regional Court 2015-2019
   - 50 District Court (Okresní) 2020-2025
   - 50 District Court 2015-2019

4. **Validate:**
   - Run test queries, check if Supreme Court still dominates appropriately
   - Check if recent Regional decisions appear in top 10 for their doctrines
   - Verify District court decisions don't pollute results with noise

### **Phase 2: Pilot Batch (2,000 decisions)**

If Phase 1 works:
1. Ingest 2,000 lower court decisions
2. Run full test suite (SI-01 through SI-10, MI-01 through MI-05)
3. Check:
   - Primary doctrine still correctly identified?
   - Are lower court cases providing useful context?
   - Any false positives from noisy district court decisions?

### **Phase 3: Full Ingestion (50,000 decisions)**

If Phase 2 shows good results:
1. Ingest remaining ~48,000 decisions
2. Monitor:
   - Average query response time (should stay <3s)
   - Doctrine cluster quality
   - User feedback on relevance

---

## Default Metadata for Lower Courts

```typescript
{
  court: "Krajský soud v Praze",  // from parsing
  date: "2020-05-15",  // from parsing
  is_binding: false,  // 🚨 NOT TRUE for lower courts
  en_banc: false,
  citation_count: 0,  // unknown, enrich later
  overruled: false
}
```

---

## Summary of Changes Needed

### 🚨 **CRITICAL (Must fix before 2K ingestion):**
1. ✅ **Apply weights to query results** - multiply `score × weight`
2. ✅ **Fix `is_binding` default** - should be `false` for lower courts
3. ✅ **Adjust recency decay** - from -0.15 to -0.08

### ⚠️ **Important (Tune during testing):**
4. Consider reducing Supreme Court weight from 10.0 → 5.0
5. Monitor if older decisions (2010-2015) are too weak

### ℹ️ **Optional (Future):**
6. Enrich citation counts from case law database
7. Add doctrine-specific weights (e.g., boost property law decisions in property queries)

---

## Next Steps

1. Implement weight application in query handlers
2. Update weight calculator with Option A parameters
3. Test with 200 decisions
4. Validate on test suite
5. Proceed to 2,000 decisions
6. Full 50,000 ingestion
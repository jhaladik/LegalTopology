# Weight System Implementation

**Date:** 2025-09-27
**Status:** ✅ Implemented and ready for testing
**Version:** Option A (Conservative)

---

## Overview

The weight system ranks judicial decisions and statutes by authority, recency, and importance. This document describes the complete implementation.

---

## Weight Calculation Formula

```typescript
weight = court_weight × recency × citation_factor × binding × en_banc × overruled
```

### Current Parameters (Option A - Conservative)

#### 1. Court Hierarchy Weights
```typescript
COURT_WEIGHTS = {
  'Nejvyšší soud': 5.0,     // Supreme Court (was 10.0)
  'Vrchní soud': 3.0,        // High Court (was 5.0)
  'Krajský soud': 2.0,       // Regional Court
  'Okresní soud': 1.0        // District Court
}
```

**Rationale:** Reduced Supreme Court dominance from 10:1 to 5:1 ratio vs District Court to allow relevant lower court decisions to surface.

#### 2. Recency Decay
```typescript
recency = Math.exp(-0.08 × yearsOld)
```

**Example weights:**
- 2025 decision: 1.00
- 2020 decision: 0.62 (was 0.47)
- 2015 decision: 0.45 (was 0.22)
- 2010 decision: 0.25 (was 0.10)
- 2005 decision: 0.13 (was 0.05)

**Rationale:** Slower decay from -0.15 to -0.08 gives more weight to stable doctrines in older decisions.

#### 3. Citation Factor
```typescript
citation_factor = 1 + Math.log1p(citation_count) × 0.2
```

**Example factors:**
- 0 citations: 1.00
- 10 citations: 1.48
- 50 citations: 1.77
- 100 citations: 1.93

**Status:** Most decisions default to 0 citations (factor = 1.0). Can be enriched later.

#### 4. Binding Precedent Multiplier
```typescript
if (is_binding) weight *= 2.0
```

**Default logic:**
```typescript
is_binding: court === 'Nejvyšší soud' || court === 'Supreme Court'
```

**Rationale:** Only Supreme Court decisions are binding precedent by default. Lower courts set is_binding = false.

#### 5. En Banc Multiplier
```typescript
if (en_banc) weight *= 1.5
```

**Status:** Defaults to false, can be set in metadata.

#### 6. Overruled Penalty
```typescript
if (overruled) weight *= 0.1
```

**Status:** Defaults to false, can be set in metadata.

---

## Example Weights (Option A)

### Recent Decisions (2020)
- **Supreme Court binding:** 5.0 × 0.62 × 2.0 = **6.2**
- **High Court:** 3.0 × 0.62 = **1.86**
- **Regional Court:** 2.0 × 0.62 = **1.24**
- **District Court:** 1.0 × 0.62 = **0.62**

**Ratio:** Supreme:Regional = 5:1, Supreme:District = 10:1

### Older Decisions (2010)
- **Supreme Court binding:** 5.0 × 0.25 × 2.0 = **2.5**
- **Regional Court:** 2.0 × 0.25 = **0.5**
- **District Court:** 1.0 × 0.25 = **0.25**

**Observation:** Recent District Court (0.62) ranks higher than old Regional Court (0.5)

---

## Implementation Details

### 1. Weight Calculation
**File:** `worker/src/weights/calculator.ts`

```typescript
export function calculateDecisionWeight(metadata: JudicialMetadata): number {
  let weight = 1.0;

  // Court hierarchy
  const courtWeight = COURT_WEIGHTS[metadata.court] || 1.0;
  weight *= courtWeight;

  // Recency decay
  const yearsOld = (now - decisionDate) / (365.25 days);
  const recency = Math.exp(-0.08 × yearsOld);
  weight *= recency;

  // Citation factor
  const citationFactor = 1 + Math.log1p(citation_count) × 0.2;
  weight *= citationFactor;

  // Multipliers
  if (is_binding) weight *= 2.0;
  if (en_banc) weight *= 1.5;
  if (overruled) weight *= 0.1;

  return weight;
}
```

### 2. Weight Storage
**File:** `worker/src/services/processor-service.ts`

Weights are calculated during ingestion and stored in Vectorize metadata:

```typescript
await env.VECTORIZE.upsert([{
  id: chunk_id,
  values: embedding,
  metadata: {
    ...chunk_metadata,
    weight: calculated_weight,
    // ... other metadata
  }
}]);
```

### 3. Weight Application in Queries

**Critical:** Vectorize returns raw cosine similarity scores (0-1). We must multiply by weights.

#### Implementation Pattern (all query handlers)

```typescript
// Get results from Vectorize
const results = await env.VECTORIZE.query(embedding, {
  topK: topK * 4,  // Get more results before re-ranking
  returnMetadata: true
});

// Apply weights to scores
const weightedResults = results.matches.map((m: any) => ({
  ...m,
  raw_score: m.score,  // Preserve original cosine similarity
  score: m.score * (m.metadata.weight || 1.0),  // Apply weight
  weighted_score: m.score * (m.metadata.weight || 1.0)
}));

// Re-sort by weighted scores
weightedResults.sort((a, b) => b.weighted_score - a.weighted_score);

// Take topK after re-ranking
const topResults = weightedResults.slice(0, topK);
```

**Files updated:**
1. ✅ `worker/src/handlers/query-topology.ts` - All query operations (base, probes, doctrine clusters, context enhanced)
2. ✅ `worker/src/handlers/query.ts` - Already implemented
3. ✅ `worker/src/handlers/synthesize-topology.ts` - Uses query-topology.ts (inherits weight application)

---

## Chunking Strategy

**File:** `worker/src/chunking/decision-chunker.ts`

### Principle Chunks (pravni_veta)
```typescript
weight = base_weight × 1.2
```

**Purpose:** Legal principles get 20% boost for better matching to doctrinal queries.

### Full Decision Sections
```typescript
weight = base_weight
```

**Purpose:** Factual context for legal reasoning.

**Max chunk size:** 14,000 characters
**Split method:** Roman numerals (I, II, III, IV, V)

---

## Query Behavior

### Base Search
1. User query → embedding
2. Vectorize returns topK × 4 results with cosine similarity
3. **Apply weights:** score × weight
4. Re-sort by weighted_score
5. Return top topK results

### Doctrine Probing
For each doctrine probe:
1. Blend user query embedding + doctrine embedding
2. Query Vectorize for topK × 3 results
3. **Apply weights** to all results
4. Calculate average weighted_score
5. If avg_score > threshold → doctrine detected

**Thresholds:**
- Unjust enrichment: 0.57
- Partnership: 0.54
- Adverse possession: 0.50
- Prescription: 0.50

### Context Enhancement
1. Detect patterns (unauthorized, profit, lease, time)
2. Add context modifiers to query embedding
3. Query Vectorize for topK × 2 results
4. **Apply weights**
5. Return weighted results

---

## Testing Plan

### Phase 1: Existing Corpus (1,000 Supreme Court decisions)
**Status:** Ready to test

**Validation:**
1. Run test suite SI-01 through SI-05, MI-01 through MI-03
2. Verify Supreme Court decisions still dominate results
3. Check that statutes (weight 1.0) aren't overwhelmed by Supreme Court decisions (weight 6.2)
4. Monitor doctrine detection thresholds

**Expected behavior:**
- Supreme Court decisions should appear in top 10 when highly relevant
- Statutes should appear first for direct statutory queries
- Older Supreme Court decisions (2010) should still outrank recent district court (if we had any)

### Phase 2: Test Batch (200 lower court decisions)
**Mix:**
- 50 Regional Court 2020-2025
- 50 Regional Court 2015-2019
- 50 District Court 2020-2025
- 50 District Court 2015-2019

**Validation:**
1. Run same test suite
2. Check if recent Regional decisions appear in top 10 for their doctrines
3. Verify District Court decisions don't pollute with noise
4. Check Supreme:Regional:District ranking ratios

### Phase 3: Pilot Batch (2,000 decisions)
**Validation:**
- Full test suite
- Performance monitoring (response time <3s)
- Doctrine cluster quality
- False positive rate

### Phase 4: Full Ingestion (50,000 decisions)
**Monitor:**
- Query performance
- Relevance quality
- User feedback

---

## Alternative Configuration (Option B - Aggressive)

If Phase 1 testing shows lower courts are still too weak:

```typescript
// Even slower recency decay
recency = Math.exp(-0.05 × yearsOld);

// Reduced court hierarchy gap
COURT_WEIGHTS = {
  'Nejvyšší soud': 4.0,    // was 5.0
  'Vrchní soud': 2.5,       // was 3.0
  'Krajský soud': 1.8,      // was 2.0
  'Okresní soud': 1.0
};
```

**Resulting weights (2020):**
- Supreme: 4.0 × 0.73 × 2.0 = **5.8**
- Regional: 1.8 × 0.73 = **1.31**
- District: 1.0 × 0.73 = **0.73**

**Ratio:** Supreme:Regional = 4.4:1

---

## Metadata Schema

### Decision Metadata
```typescript
{
  type: 'judicial',
  subtype: 'principle' | 'full_decision',
  case_id: string,
  court: string,
  date: string,           // ISO 8601
  is_binding: boolean,    // Only true for Supreme Court by default
  en_banc: boolean,       // Default false
  citation_count: number, // Default 0
  overruled: boolean,     // Default false

  weight: number,         // Calculated weight

  // From classifier
  legal_framework: 'civil' | 'trestni' | 'spravni',
  legal_area: string,
  primary_statutes: string[],

  // Text for synthesis
  text: string,           // First 5000 chars

  // System metadata
  indexed_at: string,
  embedding_model: 'text-embedding-3-large'
}
```

### Statute Metadata
```typescript
{
  type: 'statute',
  section: string,
  chapter: string,
  version_date: string,

  weight: 1.0,           // Statutes always weight 1.0

  text: string,
  indexed_at: string,
  embedding_model: 'text-embedding-3-large'
}
```

---

## Debugging

### Check Raw vs Weighted Scores

In query logs, look for:
```
[Topology Query] Base search top 3 (weighted):
  §2991 (raw:0.612 weighted:3.77)
  §2992 (raw:0.598 weighted:3.68)
  §2728 (raw:0.587 weighted:0.59)
```

**Interpretation:**
- §2991 and §2992: High raw score, high weight → Supreme Court binding decisions
- §2728: Similar raw score, low weight → Statute (weight=1.0) or lower court decision

### Weight Distribution Analysis

After ingesting 2,000 decisions, query Vectorize and analyze:
```sql
SELECT
  metadata.court,
  AVG(metadata.weight) as avg_weight,
  MIN(metadata.weight) as min_weight,
  MAX(metadata.weight) as max_weight
FROM vectorize
WHERE metadata.type = 'judicial'
GROUP BY metadata.court
```

**Expected:**
- Supreme: avg ~4-6, max ~8 (recent + cited + en_banc)
- Regional: avg ~1-2, max ~3
- District: avg ~0.5-1, max ~1.5

---

## Key Changes Summary

### ✅ Implemented (2025-09-27)

1. **Weight application in queries**
   - All query handlers now multiply score × weight
   - Re-rank results by weighted scores
   - Fetch topK × 4 before re-ranking to ensure quality results

2. **Weight calculator parameters (Option A)**
   - Supreme Court: 10.0 → 5.0
   - High Court: 5.0 → 3.0
   - Recency decay: -0.15 → -0.08

3. **is_binding default logic**
   - Changed from `true` for all courts
   - To `true` only for Supreme Court
   - Lower courts default to `false` (no ×2.0 multiplier)

4. **Doctrine probing weight application**
   - All doctrine probe queries now apply weights
   - Context enhanced queries apply weights
   - Unauthorized context check applies weights

### ⏳ Pending

1. Test with existing corpus (1K Supreme Court decisions)
2. Ingest 200-decision test batch
3. Validate doctrine detection still works correctly
4. Monitor false positive/negative rates
5. Decide on Option A vs Option B based on results

---

## Notes

- **DO NOT change embedding model** - would require re-ingesting entire corpus
- **Statute weights remain 1.0** - they should rank by pure semantic similarity
- **Citation counts default to 0** - can be enriched later from case law database
- **Weight boost for principles** - pravni_veta chunks get ×1.2 multiplier

---

## References

- Ingestion plan: `INGESTION_PLAN_50K.md`
- Weight calculator: `worker/src/weights/calculator.ts`
- Query topology: `worker/src/handlers/query-topology.ts`
- Decision chunker: `worker/src/chunking/decision-chunker.ts`
- Ingest handler: `worker/src/handlers/ingest-decision.ts`
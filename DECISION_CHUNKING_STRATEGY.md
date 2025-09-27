# Court Decision Chunking Strategy

## What We Learned from Civil Code

**Civil Code Success:**
- ✅ Section-level chunking (§ = 1 chunk) worked well
- ✅ Preserved legal context within each section
- ✅ Natural semantic units (~3,464 chunks)
- ✅ Good retrieval precision (Test 3: §583-584 perfect hit)

**Key Insight:** Chunk at the level of **natural legal units** that preserve context

---

## Court Decision Structure (NS1, NS2, NS3)

**All 3 decisions follow this structure:**

```
┌─────────────────────────────────────┐
│ 1. HEADER                           │
│    - Court name (Nejvyšší soud)    │
│    - Date, case number, ECLI        │
│    - Decision number                │
├─────────────────────────────────────┤
│ 2. PRÁVNÍ VĚTA ⭐ [MOST IMPORTANT] │
│    - The binding legal principle    │
│    - 1-3 sentences                  │
│    - This is the "law" the case     │
│      creates                        │
├─────────────────────────────────────┤
│ 3. METADATA                         │
│    - Court, date, type              │
│    - Referenced §sections           │
│    - Legal area (Insurance)         │
├─────────────────────────────────────┤
│ 4. DECISION TEXT (I-IV sections)    │
│    I.   Factual background          │
│    II.  Appeal arguments            │
│    III. Admissibility               │
│    IV.  Legal reasoning + conclusion│
└─────────────────────────────────────┘
```

**NS1**: 7 pages, §2809 (insurance fraud claims)
**NS2**: 9 pages, §2758 (insurance contract form)
**NS3**: 7 pages, §168/1999 Sb. (leaving accident scene)

---

## Chunking Options Analysis

### Option 1: Whole Decision = 1 Chunk ❌
```
1 chunk per case = 3 chunks total
```

**Pros:**
- Complete context preserved
- Simple implementation

**Cons:**
- ❌ Too large (7-9 pages = 3,000-4,000 tokens)
- ❌ Dilutes semantic signal
- ❌ Právní věta buried in large text
- ❌ Different parts have different purposes

**Verdict:** Too coarse, like chunking entire Civil Code

---

### Option 2: By Section (I, II, III, IV) ⚠️
```
~4-6 chunks per case = 12-18 chunks total
```

**Pros:**
- Natural divisions
- Moderate granularity

**Cons:**
- ⚠️ Sections have different purposes (facts vs reasoning)
- ⚠️ Právní věta might get grouped with metadata
- ⚠️ Reasoning in section IV is most important but mixed

**Verdict:** Better, but doesn't prioritize the key principle

---

### Option 3: Právní Věta + Key Reasoning Paragraphs ✅
```
Chunk 1: Právní věta (the binding principle)
Chunk 2: Case metadata + facts
Chunk 3-N: Major reasoning blocks from section IV
```

**Example for NS1:**
- Chunk 1: "§2809 o.z. nebrání smluvním stranám pojistné smlouvy sjednat si možnost odmítnutí pojistného plnění..."
- Chunk 2: Facts (parties, insurance claim, what happened)
- Chunk 3: Reasoning about §2809 dispositive nature
- Chunk 4: Reasoning about contractual freedom
- Chunk 5: Conclusion

**Pros:**
- ✅ Právní věta as separate, high-weight chunk
- ✅ Reasoning divided into semantic units
- ✅ Similar to section-level chunking that worked for Civil Code
- ✅ Each chunk has coherent purpose

**Cons:**
- ⚠️ More chunks per case (5-8)
- ⚠️ Requires parsing logic to identify reasoning blocks

**Verdict:** Best semantic granularity

---

### Option 4: Právní Věta + Full Text (2 chunks) ✅✅
```
Chunk 1: Právní věta ONLY (high weight)
Chunk 2: Full decision text (normal weight)
```

**Example for NS1:**
- **Chunk 1** (weight: 10.0): "Ustanovení § 2809 o. z. nebrání smluvním stranám pojistné smlouvy sjednat si možnost odmítnutí pojistného plnění pro případ, že se oprávněná osoba bude domáhat pojistného plnění uvedením vědomě nepravdivých údajů o vzniku a okolnostech tvrzené pojistné události."
- **Chunk 2** (weight: 8.5): [Full 7-page decision text]

**Pros:**
- ✅ Právní věta highly findable (separate chunk with high weight)
- ✅ Full context available in second chunk
- ✅ Simple implementation
- ✅ Only 6 chunks total (3 cases × 2)
- ✅ The principle is what has precedential value
- ✅ Matches how lawyers think ("What's the holding?")

**Cons:**
- ⚠️ Some redundancy (právní věta appears twice)
- ⚠️ Full text chunk is large

**Verdict:** BEST BALANCE - maximizes findability of key principle while preserving full context

---

## Recommended Strategy: Option 4

### Why Option 4?

**Legal Reasoning:**
1. **Právní věta = The Law**: This is what has binding precedential value
2. **Lawyers search for holdings first**: "What did the Supreme Court say about §2809?"
3. **The principle should rank highest**: When someone asks about insurance fraud, the právní věta from NS1 should appear at top
4. **Full context needed for edge cases**: Sometimes you need to read the full reasoning

**Technical Reasoning:**
1. **Semantic clarity**: Právní věta is pure legal principle, not mixed with facts
2. **Weight differentiation**: Can assign higher weight to právní věta chunk
3. **Simple implementation**: Just 2 chunks per case
4. **Manageable size**: 6 chunks total (vs 3,464 for Civil Code)

### Implementation

```typescript
interface DecisionChunks {
  principle: {
    id: `decision_${case_id}_principle`,
    text: právní_věta,
    metadata: {
      type: 'judicial',
      subtype: 'principle',
      case_id: '32 Cdo 3172/2020',
      court: 'Nejvyšší soud',
      date: '2021-03-02',
      weight: calculateWeight(metadata) * 1.2,  // 20% boost for principle
      sections_referenced: ['§2809'],
      legal_area: 'Insurance'
    }
  },
  full_text: {
    id: `decision_${case_id}_full`,
    text: full_decision_text,
    metadata: {
      type: 'judicial',
      subtype: 'full_decision',
      case_id: '32 Cdo 3172/2020',
      court: 'Nejvyšší soud',
      date: '2021-03-02',
      weight: calculateWeight(metadata),
      sections_referenced: ['§2809'],
      legal_area: 'Insurance'
    }
  }
}
```

### Weight Calculation for These 3 Cases

**NS1 (2021, §2809 insurance fraud):**
- Court: Nejvyšší soud = 10.0×
- Date: 2021 (4 years old) = 0.54× decay
- Citations: Unknown (assume 3) = 1.24×
- Binding: Yes (Supreme Court) = 2.0×
- **Weight**: 10.0 × 0.54 × 1.24 × 2.0 = **13.4**
- **Principle chunk**: 13.4 × 1.2 = **16.1**

**NS2 (2022, §2758 insurance form):**
- Court: Nejvyšší soud = 10.0×
- Date: 2022 (3 years old) = 0.64× decay
- **Weight**: ~**15.9**
- **Principle chunk**: **19.1**

**NS3 (2024, §168/1999 leaving accident):**
- Court: Nejvyšší soud = 10.0×
- Date: 2024 (1 year old) = 0.86× decay
- **Weight**: ~**21.3**
- **Principle chunk**: **25.6** (very fresh case!)

Compare to statutes: weight = 1.0

**These decisions will dominate queries!** This is the "topology warping" effect.

---

## Expected Query Results

### Example 1: Insurance Fraud Query

**Query:** "Can insurance company refuse payment if I lie about how accident happened?"

**Expected results (by weight × similarity):**

1. **NS1 Principle** (weight: 16.1, similarity: 0.75) = **score: 12.1**
   - "§2809 o.z. nebrání smluvním stranám sjednat si možnost odmítnutí pojistného plnění..."

2. **§2809** (weight: 1.0, similarity: 0.80) = **score: 0.8**
   - Statute text about refusing insurance payment

3. **NS1 Full** (weight: 13.4, similarity: 0.65) = **score: 8.7**
   - Full reasoning about §2809

**Effect:** The Supreme Court's interpretation (NS1 principle) appears FIRST, even though the statute has higher semantic similarity. This is the topology being "warped" by judicial weight.

### Example 2: Insurance Contract Form

**Query:** "What happens if insurance contract is not in writing?"

1. **NS2 Principle** (weight: 19.1, similarity: 0.70) = **score: 13.4**
2. **§2758** (weight: 1.0, similarity: 0.85) = **score: 0.85**
3. **NS2 Full** (weight: 15.9, similarity: 0.60) = **score: 9.5**

---

## Alternative: Option 3 (If we want more granularity)

If testing shows Option 4's full-text chunks are too large, we can switch to Option 3:

**Chunking by reasoning blocks:**
1. Právní věta (principle)
2. Facts (section I)
3. Main reasoning (section IV, split by paragraph themes)
4. Conclusion

This gives 5-8 chunks per case (15-24 total) with finer semantic granularity.

---

## Implementation Steps

1. **Extract text** from 3 PDFs (already working with PyPDF2)

2. **Parse structure:**
   - Extract právní věta (appears after "Právní věta:" header)
   - Extract full text
   - Extract metadata (case_id, date, court, referenced §sections)

3. **Calculate weights:**
   - Use existing weight calculator
   - All 3 are Nejvyšší soud = 10.0× base
   - Apply temporal decay
   - Apply 1.2× boost to principle chunks

4. **Create chunks:**
   - 2 chunks per case = 6 chunks total
   - Each with appropriate metadata

5. **Add to queue:**
   - Same queue system as Civil Code
   - Will be processed automatically

6. **Test queries:**
   - Before: Query insurance fraud → only §2809
   - After: Query insurance fraud → NS1 principle + §2809
   - **Measure topology warping!**

---

## Expected Impact

**Before adding decisions:**
```
Query: "insurance fraud false claim"
Results: §2809 (weight: 1.0)
Analysis: "Contract parties may agree on specific terms..."
```

**After adding decisions:**
```
Query: "insurance fraud false claim"
Results:
  1. NS1 Principle (weight: 16.1) ⭐
  2. §2809 (weight: 1.0)
  3. NS1 Full (weight: 13.4)

Analysis: "The Supreme Court held that §2809 does not prevent
parties from contractually agreeing to refuse payment for false
claims. This means insurers CAN include fraud penalties in
contracts beyond what the statute explicitly states."
```

**Topology Effect:** The judicial interpretation now dominates, showing how courts have "bent" the meaning of §2809 from what a plain reading might suggest.

---

## Conclusion

**Recommended: Option 4 (Právní věta + Full text)**

**Rationale:**
- Maximizes findability of binding principles
- Preserves full context for detailed analysis
- Simple implementation (6 chunks total)
- Demonstrates topology warping clearly
- Matches how lawyers actually use case law

**Next step:** Implement decision chunker following this strategy and test with real queries to validate the topology effect.
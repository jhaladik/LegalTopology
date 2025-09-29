# Deep Flow Analysis: Where We Use What and Why Synthesis Fails

## Current Architecture - Step by Step

### 🎯 Phase 1: TENSION EXTRACTION (Excellent ✅)
**Location:** `query-decomposer-v2.ts`
**Model:** GPT-4o-mini
**Cost:** ~$0.001
**Time:** ~5 seconds

```javascript
// WHAT HAPPENS:
Input: "Soused 30 let chodí přes pozemek..."
         ↓
[GPT-4o-mini with sophisticated prompt]
         ↓
Output: {
  tensions: ["formal_vs_factual", "time_creates_rights"],
  doctrines: ["vydržení", "vlastnické_právo"],
  absurdity_test: "Bez vydržení by 30 let bylo irelevantní"
}
```

**Why This Works Well:**
- Prompt is sophisticated and Czech-specific
- GPT-4o-mini is perfect for structured extraction
- Output is clean JSON with clear reasoning
- Absurdity test is brilliant validation

### 🔄 Phase 2: VECTORIZATION (Excellent ✅)
**Location:** `tension-vectorizer.ts`
**Model:** OpenAI text-embedding-3-large
**Cost:** ~$0.002
**Time:** ~2 seconds

```javascript
// VECTOR ARITHMETIC MAGIC:
For tension "formal_vs_factual":
  1. BASE = embed("formální vlastnictví faktické užívání")
  2. ADD = embed("faktický stav") + embed("dlouhodobé užívání") + ...
  3. SUBTRACT = embed("formální náležitosti") + embed("zápis v katastru") + ...
  4. RESULT = normalize(BASE + 0.3*ADD - 0.2*SUBTRACT) * 0.95

// MULTIPLE SEARCH STRATEGIES:
- Tension vectors (50% weight)
- Doctrine vectors (30% weight each)
- Keyword fallback (20% weight)
```

**Why This Works Well:**
- Vector arithmetic is innovative and correct
- Multiple parallel searches increase recall
- Weight balancing is sensible
- Source tracking helps understand results

### 🔍 Phase 3: VECTOR SEARCH (Good ✅)
**Location:** Cloudflare Vectorize
**Index:** czech-legal-topology
**Time:** ~10 seconds

```javascript
// WHAT WE SEARCH:
Vectorize.query(tension_vector_1, topK=20)  // Parallel
Vectorize.query(tension_vector_2, topK=20)  // Parallel
Vectorize.query(doctrine_vector_1, topK=10) // Parallel
Vectorize.query(doctrine_vector_2, topK=10) // Parallel
Vectorize.query(keyword_vector, topK=10)    // Parallel

// WHAT COMES BACK:
{
  matches: [
    {
      id: "statute_1095",
      score: 0.59,
      metadata: {
        type: "statute",
        section: "1095",
        text: "Vydržení práva odpovídajícího věcnému břemenu...",
        weight: 1.0
      }
    },
    {
      id: "case_22_Cdo_2570_98",
      score: 0.53,
      metadata: {
        type: "judicial",
        case_id: "22 Cdo 2570/98",
        court: "Nejvyšší soud",
        text: "[FULL TEXT - often 5000+ chars]",
        weight: 2.64,
        sections_referenced: ["1089", "1090"],
        pravni_veta: "[legal principle]"
      }
    }
  ]
}
```

**Current Problems:**
- ❌ **Score combination is naive** - just weighted average
- ❌ **No semantic deduplication** - same concept from multiple sources
- ❌ **Lost context** - we know WHY we searched (tension) but don't use it

### 📝 Phase 4: SYNTHESIS (Poor ❌)
**Location:** `synthesize-multi-v2.ts`
**Model:** GPT-4o
**Cost:** ~$0.15
**Time:** ~60 seconds

## THE CORE PROBLEM

### What We Send to GPT-4o:

```markdown
TOPOLOGICKÁ ANALÝZA:
Napětí: formal_vs_factual (95%)
[... more tensions ...]

RELEVANTNÍ PRÁVNÍ ÚPRAVA:
§1095: Vydržení práva... [200 chars truncated]
§1096: Držba... [200 chars truncated]
[... 8 more statutes ...]

JUDIKATURA:
22 Cdo 2570/98: [300 chars truncated]
5 C 161/2023: [300 chars truncated]
[... 3 more cases ...]

Poskytni analýzu skrze napětí...
```

### The Critical Issues:

1. **📚 CONTEXT TRUNCATION**
   - Statutes: Only 200 chars (losing critical details)
   - Cases: Only 300 chars (losing legal reasoning)
   - Original full text in vector DB: 1000-5000 chars

2. **🔗 LOST CONNECTIONS**
   - We know §1095 was found via "vydržení" doctrine
   - We know it relates to "formal_vs_factual" tension
   - But we don't tell GPT-4o these connections!

3. **🎯 NO RELEVANCE EXPLANATION**
   - GPT-4o doesn't know WHY each statute/case was selected
   - It has to guess the relevance from truncated text

4. **💭 GENERIC ANALYSIS**
   - The output reads like a law school essay
   - Not specific to the actual statutes/cases found
   - Could be written without the search results

## WHY SYNTHESIS FAILS - Detailed

### Example of Information Loss:

**What's in Vectorize:**
```json
{
  "case_id": "22 Cdo 2570/98",
  "text": "Nejvyšší soud rozhodl, že pro vydržení práva odpovídajícího věcnému břemenu je třeba, aby držitel vykonával právo po celou vydržecí dobu v dobré víře, pokojně, nepřerušeně a aby šlo o držbu kvalifikovanou. Pouhé strpění průchodu sousedem bez aktivního bránění není dostačující pro vznik práva cesty vydržením. Je nutné, aby držba byla vykonávána jako právo, nikoliv z pouhé shovívavosti vlastníka pozemku...",
  "pravni_veta": "Pro vydržení služebnosti cesty nestačí pouhá tolerance vlastníka",
  "sections_referenced": ["1089", "1090", "1095"]
}
```

**What GPT-4o receives:**
```
22 Cdo 2570/98: Nejvyšší soud rozhodl, že pro vydržení práva odpovídajícího věcnému břemenu je třeba, aby držitel vykonával právo po celou vydržecí dobu v dobré víře, pokojně, nepřeruš...
```

**Lost Information:**
- The crucial principle about "pouhé strpění" (mere tolerance)
- The distinction between right and permission
- The legal principle (pravni_veta)
- Which sections this case interprets

## SOLUTION PROPOSALS

### Solution 1: Better Context Packaging
```javascript
// Instead of truncating, send structured context:
const caseContext = {
  case_id: "22 Cdo 2570/98",
  relevance_to_tension: "formal_vs_factual",
  found_via: ["vydržení doctrine", "tension vector"],
  score: 0.53,
  weight: 2.64,
  legal_principle: "Pro vydržení služebnosti nestačí pouhá tolerance",
  key_holding: "Musí být vykonáváno jako právo, ne ze shovívavosti",
  sections_interpreted: ["1089", "1090", "1095"],
  full_text_sample: "[first 500 chars of reasoning]"
}
```

### Solution 2: Two-Stage Synthesis
```javascript
// STAGE 1: Focused extraction per document
for each relevant_document:
  prompt = `This document was found because it relates to tension: ${tension}
            Extract the specific holding that resolves this tension:`
  extraction = GPT-4o-mini(document.full_text, prompt)

// STAGE 2: Synthesis with extractions
synthesis_prompt = `Based on these specific holdings:
  - For tension "formal_vs_factual": [extracted holdings]
  - For tension "time_creates_rights": [extracted holdings]
  Synthesize strategic analysis...`
```

### Solution 3: Tension-Specific Retrieval
```javascript
// Don't just search and combine - search WITH PURPOSE
for each tension:
  // Get documents specifically for THIS tension
  results = searchForTensionResolution(tension)

  // Extract tension-specific insights
  insights = extractTensionInsights(results, tension)

  // Build tension-specific analysis
  analysis[tension] = synthesizeTensionAnalysis(insights)
```

### Solution 4: Preserve Legal Reasoning Chain
```javascript
const reasoningChain = {
  step1_tension: "formal_vs_factual",
  step2_doctrine: "vydržení",
  step3_statutes: ["§1089 - defines vydržení", "§1095 - special rules for easements"],
  step4_cases: ["22 Cdo - requires active exercise, not tolerance"],
  step5_application: "Here, 30 years of use likely qualifies as active exercise",
  step6_conclusion: "Vydržení likely established, owner cannot fence"
}
```

## RECOMMENDED IMPLEMENTATION

### Priority 1: Fix Synthesis Context (Quick Win)
```javascript
// In synthesize-multi-v2.ts, change:
const statuteContext = statutes.map(s =>
  `${s.section}: ${s.text.substring(0, 1000)}  // Increase from 200
   [Found via: ${s.sources.join(', ')}]
   [Relates to tension: ${getTensionRelevance(s, tensions)}]`
)

const caseContext = cases.map(c =>
  `${c.case_id}:
   Legal Principle: ${c.pravni_veta || 'N/A'}
   Key Holding: ${c.text.substring(0, 1000)}  // Increase from 300
   Interprets: §§${c.sections_referenced.join(', ')}
   [Weight: ${c.weight}, Relevance: ${c.relevance}]
   [Resolves tension: ${getTensionRelevance(c, tensions)}]`
)
```

### Priority 2: Selective Deep Dive
```javascript
// For top 3 most relevant documents, include MORE context
const topStatutes = statutes.slice(0, 3).map(s => ({
  ...s,
  full_analysis: extractStatuteInsights(s.full_text, tensions)
}))

const topCases = cases.slice(0, 3).map(c => ({
  ...c,
  full_analysis: extractCaseHolding(c.full_text, tensions)
}))
```

### Priority 3: Feedback Loop
```javascript
// Track which sources actually contributed to final analysis
const synthesisMetrics = {
  statutes_cited_in_analysis: [],
  cases_cited_in_analysis: [],
  tensions_resolved: [],
  unused_search_results: []
}
// Use this to improve search strategy
```

## CONCLUSION

The system's first 3 phases are excellent:
1. ✅ Tension extraction - sophisticated and accurate
2. ✅ Vectorization - innovative vector arithmetic
3. ✅ Search - multi-strategy with good recall

But Phase 4 (Synthesis) fails because:
- ❌ Truncates critical legal reasoning
- ❌ Loses connection between documents and tensions
- ❌ Doesn't explain WHY documents are relevant
- ❌ Generic analysis instead of specific application

**The fix:** Don't truncate context, preserve reasoning chains, and make synthesis tension-specific rather than generic.
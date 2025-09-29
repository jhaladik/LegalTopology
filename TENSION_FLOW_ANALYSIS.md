# Tension-Based Legal Topology: Complete Flow Analysis

## Overview
This document explains exactly how the tension-based system transforms a legal question into vector searches and then synthesizes the results.

## Flow Diagram
```
User Question
    ↓
[1. TOPOLOGICAL ANALYSIS]
    ↓
Legal Tensions + Doctrines
    ↓
[2. VECTOR STRATEGIES]
    ↓
Composite Vectors
    ↓
[3. HYBRID SEARCH]
    ↓
Ranked Results
    ↓
[4. SYNTHESIS]
    ↓
Strategic Analysis
```

## Detailed Flow

### Step 1: Topological Analysis (query-decomposer-v2.ts)

**Input:** User question
```
"Soused už 30 let chodí přes můj pozemek ke své chatě..."
```

**GPT-4o-mini Process:**
- Identifies legal tensions (not keywords!)
- Evaluates temporal factors
- Suggests competing doctrines
- Performs absurdity test

**Output:**
```json
{
  "legal_tensions": [
    {
      "tension_type": "formal_vs_factual",
      "competing_values": ["formální vlastnictví", "faktické užívání"],
      "strength": 0.95,
      "reasoning": "Konflikt mezi formálním vlastnictvím a 30 lety užívání"
    },
    {
      "tension_type": "time_creates_rights",
      "competing_values": ["časové právo", "právo vlastnické"],
      "strength": 0.95,
      "reasoning": "30 let vytváří legitimní očekávání"
    }
  ],
  "competing_doctrines": [
    {
      "doctrine": "vydržení",
      "weight": 0.9,
      "resolves_tensions": ["formal_vs_factual", "time_creates_rights"]
    },
    {
      "doctrine": "vlastnické právo",
      "weight": 0.3,
      "resolves_tensions": ["formal_vs_factual"]
    }
  ],
  "absurdity_test": {
    "without_primary_doctrine": "Bez vydržení by 30 let bylo irelevantní",
    "confirms_doctrine": "vydržení"
  }
}
```

### Step 2: Vector Strategy Creation (tension-vectorizer.ts)

**For each tension, create vector operations:**

#### Tension 1: formal_vs_factual (strength: 0.95)
```javascript
BASE_VECTOR = embed("formální vlastnictví faktické užívání")
ADD_VECTORS = [
  embed("faktický stav"),
  embed("dlouhodobé užívání"),
  embed("dobrá víra"),
  embed("legitimní očekávání")
]
SUBTRACT_VECTORS = [
  embed("formální náležitosti"),
  embed("zápis v katastru"),
  embed("písemná forma")
]

TENSION_VECTOR_1 = normalize(
  BASE + (0.3 * sum(ADD)) - (0.2 * sum(SUBTRACT))
) * 0.95
```

#### Tension 2: time_creates_rights (strength: 0.95)
```javascript
BASE_VECTOR = embed("časové právo právo vlastnické")
ADD_VECTORS = [
  embed("vydržení"),
  embed("promlčení"),
  embed("legitimní očekávání"),
  embed("dobromyslná držba")
]
SUBTRACT_VECTORS = [
  embed("okamžitost"),
  embed("novost"),
  embed("přerušení")
]

TENSION_VECTOR_2 = normalize(
  BASE + (0.3 * sum(ADD)) - (0.2 * sum(SUBTRACT))
) * 0.95
```

#### Doctrine Vectors:
```javascript
DOCTRINE_VECTOR_1 = embed("vydržení dobromyslná držba legitimní očekávání...") * 0.9
DOCTRINE_VECTOR_2 = embed("vlastnické právo vlastnictví vlastník...") * 0.3
```

#### Final Composite:
```javascript
FINAL_SEARCH_VECTOR = combineWeightedVectors([
  { vector: TENSION_VECTOR_1, weight: 0.5 },
  { vector: TENSION_VECTOR_2, weight: 0.5 },
  { vector: DOCTRINE_VECTOR_1, weight: 0.9 },
  { vector: DOCTRINE_VECTOR_2, weight: 0.3 },
  { vector: KEYWORD_FALLBACK, weight: 0.2 }
])
```

### Step 3: Hybrid Vector Search

**Multiple parallel searches:**

1. **Tension-based search** (50% weight)
   - Uses composite tension vectors
   - Finds documents that resonate with the identified tensions

2. **Doctrine searches** (30% weight each)
   - vydržení vector → finds §1089-1098, relevant cases
   - vlastnické právo vector → finds §976-1044, property cases

3. **Keyword fallback** (20% weight)
   - Traditional keyword search as safety net

**Result Combination:**
```javascript
for each result:
  final_score = (tension_score * 0.5) +
                (doctrine_score * 0.3) +
                (keyword_score * 0.2)
  track source: ["tension", "doctrine", "keyword"]
```

### Step 4: Results Processing

**What comes back from vector search:**

```json
{
  "statutes": [
    {
      "id": "§1095",
      "text": "Vydržení práva odpovídajícího věcnému břemenu...",
      "score": 0.59,
      "sources": ["tension", "doctrine"],
      "metadata": { "type": "statute", "section": "1095" }
    }
  ],
  "cases": [
    {
      "case_id": "22 Cdo 2570/98",
      "court": "Nejvyšší soud",
      "score": 0.53,
      "sources": ["tension", "doctrine"],
      "weight": 2.64  // Higher weight for Supreme Court
    }
  ]
}
```

### Step 5: Final Synthesis

**What GPT-4o receives:**

```markdown
TOPOLOGICKÁ ANALÝZA:
Napětí: formální vlastnictví vs. faktické užívání (95%)
Napětí: časové právo vs. právo vlastnické (95%)

KONKURUJÍCÍ DOKTRÍNY:
- vydržení (90%): Řeší obě napětí
- vlastnické právo (30%): Ignoruje čas

RELEVANTNÍ PRÁVNÍ ÚPRAVA:
§1095: Vydržení práva odpovídajícího věcnému břemenu
[Podporuje doktrínu: vydržení]

JUDIKATURA:
22 Cdo 2570/98: [Text rozhodnutí]
[Doktrína: vydržení]

ABSURDITY TEST:
Bez vydržení by 30 let bylo irelevantní
→ Potvrzuje doktrínu: vydržení

Poskytni analýzu skrze napětí...
```

**GPT-4o Output Structure:**
1. **Per Tension Analysis**
   - Conflict of values
   - Harmonizing doctrine
   - Why it works (absurdity test)
   - Strategic recommendations

2. **Cross-Tension Synthesis**
   - Primary topology
   - Integrated strategy
   - Economic analysis

## Key Insights

### What Makes This Different

**Old System (Keyword-based):**
```
"30 let cesta" → search → find §1089 → apply mechanically
```

**New System (Tension-based):**
```
"30 let cesta" → identify tensions →
  formal_vs_factual + time_creates_rights →
  vector arithmetic (add legitimacy, subtract formality) →
  find harmonizing doctrine (vydržení) →
  strategic synthesis through tensions
```

### Vector Mathematics

The key innovation is **vector arithmetic**:
- **ADD** concepts that align with the tension resolution
- **SUBTRACT** concepts that oppose it
- **WEIGHT** by tension strength and doctrine relevance

This creates search vectors that "think" like lawyers - seeking documents that resolve tensions, not just match keywords.

### Source Tracking

Every result tracks its source:
- **tension**: Found via tension vectors
- **doctrine**: Found via doctrine probes
- **keyword**: Found via fallback search

This helps understand why certain documents were found and builds trust in the system.

## Performance Metrics

From our test:
- **Total processing time**: 77.5 seconds
- **Topological analysis**: ~5 seconds
- **Vector creation**: ~2 seconds
- **Vector searches**: ~10 seconds (parallel)
- **LLM synthesis**: ~60 seconds

## Conclusion

The tension-based system fundamentally changes how legal search works:

1. **Identifies WHY** (tensions) not just WHAT (keywords)
2. **Searches for resolution** not just similarity
3. **Synthesizes strategically** not mechanically
4. **Tracks provenance** for transparency

This creates a system that truly understands legal reasoning, not just pattern matching.
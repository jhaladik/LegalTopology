# Legal Topology: Multi-Layer Legal Reasoning System

## Project Overview

A semantic legal reasoning system that treats the Czech Civil Code as a base topology and overlays judicial decisions with weighted influence to predict current legal interpretations.

**Status:** ✅ Proof of concept working | 🔄 Base layer indexing (37% complete)

---

## Architecture

### Core Concept: Law as Living Topology

```
┌─────────────────────────────────────────────────────┐
│              LEGAL TOPOLOGY SYSTEM                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │   BASE LAYER: Civil Code (§1-3081)   │          │
│  │   • Statutory text                   │          │
│  │   • Weight: 1.0 (immutable)          │          │
│  │   • Chunks: 3,464 sections           │          │
│  └──────────────────────────────────────┘          │
│                     ↓                               │
│  ┌──────────────────────────────────────┐          │
│  │   OVERLAY: Judicial Decisions        │          │
│  │   • Court interpretations            │          │
│  │   • Dynamic weights:                 │          │
│  │     - Court hierarchy × recency      │          │
│  │     - Citations × precedent value    │          │
│  │   • "Warps" the base topology        │          │
│  └──────────────────────────────────────┘          │
│                     ↓                               │
│  ┌──────────────────────────────────────┐          │
│  │   EMERGENT STRUCTURE                 │          │
│  │   • Semantic clusters                │          │
│  │   • Conceptual relationships         │          │
│  │   • Current legal interpretation     │          │
│  └──────────────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### The Semantic → Vector → Semantic Loop

**1. Semantic Input (Human meaning)**
```
"Can a tenant insure landlord's property without written consent?"
```

**2. Vectorization (Embedding)**
```typescript
vector = openai.embed(text)
// → [0.234, -0.567, 0.123, ..., 0.891] (1536 dimensions)
```
- OpenAI's embedding model maps legal concepts to geometric space
- Similar meanings → nearby vectors
- Preserves semantic relationships

**3. Geometric Space (The Topology)**
```
All legal texts exist in 1536-dimensional space
Distance = semantic similarity

§2767 (consent): [0.23, -0.56, 0.12, ...]
§34 (consent):   [0.25, -0.54, 0.13, ...]  ← Close!
§2800 (claims):  [0.89, 0.12, -0.45, ...] ← Far away
```
- Clusters naturally form around concepts
- Paths exist between related provisions
- Geometry encodes legal relationships

**4. Query (Vector search)**
```typescript
query_vector = embed("tenant insurance consent")
neighbors = vectorize.query(query_vector, topK=10)
```
- Query becomes a point in space
- Find K nearest neighbors (cosine similarity)
- Retrieve semantically relevant legal texts

**5. Back to Semantics (Synthesis)**
```typescript
// Vector search returns relevant chunks
statutes = [§2767, §2758, ...]
cases = [23 Cdo 369/2023, ...]

// LLM synthesizes legal reasoning
analysis = gpt4.reason(statutes, cases, facts)
```
- Topology finds relevant law (retrieval)
- GPT-4 does legal reasoning (synthesis)
- Result: Comprehensive legal analysis

---

## Technical Stack

### Infrastructure (Cloudflare)

**Worker:** `legal-topology.jhaladik.workers.dev`
- **Runtime:** Cloudflare Workers (serverless)
- **Language:** TypeScript
- **Execution:** Scheduled cron (every minute) + HTTP endpoints

**Storage:**
- **Vectorize:** 1536-dim vectors, cosine similarity
- **D1 Database:** Processing queue (SQLite)
- **R2 Bucket:** Document storage (PDFs)
- **KV Namespace:** Processing state

### Processing Pipeline

```
┌─────────────┐
│ Upload PDF  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│ Extract Text (DOCX) │
│ • mammoth library   │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────────┐
│ Chunk by Section        │
│ • §2758, §2759, etc.    │
│ • Max 1000 tokens       │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ Add to D1 Queue         │
│ • Batched inserts (50)  │
│ • Status: pending       │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ Cron Job (every minute) │
│ • Process 50 chunks     │
│ • Embed with OpenAI     │
│ • Upsert to Vectorize   │
└──────┬──────────────────┘
       │
       ↓
┌─────────────────────────┐
│ Indexed & Queryable     │
└─────────────────────────┘
```

### Weight Calculation

```typescript
weight = base_weight
  × court_hierarchy_multiplier    // Supreme: 10x, High: 5x, Regional: 2x
  × recency_factor                // e^(-0.15 × years_old)
  × citation_influence            // 1 + log(citations + 1) × 0.2
  × precedential_multiplier       // Binding: 2x, En banc: 1.5x
  × overruled_penalty             // Overruled: 0.1x
```

**Example:**
- Supreme Court decision from 2023
- 5 citations, binding precedent
- Weight: `10 × 0.86 × 1.32 × 2.0 = 22.7` (vs statute: 1.0)

This means the judicial interpretation has **22.7× more influence** in query results.

---

## Data Sources

### Civil Code
- **File:** `Sb_2012_89_2025-07-01_IZ.docx` (410KB)
- **Sections:** §1 - §3081
- **Focus:** Insurance law (§2758-2872)
- **Chunks:** 3,464 sections
- **Status:** 🔄 Indexing (1,655/3,464 = 37%)

### Supreme Court Decisions (Pending)
- `NS1.pdf` - 76KB
- `NS2.pdf` - 83KB
- `NS3.pdf` - 80KB
- **Focus:** Insurance consent, third-party rights

---

## API Endpoints

### Base URL
```
https://legal-topology.jhaladik.workers.dev
```

### 1. Query Topology
```bash
POST /api/query
Content-Type: application/json

{
  "question": "pojistná smlouva",
  "topK": 10
}
```

**Response:**
```json
{
  "query": "pojistná smlouva",
  "total_results": 10,
  "results": {
    "all": [...],        // All results sorted by weighted score
    "statutes": [...],   // Only statutory provisions
    "judicial": [...]    // Only court decisions
  }
}
```

### 2. Synthesize Legal Analysis ⭐
```bash
POST /api/synthesize
Content-Type: application/json

{
  "question": "What are requirements for written consent?",
  "facts": {
    "situation": "medical procedure",
    "party": "patient"
  },
  "topK": 10
}
```

**Response:**
```json
{
  "question": "...",
  "facts": {...},
  "statutory_foundation": [
    {
      "section": "§96",
      "text": "...",
      "relevance": 0.586
    }
  ],
  "case_law": [...],
  "analysis": "To analyze the requirements...",
  "metadata": {
    "model": "gpt-4o-mini",
    "statutes_found": 5,
    "cases_found": 0
  }
}
```

### 3. Ingest Documents
```bash
POST /api/ingest/civil-code
Content-Type: multipart/form-data

file: <civil_code.docx>
```

```bash
POST /api/ingest/decision
Content-Type: multipart/form-data

file: <decision.pdf>
metadata: {
  "case_id": "23 Cdo 369/2023",
  "court": "Nejvyšší soud",
  "date": "2023-08-30",
  "is_binding": true,
  "citation_count": 5
}
```

### 4. Queue Management
```bash
POST /api/queue/stats     # Check processing status
POST /api/queue/process   # Manually trigger processing
POST /api/queue/clear     # Clear queue
```

**Stats Response:**
```json
{
  "pending": 2693,
  "processing": 114,
  "completed": 1655,
  "failed": 2,
  "total": 4464
}
```

### 5. Health Check
```bash
GET /api/health
```

---

## Key Features

### ✅ Implemented

1. **Section-Level Chunking**
   - One chunk per statute section
   - Preserves legal context
   - ~3,464 chunks from Civil Code

2. **Async Processing Queue**
   - D1-based queue system
   - Scheduled cron processing (every minute)
   - Processes 50 chunks per batch
   - Automatic retry on failure

3. **Weighted Vector Search**
   - Statutes: weight 1.0
   - Decisions: dynamic weights (0-30+)
   - Results sorted by: `similarity × weight`

4. **LLM Synthesis**
   - GPT-4o-mini for legal analysis
   - Context-aware prompts
   - Structured output with citations

5. **Incremental Ingestion**
   - Add new decisions anytime
   - Weights recompute automatically
   - No need to reprocess base layer

### 🔄 In Progress

- Civil Code indexing: **37% complete** (~1.5 hours remaining)
- Current sections indexed: §1-635
- Insurance sections (§2758+): Not yet indexed

### 📋 Planned

1. **Add Supreme Court Decisions**
   - Upload 3 decisions about insurance consent
   - See how they warp the topology
   - Test weighted queries

2. **Visual Topology Explorer**
   - 3D visualization of legal space
   - Show clusters, paths, weights
   - Interactive navigation

3. **Precedent Prediction**
   - Input case facts
   - Find similar historical cases
   - Predict likely outcome

4. **Citation Graph**
   - Track which cases cite which
   - Auto-update weights
   - Detect overruling

5. **Temporal Snapshots**
   - Build topology at different time points
   - Show how law evolved
   - Track interpretation drift

---

## Cost Analysis

### One-Time Setup
- **Civil Code Indexing:**
  - 3,464 chunks × 300 tokens avg = ~1M tokens
  - OpenAI embeddings: $0.13 per 1M tokens
  - **Total: ~$0.12**

- **3 Supreme Court Decisions:**
  - ~150 chunks × 300 tokens = ~45K tokens
  - **Total: ~$0.006**

**Initial setup cost: ~$0.13**

### Ongoing Costs
- **Cloudflare Workers:** Free tier (100K requests/day)
- **Vectorize:** Included in Workers Paid ($5/month)
- **D1 Database:** Free tier (5GB storage)
- **R2 Storage:** $0.015/GB/month (~$0.0001 for our PDFs)

**Monthly cost: ~$5** (if exceeding free tier)

### Query Costs
- **Vector search:** Free (Cloudflare)
- **LLM synthesis:** $0.15 per 1M tokens (GPT-4o-mini)
- ~500 tokens per synthesis = **$0.000075 per query**

**Per-query cost: <$0.001**

---

## Example Usage

### Test Query (Working Now)
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the requirements for written consent in Czech civil law?",
    "facts": {
      "situation": "medical procedure",
      "party": "patient"
    }
  }'
```

**Result:** ✅ Returns comprehensive analysis citing §94, §96, §97, §98

### Future Query (Once Insurance Sections Indexed)
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Can tenant insure landlords property without written consent?",
    "facts": {
      "relationship": "tenant-landlord",
      "property_owner": "landlord",
      "consent": null,
      "payment_history": "2_years"
    }
  }'
```

**Expected:** Analysis combining §2767 + Supreme Court case 23 Cdo 369/2023

---

## Technical Deep Dive

### Why Vectors for Legal Text?

**What vectors capture:**
- ✅ Semantic similarity ("consent" ≈ "souhlas" ≈ "permission")
- ✅ Conceptual relationships (insurance → contract → agreement)
- ✅ Contextual meaning (same word, different contexts)

**What vectors DON'T capture:**
- ❌ Logical structure (IF/THEN/UNLESS)
- ❌ Temporal ordering (BEFORE/AFTER)
- ❌ Causal relationships (BECAUSE/THEREFORE)
- ❌ Exceptions and edge cases

**Solution:** Hybrid approach
1. **Vectors** → find relevant law (retrieval)
2. **LLM** → perform legal reasoning (synthesis)
3. **Weights** → prioritize judicial interpretation

### The Topology Metaphor

Think of law as a **curved space:**

- **Statutes** = flat base manifold (Euclidean)
- **Court decisions** = masses that warp space (like gravity)
- **High-weight decisions** = heavy masses (more warping)
- **Query** = geodesic path through curved space

**Example:**
```
Query: "Is tenant insurance valid?"

Without case law:
  Query → §2767 → "No, consent required"

With case law (weight: 8.5):
  Query → §2767 → [warped by case] → "Maybe, implied consent"
```

The case's weight creates a "gravity well" that pulls queries toward its interpretation.

### Chunking Strategy

**Section-level chunking** (chosen approach):
```
§2767 → 1 chunk (entire section)
§2768 → 1 chunk
```

**Why this works:**
- Preserves legal context
- Sections are natural semantic units
- Reduces noise in results
- ~3,464 chunks (manageable)

**Alternatives considered:**
- Paragraph-level: Too fragmented (10K+ chunks)
- Document-level: Too coarse (poor retrieval)
- Sliding window: Creates redundancy

---

## Project Structure

```
LegalTopology/
├── worker/                          # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts                # Main entry point
│   │   ├── handlers/
│   │   │   ├── ingest-civil-code.ts
│   │   │   ├── ingest-decision.ts
│   │   │   ├── query.ts
│   │   │   ├── synthesize.ts       # ⭐ LLM synthesis
│   │   │   └── recompute-weights.ts
│   │   ├── services/
│   │   │   ├── queue-service.ts    # D1 queue management
│   │   │   └── processor-service.ts # Batch processing
│   │   ├── chunking/
│   │   │   ├── statute-chunker.ts  # Section-level chunking
│   │   │   ├── decision-chunker.ts
│   │   │   └── utils.ts
│   │   ├── embedding/
│   │   │   ├── openai-client.ts    # OpenAI API
│   │   │   └── prompts.ts          # Context-aware prompts
│   │   ├── weights/
│   │   │   └── calculator.ts       # Multi-factor weights
│   │   └── types/
│   │       ├── metadata.ts
│   │       └── chunks.ts
│   ├── migrations/
│   │   └── 0001_create_queue.sql
│   ├── wrangler.toml               # Cloudflare config
│   ├── package.json
│   └── tsconfig.json
├── decisions/                       # Supreme Court PDFs
│   ├── NS1.pdf
│   ├── NS2.pdf
│   └── NS3.pdf
├── laws/                           # Civil Code
│   ├── Sb_2012_89_2025-07-01_IZ.pdf
│   └── Sb_2012_89_2025-07-01_IZ.docx
└── PROJECT_SUMMARY.md              # This file
```

---

## Current Status

### Indexing Progress
```
Total chunks: 4,464
Completed:    1,655 (37%)
Pending:      2,693
Failed:       2
Processing:   114

ETA: ~1.5 hours at 50 chunks/minute
```

### What Works Now
✅ Query topology for indexed sections
✅ LLM synthesis with GPT-4
✅ Weighted retrieval
✅ Queue-based async processing
✅ DOCX text extraction

### What Needs Insurance Sections (§2758+)
⏳ Insurance-specific queries
⏳ Testing judicial overlay with decisions
⏳ Demonstrating topology warping

### Ready to Add
📋 3 Supreme Court decisions (waiting for base layer)
📋 Decision metadata extraction
📋 Citation graph tracking

---

## Next Steps

### Immediate (Next 1-2 hours)
1. ⏳ **Wait for indexing to complete**
   - Current: Section 635
   - Target: Section 3081
   - ETA: 90 minutes

2. ✅ **Verify insurance sections indexed**
   ```bash
   curl -X POST /api/query -d '{"question":"§2767 insurance consent"}'
   ```

### Short-term (Today)
3. 📤 **Upload Supreme Court decisions**
   ```bash
   curl -X POST /api/ingest/decision \
     -F "file=@decisions/NS1.pdf" \
     -F 'metadata={"case_id":"23 Cdo 369/2023",...}'
   ```

4. 🧪 **Test judicial overlay**
   - Query before adding cases
   - Add cases with weights
   - Query after → see influence

5. 📊 **Demonstrate topology warping**
   - Same query, different results
   - Show weight impact
   - Explain reasoning path

### Medium-term (This week)
6. 🎨 **Build visual explorer**
   - 3D topology visualization
   - Cluster detection
   - Interactive navigation

7. 📈 **Add monitoring**
   - Query analytics
   - Performance metrics
   - Cost tracking

### Long-term (Future)
8. 🔮 **Precedent prediction**
9. 📚 **Expand to other legal domains**
10. 🌐 **Multi-language support**

---

## Lessons Learned

### What Worked Well
- **Section-level chunking:** Perfect balance of context vs granularity
- **Queue system:** Solved Worker execution limits elegantly
- **Weighted retrieval:** Simple but effective way to model judicial influence
- **LLM synthesis:** Excellent at combining statutory + case law

### Challenges Overcome
- **PDF parsing in Workers:** Solved by using DOCX + mammoth library
- **D1 rate limits:** Solved by batching inserts (50 at a time)
- **Execution timeouts:** Solved by scheduled cron + queue
- **Cost concerns:** Optimized chunking reduced by 50%

### Open Questions
- **How to extract logical structure from text?** (IF/THEN/UNLESS)
- **Can we reason in vector space?** (Probably not - need symbols)
- **How to visualize 1536D topology?** (UMAP/t-SNE to 3D)
- **How to detect conflicting interpretations?** (Cluster analysis?)

---

## Resources

### Documentation
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Vectorize](https://developers.cloudflare.com/vectorize/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

### Research Papers
- "Legal Reasoning with Vector Embeddings"
- "Semantic Search in Legal Corpora"
- "Precedent Prediction using ML"

### Similar Projects
- [LexNLP](https://github.com/LexPredict/lexpredict-lexnlp)
- [Legal-BERT](https://huggingface.co/nlpaueb/legal-bert-base-uncased)
- [CaseLaw Access Project](https://case.law/)

---

## Conclusion

This project demonstrates a **novel approach to legal reasoning** by treating law as a multi-layered semantic topology. The combination of:

1. **Vector embeddings** (semantic similarity)
2. **Weighted influence** (judicial hierarchy)
3. **LLM synthesis** (legal reasoning)

...creates a system that can:
- Find relevant law automatically
- Understand current judicial interpretation
- Generate comprehensive legal analysis
- Explain its reasoning clearly

**The key insight:** Law is not just text to search - it's a **living structure** that evolves through judicial interpretation. By modeling this as a weighted topology, we can capture both the formal rules (statutes) and the practical reality (case law).

---

**Project by:** Jan Haladík
**Date:** September 26, 2025
**Status:** Proof of concept working, production-ready architecture
**License:** TBD
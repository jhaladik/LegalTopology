# Legal Topology Worker

A Cloudflare Worker that implements a multi-layer legal reasoning system for Czech law. The system uses the Civil Code as a base topology and overlays judicial decisions with weighted influence to predict current legal interpretations.

## Architecture

### Core Concept

The system treats law as a **living topology**:
- **Base Layer**: Civil Code sections provide the foundational structure
- **Decision Layers**: Court decisions warp the topology based on weighted influence
- **Emergent Structure**: Legal concepts and relationships emerge from semantic similarity

### Components

```
worker/
├── src/
│   ├── index.ts                    # Main Worker entry point
│   ├── handlers/
│   │   ├── ingest-civil-code.ts   # Process and vectorize Civil Code
│   │   ├── ingest-decision.ts     # Process and vectorize court decisions
│   │   ├── query.ts               # Query the legal topology
│   │   └── recompute-weights.ts   # Update decision weights
│   ├── chunking/
│   │   ├── statute-chunker.ts     # Chunk statutes by section/paragraph
│   │   ├── decision-chunker.ts    # Chunk decisions semantically
│   │   └── utils.ts               # Shared chunking utilities
│   ├── embedding/
│   │   ├── openai-client.ts       # OpenAI embedding API client
│   │   └── prompts.ts             # Context-aware embedding prompts
│   ├── weights/
│   │   └── calculator.ts          # Multi-factor weight calculation
│   └── types/
│       ├── metadata.ts             # TypeScript interfaces for metadata
│       └── chunks.ts               # Chunk and vector types
├── wrangler.toml                   # Worker configuration
├── package.json
└── README.md
```

## Setup

### Prerequisites

1. Cloudflare account with Workers access
2. OpenAI API key
3. Node.js 18+ and npm

### Installation

```bash
cd worker
npm install
```

### Configure Cloudflare Resources

```bash
# Create Vectorize index
npm run vectorize:create

# Create R2 bucket
npm run r2:create

# Set OpenAI API key
npm run secret:openai
# (Enter your OpenAI API key when prompted)
```

### Deploy

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

## API Endpoints

### 1. Health Check

```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-09-26T10:30:00.000Z",
  "version": "1.0.0"
}
```

### 2. Ingest Civil Code

Upload and vectorize the Civil Code PDF.

```bash
POST /api/ingest/civil-code
Content-Type: multipart/form-data

file: <civil_code.pdf>
```

Response:
```json
{
  "status": "processing",
  "total_chunks": 3500,
  "batches": 70,
  "message": "Civil code ingestion started"
}
```

### 3. Ingest Court Decision

Upload and vectorize a court decision.

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

Response:
```json
{
  "status": "indexed",
  "case_id": "23 Cdo 369/2023",
  "chunks": 45,
  "weight": 8.5
}
```

### 4. Query Legal Topology

Query the system with a legal question.

```bash
POST /api/query
Content-Type: application/json

{
  "question": "Tenant insured landlord's building without written consent",
  "topK": 20
}
```

Response:
```json
{
  "query": "Tenant insured landlord's building without written consent",
  "total_results": 20,
  "results": {
    "all": [
      {
        "id": "statute_2767_0",
        "score": 0.92,
        "weighted_score": 0.92,
        "metadata": {
          "type": "statute",
          "section": "2767",
          "text": "Insurance of third-party property requires consent...",
          "weight": 1.0
        }
      },
      {
        "id": "decision_23_Cdo_369_2023_para8",
        "score": 0.89,
        "weighted_score": 7.56,
        "metadata": {
          "type": "judicial",
          "case_id": "23 Cdo 369/2023",
          "court": "Nejvyšší soud",
          "text": "Consent may be implied from relationship...",
          "weight": 8.5
        }
      }
    ],
    "statutes": [...],
    "judicial": [...]
  }
}
```

### 5. Recompute Weights

Recalculate weights for specific decisions (e.g., after citation count updates).

```bash
POST /api/weights/recompute
Content-Type: application/json

{
  "case_ids": ["23 Cdo 369/2023", "25 Cdo 144/2024"]
}
```

Response:
```json
{
  "status": "completed",
  "updated_cases": ["23 Cdo 369/2023", "25 Cdo 144/2024"],
  "count": 2
}
```

## Weight Calculation

Decisions receive dynamic weights based on multiple factors:

```typescript
weight = base_weight
  × court_hierarchy_multiplier    // Supreme Court: 10x, High Court: 5x, etc.
  × recency_factor                // Exponential decay: e^(-0.15 × years_old)
  × citation_influence            // 1 + log(citation_count + 1) × 0.2
  × precedential_multiplier       // Binding: 2x, En banc: 1.5x
  × overruled_penalty             // Overruled: 0.1x
```

## Development

### Local Development

```bash
npm run dev
```

The worker will run locally at `http://localhost:8787`

### Logs

```bash
npm run tail
```

## Example Usage

### 1. Initialize with Civil Code

```bash
curl -X POST http://localhost:8787/api/ingest/civil-code \
  -F "file=@../laws/Sb_2012_89_2025-07-01_IZ.pdf"
```

### 2. Add Court Decisions

```bash
curl -X POST http://localhost:8787/api/ingest/decision \
  -F "file=@../decisions/NS1.pdf" \
  -F 'metadata={"case_id":"23 Cdo 369/2023","court":"Nejvyšší soud","date":"2023-08-30","is_binding":true}'
```

### 3. Query the System

```bash
curl -X POST http://localhost:8787/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the requirements for insurance of third-party property?",
    "topK": 10
  }'
```

## Future Enhancements

- [ ] Citation graph tracking
- [ ] Temporal topology snapshots
- [ ] Confidence scoring
- [ ] Multi-language support
- [ ] Real-time weight updates
- [ ] Geodesic path computation through legal space
- [ ] Cluster detection for legal concepts

## License

MIT
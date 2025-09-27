# Decision Ingestion Test Suite

## Test Data
- **NS1**: 32 Cdo 3172/2020 (2021-03-02) - Insurance contract law, principle of *fraus omnia corrumpit*
- **NS2**: 27 Cdo 935/2022 (2022-11-30) - Written form requirements for insurance contracts
- **NS3**: 23 Cdo 2700/2023 (2024-03-12) - Traffic accident leaving scene, regression rights

## Test 1: Decision Parsing
**Purpose**: Verify correct extraction of decision metadata

### Expected Results:
```json
{
  "NS1": {
    "case_id": "32 Cdo 3172/2020",
    "court": "Nejvyšší soud",
    "date": "2021-03-02",
    "ecli": "CZ:NS:2021:32.CDO.3172.2020.1",
    "decision_number": "85/2021",
    "legal_area": "Pojištění",
    "pravni_veta": "Ustanovení § 2809 o. z. nebrání smluvním stranám pojistné smlouvy sjednat si možnost odmítnutí pojistného plnění...",
    "sections_referenced": ["§2809"]
  },
  "NS2": {
    "case_id": "27 Cdo 935/2022",
    "court": "Nejvyšší soud",
    "date": "2022-11-30",
    "ecli": "CZ:NS:2022:27.CDO.935.2022.1",
    "decision_number": "101/2023",
    "legal_area": "Forma právních jednání",
    "pravni_veta": "Nedodržení požadavku písemné formy pojistné smlouvy podle § 2758 odst. 2 věty první o. z. nezakládá samo o sobě absolutní neplatnost pojistné smlouvy.",
    "sections_referenced": ["§2758", "§556", "§582", "§586", "§588"]
  },
  "NS3": {
    "case_id": "23 Cdo 2700/2023",
    "court": "Nejvyšší soud",
    "date": "2024-03-12",
    "ecli": "CZ:NS:2024:23.CDO.2700.2023.1",
    "decision_number": "2/2025",
    "legal_area": "Pojištění",
    "pravni_veta": "Pojistitel má podle § 10 odst. 1 písm. c) zákona č. 168/1999 Sb., ve znění účinném od 23. 9. 2016, proti pojištěnému právo na náhradu toho, co za něho plnil...",
    "sections_referenced": ["§10"]
  }
}
```

## Test 2: Decision Chunking
**Purpose**: Verify correct splitting into principle + sections

### Expected Chunks:

**NS1** (4 chunks):
1. `decision_32_Cdo_3172/2020_principle` - Právní věta only
2. `decision_32_Cdo_3172/2020_section_I_0` - Section I
3. `decision_32_Cdo_3172/2020_section_II_1` - Section II
4. `decision_32_Cdo_3172/2020_section_III_2` - Section III

**NS2** (2 chunks):
1. `decision_27_Cdo_935/2022_principle` - Právní věta only
2. `decision_27_Cdo_935/2022_section_full_0` - Full text (no Roman sections)

**NS3** (4 chunks):
1. `decision_23_Cdo_2700/2023_principle` - Právní věta only
2. `decision_23_Cdo_2700/2023_section_I_0` - Section I
3. `decision_23_Cdo_2700/2023_section_II_1` - Section II
4. `decision_23_Cdo_2700/2023_section_III_2` - Section III

### Validation:
- Each principle chunk has `subtype: "principle"`
- Each section chunk has `subtype: "full_decision"`
- No section exceeds 14,000 characters
- All chunks contain `statute_refs` array

## Test 3: Weight Calculation
**Purpose**: Verify decision weight calculation

### Formula:
```
base_weight = 10.0 (Supreme Court)
recency_factor = 1.0 + (1.0 - years_old / 10.0) * 0.2
citation_factor = 1.0 + (citation_count / 100.0) * 0.5
binding_factor = 1.2 if is_binding else 1.0
en_banc_factor = 1.3 if en_banc else 1.0

weight = base_weight * recency_factor * citation_factor * binding_factor * en_banc_factor
```

### Expected Weights:
- **NS1** (2021, 4 years old): 10.0 × 1.08 × 1.0 × 1.2 × 1.0 = **12.96**
- **NS2** (2022, 3 years old): 10.0 × 1.14 × 1.0 × 1.2 × 1.0 = **13.68**
- **NS3** (2024, 1 year old): 10.0 × 1.18 × 1.0 × 1.2 × 1.0 = **14.16**

### Principle Boost:
Principle chunks get 1.2× weight:
- NS1 principle: 12.96 × 1.2 = **15.55**
- NS2 principle: 13.68 × 1.2 = **16.42**
- NS3 principle: 14.16 × 1.2 = **16.99**

## Test 4: D1 Storage
**Purpose**: Verify decisions are stored in D1

### SQL Query:
```sql
SELECT case_id, court, date, ecli, pravni_veta, weight, sections_referenced
FROM decisions
WHERE case_id IN ('32 Cdo 3172/2020', '27 Cdo 935/2022', '23 Cdo 2700/2023')
ORDER BY date;
```

### Expected:
- 3 rows in `decisions` table
- All fields populated correctly
- `sections_referenced` stored as JSON array
- `indexed_at` timestamp present
- UPSERT works (re-ingesting doesn't create duplicates)

## Test 5: Queue Processing
**Purpose**: Verify chunks are added to queue with correct priority

### Expected Queue Behavior:
- All decision chunks added with priority = 10
- Statute chunks have priority = 0
- Higher priority chunks processed first
- Each chunk entry contains:
  - `chunk_id`
  - `chunk_text`
  - `chunk_metadata` (JSON)
  - `priority = 10`
  - `status = 'pending'`

## Test 6: Vector Embedding
**Purpose**: Verify embeddings are created and stored

### Process:
1. Cron job picks up pending chunks
2. Prepares text using `prepareDecisionText()` function
3. Gets embedding from OpenAI (1536 dimensions)
4. Stores in Vectorize with metadata

### Expected Metadata (truncated to 5000 chars):
```json
{
  "type": "judicial",
  "subtype": "principle" | "full_decision",
  "case_id": "32 Cdo 3172/2020",
  "court": "Nejvyšší soud",
  "date": "2021-03-02",
  "statute_refs": ["§2809"],
  "is_binding": true,
  "citation_count": 0,
  "overruled": false,
  "weight": 15.55,
  "text": "[first 5000 chars]...[truncated]",
  "indexed_at": "2025-09-26T20:38:00.000Z",
  "embedding_model": "text-embedding-3-large"
}
```

## Test 7: Query Integration
**Purpose**: Verify decisions appear in query results

### Test Query:
```
"Co říká Nejvyšší soud o pojištění a podvodném jednání pojistníka?"
```

### Expected Results:
- NS1 chunks appear in results (relevant to *fraus omnia corrumpit*)
- Higher weight chunks (principle) rank higher
- Chunks from 2024 (NS3) rank slightly higher than 2021 (NS1) due to recency

### Validation:
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Co říká Nejvyšší soud o pojištění a podvodném jednání pojistníka?",
    "topK": 5,
    "filter": {"type": "judicial"}
  }'
```

Expected response includes chunks from NS1 with high similarity scores.

## Test 8: Synthesis
**Purpose**: Verify decisions are used in legal reasoning

### Test Query:
```
"Může pojišťovna odepřít pojistné plnění, pokud pojištěný uvedl nepravdivé údaje?"
```

### Expected Synthesis:
Should reference NS1's principle about § 2809 and possibility of contractual provisions for denying insurance benefits.

### Validation:
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Může pojišťovna odepřít pojistné plnění, pokud pojištěný uvedl nepravdivé údaje?",
    "includeStatutes": true,
    "includeDecisions": true
  }'
```

Expected: Answer cites NS1 (32 Cdo 3172/2020) and § 2809 o.z.

## Test 9: Citation Graph
**Purpose**: Verify citation relationships are stored

### Setup:
Ingest decision with citations:
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/ingest/decision \
  -F "text=$(cat decision.txt)" \
  -F 'metadata={"case_id":"TEST","court":"NS","date":"2025-01-01","cites":["32 Cdo 3172/2020","27 Cdo 935/2022"]}'
```

### Expected:
- 2 rows in `citations` table
- `citing_case_id = "TEST"`
- `cited_case_id` IN ('32 Cdo 3172/2020', '27 Cdo 935/2022')

### Query:
```sql
SELECT * FROM citations WHERE citing_case_id = 'TEST';
```

## Test 10: Error Handling
**Purpose**: Verify graceful failure handling

### Test Cases:

1. **Missing text/file**:
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/ingest/decision
# Expected: 400 "File or text required"
```

2. **Invalid metadata JSON**:
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/ingest/decision \
  -F "text=test" \
  -F 'metadata={invalid json}'
# Expected: 500 with error message
```

3. **Token limit exceeded** (section > 14,000 chars):
- Verify automatic truncation with "[Section continues...]"
- No embedding errors

4. **Metadata size limit** (truncation to 5000 chars):
- Verify text field truncated to "...[truncated]"
- No Vectorize errors

## Test 11: Performance
**Purpose**: Verify processing speed and limits

### Metrics:
- Ingestion time: < 2 seconds per decision
- Embedding time: ~50 chunks/minute (via cron)
- Queue processing: No items stuck in "processing" state
- Failed items: < 1% failure rate

### Monitoring:
```bash
# Check queue stats
curl https://legal-topology.jhaladik.workers.dev/api/queue/stats

# Expected output:
# {"pending":0,"processing":0,"completed":4474,"failed":0,"total":4474}
```

## Status: ✅ Completed
- All 3 decisions successfully ingested
- NS1: 4 chunks queued
- NS2: 2 chunks queued
- NS3: 4 chunks queued
- Total: 10 new decision chunks ready for embedding
- Cron job will process at rate of 50 chunks/minute
- Expected completion: < 1 minute
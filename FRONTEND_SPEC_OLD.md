# Legal Topology - Professional Frontend Specification

## Overview
Single-page application for presenting multi-issue legal analysis to Czech law firms. Focus: Clean UX, progressive disclosure, domain validation.

---

## Page Structure

### 1. Main Landing Page (`/`)

#### Hero Section
```
┌─────────────────────────────────────────────┐
│  ⚖️ AI Legal Topology                       │
│  Automatická analýza složitých právních     │
│  případů s identifikací konkurujících       │
│  právních doktrín                           │
│                                             │
│  [Jak to funguje →]                         │
└─────────────────────────────────────────────┘
```

#### Seed Cases Section
```
Vyberte předpřipravený případ:

┌────────────────────────────────────────┐
│ 🏢 Neoprávněný výběr + pronájem        │
│ Společník vybral peníze bez souhlasu   │
│ a pronajímá nemovitost 13 let          │
│ [Analyzovat →]                         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 📋 Porušení smlouvy + vydržení         │
│ Dodavatel nedodal zboží, kupující      │
│ užívá pozemek 11 let                   │
│ [Analyzovat →]                         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🤝 Zánik společnosti + dělení majetku  │
│ Společníci se nedohodli na rozdělení   │
│ majetku po zániku společnosti          │
│ [Analyzovat →]                         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💰 Bezdůvodné obohacení + promlčení    │
│ Platby na neexistující dluh před       │
│ 8 lety, nárok na vrácení?              │
│ [Analyzovat →]                         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🏠 Vady nemovitosti + odpovědnost      │
│ Skryté vady domu zjištěné po koupi,    │
│ prodávající o nich nevěděl             │
│ [Analyzovat →]                         │
└────────────────────────────────────────┘
```

#### Custom Query Section
```
Nebo popište vlastní případ:

┌─────────────────────────────────────────────┐
│                                             │
│  [Large textarea, 5 rows]                   │
│  Placeholder: "Popište právní situaci       │
│  v občanském, obchodním nebo věcném právu.  │
│  Systém identifikuje jednotlivé právní      │
│  problémy a najde relevantní předpisy       │
│  a judikaturu."                             │
│                                             │
└─────────────────────────────────────────────┘

         [Zkontrolovat a analyzovat →]
```

---

### 2. Pre-Analysis Modal (Domain Check)

When user clicks "Analyzovat" on custom query:

```
┌─────────────────────────────────────────────┐
│  🔍 Kontrola kompetence systému             │
│                                             │
│  Ověřuji, zda se jedná o občanské právo...  │
│  [Loading spinner]                          │
└─────────────────────────────────────────────┘
```

**Three outcomes:**

#### ✅ Success (Civil Law Detected)
```
┌─────────────────────────────────────────────┐
│  ✅ Případ spadá do občanského práva        │
│                                             │
│  Detekované oblasti:                        │
│  • Věcná práva (§976-1474)                  │
│  • Obligační právo (§1721-2893)             │
│                                             │
│  [Pokračovat k analýze →]                   │
└─────────────────────────────────────────────┘
```

#### ❌ Rejection (Other Domain)
```
┌─────────────────────────────────────────────┐
│  ⚠️ Případ nespadá do občanského práva      │
│                                             │
│  Tento systém je trénován pouze na českém   │
│  občanském zákoníku (§1-3081).              │
│                                             │
│  Detekováno: Pracovní právo                 │
│                                             │
│  Pro tuto oblast kontaktujte právníka.      │
│                                             │
│  [Zavřít] [Zkusit jiný případ]              │
└─────────────────────────────────────────────┘
```

#### ⚠️ Uncertain
```
┌─────────────────────────────────────────────┐
│  ⚠️ Nepodařilo se určit právní oblast       │
│                                             │
│  Prosím, upřesněte popis případu nebo       │
│  vyberte některý z připravených příkladů.   │
│                                             │
│  [Upravit popis] [Vybrat příklad]           │
└─────────────────────────────────────────────┘
```

---

### 3. Results Page (Three-Tier Display)

#### Executive Summary (Always Visible)
```
┌─────────────────────────────────────────────────────────────┐
│  📊 SHRNUTÍ ANALÝZY                                         │
│                                                             │
│  Složitost: 🟡 STŘEDNÍ (3 právní problémy)                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ #1 Neoprávněný výběr prostředků společnosti           │ │
│  │ 🟢 Vysoká spolehlivost (87%)                           │ │
│  │ Doktríny: Porušení povinností společníka              │ │
│  │ Základ: §2727, §2739 + NS 32 Cdo 2172/2019           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ #2 Užívání nemovitosti k pronájmu bez souhlasu        │ │
│  │ 🟢 Vysoká spolehlivost (91%)                           │ │
│  │ Doktríny: Neoprávněné užívání, podnájem               │ │
│  │ Základ: §2215, §2275 + NS 26 Cdo 1523/2018           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ #3 Vydržení po 13 letech užívání                      │ │
│  │ 🟡 Střední spolehlivost (64%)                          │ │
│  │ Doktríny: Vydržení, mimořádné vydržení                │ │
│  │ Základ: §1091, §1095 + NS 22 Cdo 3457/2018           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  💡 DOPORUČENÁ STRATEGIE:                                  │
│  1. Okamžitě požadovat vrácení prostředků (§2727 odst. 2) │
│  2. Zdržet se vstupu do nemovitosti (§2215)                │
│  3. Posoudit námitku vydržení (komplikovaná obrana)        │
│                                                             │
│  [📄 Stáhnout PDF] [🔗 Sdílet] [📞 Domluvit konzultaci]    │
└─────────────────────────────────────────────────────────────┘
```

#### Legal Foundation (Collapsible per Issue)
```
┌─────────────────────────────────────────────────────────────┐
│  📚 PRÁVNÍ ZÁKLAD                                           │
│                                                             │
│  ▼ Problém #1: Neoprávněný výběr prostředků          [−]   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ DOKTRINA: Porušení povinností společníka              │ │
│  │ Počet rozhodnutí v clusteru: 23                        │ │
│  │ Společné paragrafy: §2727, §2728, §2739              │ │
│  │                                                         │ │
│  │ 🏛️ ZÁKONNÉ UKOTVENÍ                                    │ │
│  │ § 2727 odst. 1 - Zákaz konkurence                     │ │
│  │ "Společník nesmí bez souhlasu ostatních společníků..." │ │
│  │ [Zobrazit celý text]                                   │ │
│  │                                                         │ │
│  │ § 2727 odst. 2 - Nároky ostatních společníků          │ │
│  │ "Jednal-li společník na vlastní účet, mohou se..."     │ │
│  │ [Zobrazit celý text]                                   │ │
│  │                                                         │ │
│  │ ⚖️ JUDIKATURA NEJVYŠŠÍHO SOUDU                         │ │
│  │ 32 Cdo 2172/2019 (váha: 12.4)                         │ │
│  │ Právní věta: "Porušení § 2727 zakládá nárok..."       │ │
│  │ [Zobrazit celé rozhodnutí]                             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ▶ Problém #2: Užívání nemovitosti k pronájmu       [+]   │
│                                                             │
│  ▶ Problém #3: Vydržení po 13 letech užívání        [+]   │
└─────────────────────────────────────────────────────────────┘
```

#### Deep Dive (Expandable per Issue)
```
┌─────────────────────────────────────────────────────────────┐
│  🔬 DETAILNÍ ROZBOR                                         │
│                                                             │
│  ▼ Problém #1: Neoprávněný výběr prostředků          [−]   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 📖 KOMPLETNÍ JUDIKATURA (5 nejrelevantnějších)        │ │
│  │                                                         │ │
│  │ ┌─────────────────────────────────────────────────┐   │ │
│  │ │ 1. NS 32 Cdo 2172/2019 (12.4) 🟢 95.2%          │   │ │
│  │ │ Soud: Nejvyšší soud | Datum: 2020-03-11         │   │ │
│  │ │                                                   │   │ │
│  │ │ Právní věta:                                      │   │ │
│  │ │ "Porušení § 2727 zakládá nárok ostatních..."     │   │ │
│  │ │                                                   │   │ │
│  │ │ [Zobrazit celý text] [Citovat]                   │   │ │
│  │ └─────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  │ ┌─────────────────────────────────────────────────┐   │ │
│  │ │ 2. NS 29 Cdo 4068/2007 (11.8) 🟢 93.1%          │   │ │
│  │ │ [Preview...]                                     │   │ │
│  │ └─────────────────────────────────────────────────┘   │ │
│  │                                                         │ │
│  │ ... [3 more cases]                                     │ │
│  │                                                         │ │
│  │ 💭 AI PRÁVNÍ POSOUZENÍ                                 │ │
│  │ [Full analysis text from GPT-4...]                     │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ▶ Problém #2: Užívání nemovitosti...                [+]   │
│  ▶ Problém #3: Vydržení...                           [+]   │
└─────────────────────────────────────────────────────────────┘
```

#### Action Buttons (Sticky Footer)
```
┌─────────────────────────────────────────────────────────────┐
│  [📄 Stáhnout PDF]  [🔗 Sdílet odkaz]  [📞 Konzultace]     │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. "How It Works" Page (`/jak-to-funguje`)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚖️ Jak funguje Legal Topology                             │
└─────────────────────────────────────────────────────────────┘

📚 CO JE PRÁVNÍ TOPOLOGIE?

Právní topologie mapuje vztahy mezi zákony, judikaturou a právními
doktrinami v multidimenzionálním prostoru. Místo klasického
fulltextového vyhledávání používáme vektorové embeddingy, které
zachycují sémantický význam právních textů.

────────────────────────────────────────────────────────────────

🧠 JAK TO FUNGUJE?

[Visual: 3 layers connected by arrows]

┌──────────────────┐
│   STATUTES       │  § 1-3081 Občanského zákoníku
│   §§§§§§§        │  Rozděleno na 8,000+ chunks
└──────┬───────────┘
       │ Citace + sémantická podobnost
       ↓
┌──────────────────┐
│ SUPREME COURT    │  721 rozhodnutí Nejvyššího soudu
│   ⚖️⚖️⚖️          │  Váha 5.0-12.0 podle citací
└──────┬───────────┘
       │ Precedenční hodnota
       ↓
┌──────────────────┐
│ LOWER COURTS     │  2,000+ rozhodnutí nižších soudů
│   🏛️🏛️🏛️          │  Váha 0.5-3.0
└──────────────────┘

────────────────────────────────────────────────────────────────

🔍 DEKOMPOZICE DOTAZU

Složité případy obsahují obvykle 3-5 právních problémů.

Příklad:
"Partner vzal peníze bez souhlasu a pronajímá dům 13 let"

↓ AI dekompozice ↓

1. Neoprávněný výběr prostředků (corporate governance)
2. Užívání k pronájmu bez souhlasu (property rights)
3. Vydržení po 13 letech (adverse possession)

Každý problém se analyzuje samostatně a paralelně.

────────────────────────────────────────────────────────────────

🎯 CLUSTERING V REÁLNÉM ČASE

Pro každý problém:

1. Načteme 50 nejrelevantnějších rozhodnutí
2. Seskupíme je podle citovaných paragrafů (Jaccard similarity)
3. Každý cluster = jedna právní doktrína
4. Najdeme:
   - Zákonné ukotvení (nejčastěji citované §§)
   - Precedent NS (nejvyšší váha v clusteru)
   - Top 3-5 reprezentativní rozhodnutí

Výsledek: Místo 50 chaotických rozhodnutí dostanete
2-3 jasně definované doktríny s hierarchií.

────────────────────────────────────────────────────────────────

💡 PROČ TO FUNGUJE LÉPE?

✅ Najde konkurující doktríny (např. bezdůvodné obohacení vs.
   podíl na zisku)
✅ Identifikuje precedenční hodnotu (NS > krajské > okresní)
✅ Maticová analýza (které doktríny se vztahují ke kterým
   problémům)
✅ Kontext-aware (rozliší neoprávněný vs. consensuální vztah)

❌ Tradiční fulltextové vyhledávání:
   - Nezachytí sémantický kontext
   - Vrací stovky rozhodnutí bez struktury
   - Neidentifikuje konkurující výklady

────────────────────────────────────────────────────────────────

⚙️ TECHNOLOGIE

- Vectorize Index: 1536-dim embeddings (OpenAI text-embedding-3-large)
- 12,000+ embedded chunks (8K statutes + 4K decisions)
- Query-time clustering: O(n²) na 50 výsledcích = 10ms CPU
- GPT-4o pro finální syntézu

────────────────────────────────────────────────────────────────

[← Zpět na hlavní stránku]
```

---

## API Endpoints Needed

### New: Domain Classification
```typescript
POST /api/classify-domain
{
  "question": "string"
}

Response:
{
  "is_civil_law": boolean,
  "confidence": number,  // 0.0-1.0
  "detected_domains": string[],  // ["civil_law", "property_law"]
  "detected_sections": string[],  // ["§1091", "§2727"]
  "recommendation": "proceed" | "reject" | "clarify"
}
```

### Existing: Multi-Issue Analysis
```typescript
POST /api/synthesize-multi
{
  "question": "string",
  "facts": {...}  // optional
}

Response: (already implemented)
{
  "query_decomposition": {...},
  "legal_research": [...],
  "statutory_foundation": [...],
  "case_law": [...],
  "analysis": "string"
}
```

---

## Styling Guidelines

### Colors
- Primary: `#667eea` (purple-blue)
- Secondary: `#764ba2` (purple)
- Success: `#27ae60` (green) 🟢
- Warning: `#f39c12` (orange) 🟡
- Error: `#e74c3c` (red) 🔴
- Background: `#f8f9fa` (light gray)
- Text: `#333333` (dark gray)

### Typography
- Font: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- Heading 1: 2.5em, bold
- Heading 2: 2em, bold
- Heading 3: 1.5em, semibold
- Body: 1em, regular
- Small: 0.85em

### Components
- Border radius: 10-15px
- Box shadow: `0 10px 30px rgba(0,0,0,0.2)`
- Padding: 20-30px
- Button hover: `transform: translateY(-2px)`

---

## Progressive Disclosure Strategy

1. **First View**: Executive summary only (collapsed details)
2. **Second Click**: Legal foundation expands for one issue
3. **Third Click**: Deep dive opens with full case texts
4. **Always Visible**: Action buttons (PDF, Share, Consultation)

Goal: Lawyer can understand case in 30 seconds, dive deeper if needed.

---

## Implementation Priority

1. ✅ Domain classification endpoint (`/api/classify-domain`)
2. ✅ Main landing with 5 seed cases
3. ✅ Pre-analysis modal (domain check)
4. ✅ Three-tier results display
5. ✅ PDF export (simple HTML → PDF conversion)
6. ⏳ Share link (generate short URL, store in D1)
7. ⏳ "How it works" page
8. ⏳ Consultation button (mailto or form)

---

## Analytics & Statistics

### User Query Logging (D1 Table)
```sql
CREATE TABLE query_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  query_text TEXT NOT NULL,
  query_type TEXT,  -- 'seed' | 'custom'
  seed_case_id TEXT,  -- if seed case was used
  domain_check_result TEXT,  -- 'civil_law' | 'rejected' | 'uncertain'
  detected_domains TEXT,  -- JSON array
  analysis_completed BOOLEAN DEFAULT FALSE,
  issues_count INTEGER,
  session_id TEXT,
  user_agent TEXT
);

CREATE INDEX idx_query_logs_timestamp ON query_logs(timestamp);
CREATE INDEX idx_query_logs_domain ON query_logs(domain_check_result);
```

### Statistics Dashboard (Admin Only)

```
┌─────────────────────────────────────────────────────────────┐
│  📊 STATISTIKY VYUŽITÍ SYSTÉMU                              │
│                                                             │
│  Poslední 7 dní:                                           │
│  ┌──────────────────┐ ┌──────────────────┐                │
│  │  342              │ │  87%             │                │
│  │  Celkem dotazů    │ │  Úspěšnost       │                │
│  └──────────────────┘ └──────────────────┘                │
│                                                             │
│  ┌──────────────────┐ ┌──────────────────┐                │
│  │  2.8              │ │  24.3s           │                │
│  │  Avg issues/query │ │  Avg response    │                │
│  └──────────────────┘ └──────────────────┘                │
│                                                             │
│  📈 TRENDY DOTAZŮ                                          │
│  [Line chart: Queries per day]                             │
│                                                             │
│  🎯 TOP PRÁVNÍ OBLASTI                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Věcná práva (property)           142 (41%)  ████████│    │
│  │ Závazkové právo (obligations)     98 (29%)  █████  │    │
│  │ Obchodní právo (commercial)       67 (20%)  ███    │    │
│  │ Rodinné právo (family)            35 (10%)  ██     │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  🔍 NEJČASTĚJŠÍ PRÁVNÍ PROBLÉMY                            │
│  1. Bezdůvodné obohacení (89x)                             │
│  2. Vydržení nemovitostí (76x)                             │
│  3. Porušení povinností společníka (54x)                   │
│  4. Vady nemovitosti (47x)                                 │
│  5. Promlčení nároků (41x)                                 │
│                                                             │
│  ❌ ZAMÍTNUTÉ DOTAZY (13%)                                 │
│  - Pracovní právo: 23x                                     │
│  - Trestní právo: 11x                                      │
│  - Správní právo: 9x                                       │
│  - Nejasné: 2x                                             │
│                                                             │
│  📦 SEED VS CUSTOM                                         │
│  Seed cases: 187 (55%)                                     │
│  Custom queries: 155 (45%)                                 │
│                                                             │
│  🌐 TOP SEED CASES                                         │
│  1. Neoprávněný výběr + pronájem (78x)                    │
│  2. Bezdůvodné obohacení + promlčení (52x)                │
│  3. Vady nemovitosti (31x)                                 │
│  4. Zánik společnosti (16x)                                │
│  5. Porušení smlouvy + vydržení (10x)                     │
│                                                             │
│  [📥 Export CSV] [🔄 Refresh]                              │
└─────────────────────────────────────────────────────────────┘
```

### Real-time Statistics Widget (Public, on main page)

```
┌─────────────────────────────────────────────┐
│  📊 Živé statistiky                         │
│                                             │
│  🔍 Analyzováno případů: 1,247             │
│  ⚖️ Identifikováno problémů: 3,521         │
│  📚 Citovaných předpisů: 8,942             │
│  🏛️ Použitých rozhodnutí: 12,483          │
│                                             │
│  Poslední analýza: před 3 minutami         │
└─────────────────────────────────────────────┘
```

---

## API Endpoints for Analytics

### Log Query
```typescript
POST /api/analytics/log-query
{
  "query_text": string,
  "query_type": "seed" | "custom",
  "seed_case_id"?: string,
  "session_id": string
}

Response: { "logged": true, "query_id": number }
```

### Update Query Result
```typescript
POST /api/analytics/update-query
{
  "query_id": number,
  "domain_check_result": "civil_law" | "rejected" | "uncertain",
  "detected_domains": string[],
  "analysis_completed": boolean,
  "issues_count"?: number
}

Response: { "updated": true }
```

### Get Statistics (Admin)
```typescript
GET /api/analytics/stats?days=7

Response:
{
  "total_queries": number,
  "success_rate": number,
  "avg_issues_per_query": number,
  "avg_response_time_ms": number,
  "queries_per_day": Array<{date: string, count: number}>,
  "top_domains": Array<{domain: string, count: number, percentage: number}>,
  "top_issues": Array<{issue: string, count: number}>,
  "rejected_queries": {
    "total": number,
    "by_domain": Record<string, number>
  },
  "seed_vs_custom": {
    "seed": number,
    "custom": number
  },
  "top_seed_cases": Array<{seed_id: string, count: number}>
}
```

### Get Public Stats
```typescript
GET /api/analytics/public-stats

Response:
{
  "total_cases_analyzed": number,
  "total_issues_identified": number,
  "total_statutes_cited": number,
  "total_decisions_used": number,
  "last_analysis": string  // ISO timestamp
}
```

---

## D1 Database Migration

```sql
-- Add analytics table
CREATE TABLE IF NOT EXISTS query_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  query_text TEXT NOT NULL,
  query_type TEXT CHECK(query_type IN ('seed', 'custom')),
  seed_case_id TEXT,
  domain_check_result TEXT CHECK(domain_check_result IN ('civil_law', 'rejected', 'uncertain')),
  detected_domains TEXT,  -- JSON array
  analysis_completed BOOLEAN DEFAULT FALSE,
  issues_count INTEGER,
  statutes_count INTEGER,
  cases_count INTEGER,
  response_time_ms INTEGER,
  session_id TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_query_logs_timestamp ON query_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_query_logs_domain ON query_logs(domain_check_result);
CREATE INDEX IF NOT EXISTS idx_query_logs_session ON query_logs(session_id);

-- Add aggregated stats cache (for performance)
CREATE TABLE IF NOT EXISTS stats_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT UNIQUE NOT NULL,
  cache_value TEXT NOT NULL,  -- JSON
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stats_cache_key ON stats_cache(cache_key);
```

---

## Privacy & GDPR Compliance

### Data Collection Notice (Footer)
```
📊 Anonymní statistiky: Tento systém zaznamenává dotazy pro
zlepšení služby. Neukládáme osobní údaje ani IP adresy.
```

### What We Log
✅ Query text (for improving system)
✅ Detected legal domains
✅ Success/failure metrics
✅ Session ID (random UUID)
✅ User agent (for debugging)

❌ NO Personal data
❌ NO IP addresses
❌ NO User identification
❌ NO Client names/details

### Data Retention
- Query logs: 90 days
- Aggregated stats: Permanent (anonymized)
- Auto-cleanup cron job runs weekly

---

## Success Metrics

- ✅ Lawyer understands case structure in < 30 seconds
- ✅ No confusion about system capabilities (civil law only)
- ✅ Clear confidence indicators (🟢🟡🔴)
- ✅ Professional appearance for big law firm presentation
- ✅ Exportable/shareable results
- ✅ Anonymous usage analytics for system improvement
- ✅ Real-time statistics showing system credibility
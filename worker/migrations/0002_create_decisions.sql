-- Store parsed court decisions with metadata
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT NOT NULL UNIQUE,
  court TEXT NOT NULL,
  date TEXT NOT NULL,
  ecli TEXT,
  decision_number TEXT,
  decision_type TEXT,
  legal_area TEXT,
  pravni_veta TEXT NOT NULL,
  full_text TEXT NOT NULL,
  sections_referenced TEXT,
  weight REAL NOT NULL,
  is_binding BOOLEAN DEFAULT 1,
  en_banc BOOLEAN DEFAULT 0,
  citation_count INTEGER DEFAULT 0,
  overruled BOOLEAN DEFAULT 0,
  indexed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_decisions_case_id ON decisions(case_id);
CREATE INDEX idx_decisions_date ON decisions(date);
CREATE INDEX idx_decisions_court ON decisions(court);
CREATE INDEX idx_decisions_sections ON decisions(sections_referenced);

CREATE TABLE IF NOT EXISTS citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  citing_case_id TEXT NOT NULL,
  cited_case_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(citing_case_id, cited_case_id)
);

CREATE INDEX idx_citations_citing ON citations(citing_case_id);
CREATE INDEX idx_citations_cited ON citations(cited_case_id);
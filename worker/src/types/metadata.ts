export interface StatuteMetadata {
  type: 'statute';
  section: string;
  paragraph?: number;
  sub_chunk?: number;
  version_date: string;
  source: string;
  book?: string;
  chapter?: string;
}

export interface JudicialMetadata {
  type: 'judicial';
  subtype?: 'principle' | 'full_decision';
  case_id: string;
  court: string;
  date: string;
  paragraph_num?: number;
  statute_refs: string[];
  is_binding?: boolean;
  en_banc?: boolean;
  citation_count?: number;
  overruled?: boolean;
  cites?: string[];
}

export interface VectorMetadata extends Record<string, any> {
  weight: number;
  text: string;
  indexed_at: string;
  embedding_model?: string;
}

export type LegalMetadata = (StatuteMetadata | JudicialMetadata) & VectorMetadata;
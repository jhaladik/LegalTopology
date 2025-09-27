import { ParsedDecision } from '../chunking/decision-chunker';

export interface StoredDecision {
  id?: number;
  case_id: string;
  court: string;
  date: string;
  ecli?: string;
  decision_number?: string;
  decision_type?: string;
  legal_area?: string;
  pravni_veta: string;
  full_text: string;
  sections_referenced: string;
  weight: number;
  is_binding: boolean;
  en_banc: boolean;
  citation_count: number;
  overruled: boolean;
  indexed_at: string;
}

export class DecisionService {
  constructor(private db: D1Database) {}

  async storeDecision(parsed: ParsedDecision, weight: number): Promise<void> {
    const timestamp = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO decisions
        (case_id, court, date, ecli, decision_number, decision_type, legal_area,
         pravni_veta, full_text, sections_referenced, weight, is_binding, en_banc,
         citation_count, overruled, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(case_id) DO UPDATE SET
          court = excluded.court,
          date = excluded.date,
          ecli = excluded.ecli,
          decision_number = excluded.decision_number,
          decision_type = excluded.decision_type,
          legal_area = excluded.legal_area,
          pravni_veta = excluded.pravni_veta,
          full_text = excluded.full_text,
          sections_referenced = excluded.sections_referenced,
          weight = excluded.weight,
          indexed_at = excluded.indexed_at
      `)
      .bind(
        parsed.case_id,
        parsed.court,
        parsed.date,
        parsed.ecli || null,
        parsed.decision_number || null,
        parsed.decision_type || null,
        parsed.legal_area || null,
        parsed.pravni_veta,
        parsed.full_text,
        JSON.stringify(parsed.sections_referenced),
        weight,
        1,
        0,
        0,
        0,
        timestamp
      )
      .run();
  }

  async getDecision(case_id: string): Promise<StoredDecision | null> {
    const result = await this.db
      .prepare('SELECT * FROM decisions WHERE case_id = ?')
      .bind(case_id)
      .first();

    return result as StoredDecision | null;
  }

  async listDecisions(limit: number = 50): Promise<StoredDecision[]> {
    const result = await this.db
      .prepare('SELECT * FROM decisions ORDER BY date DESC LIMIT ?')
      .bind(limit)
      .all();

    return result.results as StoredDecision[];
  }

  async getDecisionsBySection(section: string): Promise<StoredDecision[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM decisions
        WHERE sections_referenced LIKE ?
        ORDER BY weight DESC, date DESC
      `)
      .bind(`%"§${section}"%`)
      .all();

    return result.results as StoredDecision[];
  }

  async updateCitationCount(case_id: string, count: number): Promise<void> {
    await this.db
      .prepare('UPDATE decisions SET citation_count = ? WHERE case_id = ?')
      .bind(count, case_id)
      .run();
  }

  async addCitation(citing_case_id: string, cited_case_id: string): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO citations (citing_case_id, cited_case_id)
        VALUES (?, ?)
        ON CONFLICT DO NOTHING
      `)
      .bind(citing_case_id, cited_case_id)
      .run();
  }

  async getCitedBy(case_id: string): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT citing_case_id FROM citations WHERE cited_case_id = ?')
      .bind(case_id)
      .all();

    return result.results.map((r: any) => r.citing_case_id);
  }

  async getCites(case_id: string): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT cited_case_id FROM citations WHERE citing_case_id = ?')
      .bind(case_id)
      .all();

    return result.results.map((r: any) => r.cited_case_id);
  }
}
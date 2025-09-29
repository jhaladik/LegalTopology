export interface DiscoveredDoctrine {
  id: number;
  name: string;
  display_name: string;
  description: string;
  member_count: number;
  avg_confidence: number;
  legal_domain: string;
}

export async function loadDiscoveredDoctrines(db: D1Database): Promise<DiscoveredDoctrine[]> {
  try {
    const result = await db.prepare(`
      SELECT id, name, display_name, description, member_count, avg_confidence, legal_domain
      FROM doctrines
      WHERE member_count >= 5
      ORDER BY member_count DESC
      LIMIT 50
    `).all();

    return (result.results || []) as DiscoveredDoctrine[];
  } catch (error) {
    console.error('[Doctrine Loader] Failed to load doctrines:', error);
    return [];
  }
}
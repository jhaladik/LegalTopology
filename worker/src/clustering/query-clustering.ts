interface ClusterMember {
  id: string;
  score: number;
  metadata: any;
  sections_referenced?: string[];
  pravni_veta?: string;
}

interface DoctrineCluster {
  id: string;
  members: ClusterMember[];
  common_sections: string[];
  statute_anchor: any | null;
  supreme_court_precedent: any | null;
  avg_score: number;
  doctrine_signature: string;
}

function jaccardSimilarity(set1: string[], set2: string[]): number {
  if (!set1 || !set2 || set1.length === 0 || set2.length === 0) return 0;

  const intersection = set1.filter(x => set2.includes(x));
  const union = [...new Set([...set1, ...set2])];

  return intersection.length / union.length;
}

export function clusterQueryResults(
  results: ClusterMember[],
  minSimilarity: number = 0.4,
  minClusterSize: number = 3
): DoctrineCluster[] {
  const clusters: DoctrineCluster[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < results.length; i++) {
    if (assigned.has(results[i].id)) continue;

    const seed = results[i];
    const seedSections = seed.metadata.sections_referenced || [];

    if (seedSections.length === 0) continue;

    const clusterMembers: ClusterMember[] = [seed];
    assigned.add(seed.id);

    for (let j = i + 1; j < results.length; j++) {
      if (assigned.has(results[j].id)) continue;

      const candidate = results[j];
      const candidateSections = candidate.metadata.sections_referenced || [];

      const similarity = jaccardSimilarity(seedSections, candidateSections);

      if (similarity >= minSimilarity) {
        clusterMembers.push(candidate);
        assigned.add(candidate.id);
      }
    }

    if (clusterMembers.length >= minClusterSize) {
      const allSections = clusterMembers
        .flatMap(m => m.metadata.sections_referenced || []);

      const sectionCounts = new Map<string, number>();
      allSections.forEach(s => {
        sectionCounts.set(s, (sectionCounts.get(s) || 0) + 1);
      });

      const commonSections = Array.from(sectionCounts.entries())
        .filter(([_, count]) => count >= Math.ceil(clusterMembers.length * 0.5))
        .map(([section, _]) => section)
        .sort();

      const avgScore = clusterMembers.reduce((sum, m) => sum + m.score, 0) / clusterMembers.length;

      clusters.push({
        id: `cluster_${clusters.length + 1}`,
        members: clusterMembers,
        common_sections: commonSections,
        statute_anchor: null,
        supreme_court_precedent: null,
        avg_score: avgScore,
        doctrine_signature: commonSections.join(',')
      });
    }
  }

  return clusters.sort((a, b) => b.members.length - a.members.length);
}

export async function enrichClustersWithAnchors(
  clusters: DoctrineCluster[],
  vectorize: any,
  getEmbedding: (text: string, env: any) => Promise<number[]>,
  env: any
): Promise<DoctrineCluster[]> {
  for (const cluster of clusters) {
    if (cluster.common_sections.length > 0) {
      const statuteQuery = cluster.common_sections.slice(0, 3).join(' ');
      const statuteEmbedding = await getEmbedding(statuteQuery, env);

      const statuteResults = await vectorize.query(statuteEmbedding, {
        topK: 5,
        returnMetadata: true,
        filter: { type: 'civil_code' }
      });

      if (statuteResults.matches.length > 0) {
        cluster.statute_anchor = statuteResults.matches[0].metadata;
      }
    }

    if (cluster.members.length > 0) {
      const topDecisions = cluster.members.slice(0, 3);
      const combinedText = topDecisions
        .map(m => m.metadata.pravni_veta || m.metadata.text?.substring(0, 200))
        .filter(t => t)
        .join(' ');

      if (combinedText) {
        const precedentEmbedding = await getEmbedding(combinedText, env);

        const precedentResults = await vectorize.query(precedentEmbedding, {
          topK: 3,
          returnMetadata: true,
          filter: { court: 'Nejvyšší soud', is_binding: true }
        });

        if (precedentResults.matches.length > 0) {
          cluster.supreme_court_precedent = precedentResults.matches[0].metadata;
        }
      }
    }
  }

  return clusters;
}

export function selectRepresentativesFromCluster(
  cluster: DoctrineCluster,
  maxMembers: number = 5
): ClusterMember[] {
  const sorted = [...cluster.members].sort((a, b) => {
    const aIsSupreme = a.metadata.court === 'Nejvyšší soud' ? 1 : 0;
    const bIsSupreme = b.metadata.court === 'Nejvyšší soud' ? 1 : 0;

    if (aIsSupreme !== bIsSupreme) return bIsSupreme - aIsSupreme;

    const aWeight = a.metadata.weight || 1;
    const bWeight = b.metadata.weight || 1;
    if (Math.abs(aWeight - bWeight) > 0.5) return bWeight - aWeight;

    return b.score - a.score;
  });

  return sorted.slice(0, maxMembers);
}
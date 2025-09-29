interface VectorMatch {
  id: string;
  score: number;
  vector?: number[];
  metadata: {
    type: string;
    case_id?: string;
    section?: string;
    text: string;
    weight?: number;
  };
}

interface Cluster {
  id: number;
  members: VectorMatch[];
  centroid: number[];
  keywords: string[];
  avgWeight: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}

function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vec;
  return vec.map(val => val / magnitude);
}

export function hierarchicalClustering(
  vectors: VectorMatch[],
  minSimilarity: number = 0.70,
  minClusterSize: number = 3
): Cluster[] {
  console.log(`[Clustering] Starting with ${vectors.length} vectors, minSim=${minSimilarity}, minSize=${minClusterSize}`);

  if (vectors.length === 0) return [];

  const clusters: Cluster[] = vectors.map((v, idx) => ({
    id: idx,
    members: [v],
    centroid: v.vector || [],
    keywords: [],
    avgWeight: v.metadata.weight || 1.0
  }));

  let mergeCount = 0;

  while (true) {
    let maxSimilarity = -1;
    let mergeIndices: [number, number] | null = null;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const similarity = cosineSimilarity(clusters[i].centroid, clusters[j].centroid);

        if (similarity > maxSimilarity && similarity >= minSimilarity) {
          maxSimilarity = similarity;
          mergeIndices = [i, j];
        }
      }
    }

    if (!mergeIndices || maxSimilarity < minSimilarity) {
      break;
    }

    const [i, j] = mergeIndices;
    mergeCount++;

    const mergedMembers = [...clusters[i].members, ...clusters[j].members];
    const mergedVectors = mergedMembers.map(m => m.vector || []).filter(v => v.length > 0);
    const newCentroid = calculateCentroid(mergedVectors);
    const avgWeight = mergedMembers.reduce((sum, m) => sum + (m.metadata.weight || 1.0), 0) / mergedMembers.length;

    clusters[i] = {
      id: clusters[i].id,
      members: mergedMembers,
      centroid: normalizeVector(newCentroid),
      keywords: [],
      avgWeight
    };

    clusters.splice(j, 1);

    if (mergeCount % 10 === 0) {
      console.log(`[Clustering] Merged ${mergeCount} times, ${clusters.length} clusters remaining, last sim=${maxSimilarity.toFixed(3)}`);
    }
  }

  const filteredClusters = clusters.filter(c => c.members.length >= minClusterSize);

  console.log(`[Clustering] Final: ${filteredClusters.length} clusters (filtered from ${clusters.length}, merges: ${mergeCount})`);
  console.log(`[Clustering] Cluster sizes:`, filteredClusters.map(c => c.members.length).sort((a, b) => b - a).slice(0, 10));

  return filteredClusters.sort((a, b) => b.members.length - a.members.length);
}

function extractKeywords(texts: string[], topN: number = 10): string[] {
  const stopwords = new Set([
    'a', 'aby', 'ak', 'ako', 'ale', 'alebo', 'and', 'ani', 'ano', 'asi', 'az', 'bez', 'bude',
    'budem', 'budes', 'by', 'byl', 'byla', 'byli', 'bylo', 'být', 'ci', 'clanek', 'clanku', 'clanky',
    'co', 'coz', 'cz', 'dalsi', 'dnes', 'do', 'ho', 'i', 'ja', 'jak', 'jako', 'je', 'jeho', 'jej',
    'jeji', 'jejich', 'jen', 'jeste', 'jeste', 'ji', 'jine', 'jiz', 'jsem', 'jsi', 'jsme', 'jsou',
    'jste', 'k', 'kam', 'kde', 'kdo', 'kdy', 'kdyz', 'ke', 'ktera', 'ktere', 'kteri', 'kterou',
    'ktery', 'kterym', 'kterymi', 'ku', 'ma', 'mate', 'me', 'mezi', 'mi', 'mnou', 'muj', 'muze',
    'my', 'na', 'nad', 'nam', 'nas', 'nasi', 'ne', 'nebo', 'neni', 'nez', 'nic', 'nove', 'novy',
    'o', 'od', 'ode', 'on', 'ona', 'oni', 'ono', 'ony', 'po', 'pod', 'podle', 'pokud', 'pouze',
    'prave', 'pred', 'pres', 'pri', 'pro', 'proc', 'proto', 'protoze', 'prvni', 're', 's', 'se',
    'si', 'sice', 'skoro', 'smie', 'snad', 'so', 'sve', 'svych', 'svym', 'svymi', 'ta', 'tak',
    'take', 'takze', 'tato', 'te', 'tedy', 'tema', 'ten', 'tento', 'teto', 'tim', 'timto', 'tipy',
    'to', 'tohle', 'toho', 'tohoto', 'tom', 'tomto', 'tomuto', 'tu', 'tuto', 'tvuj', 'ty', 'tyto',
    'u', 'up', 'uz', 'v', 've', 'vedle', 'vice', 'vsak', 'vsetko', 'vy', 'vam', 'vas', 'vase',
    'vi', 'vsak', 'z', 'za', 'zatimco', 'ze', 'ze', 'zpet', 'zpravy',
    'má', 'může', 'jsou', 'byl', 'byla', 'bylo', 'byli', 'být', 'že', 'aby', 'pokud', 'když',
    'podle', 'než', 'však', 'již', 'ještě', 'též', 'také', 'není', 'nelze', 'musí', 'měl', 'měla'
  ]);

  const wordCounts = new Map<string, number>();

  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^\wáčďéěíňóřšťúůýž\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w) && !/^\d+$/.test(w));

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

export function enrichClustersWithKeywords(clusters: Cluster[]): Cluster[] {
  console.log(`[Clustering] Extracting keywords for ${clusters.length} clusters...`);

  return clusters.map((cluster, idx) => {
    const texts = cluster.members.map(m => m.metadata.text);
    const keywords = extractKeywords(texts, 10);

    if (idx < 3) {
      console.log(`[Clustering] Cluster ${idx} (${cluster.members.length} members): ${keywords.slice(0, 5).join(', ')}`);
    }

    return {
      ...cluster,
      keywords
    };
  });
}

export async function generateDoctrineNames(
  clusters: Cluster[],
  env: any
): Promise<{ name: string; displayName: string; description: string }[]> {
  console.log(`[Clustering] Generating doctrine names for ${clusters.length} clusters using AI...`);

  const names: { name: string; displayName: string; description: string }[] = [];

  for (let i = 0; i < Math.min(clusters.length, 20); i++) {
    const cluster = clusters[i];

    const sampleTexts = cluster.members
      .slice(0, 5)
      .map(m => m.metadata.text.substring(0, 400))
      .join('\n\n---\n\n');

    const keywords = cluster.keywords.slice(0, 10).join(', ');

    const prompt = `Analyzuj následující vzorky právních textů z clusteru a vygeneruj:

1. Krátký název právního institutu (2-4 slova, snake_case angličtina, např. "consumer_credit_invalidity")
2. Český zobrazovací název (např. "Neplatnost spotřebitelského úvěru")
3. Stručný popis právního institutu (1 věta)

Klíčová slova z clusteru: ${keywords}

Vzorky textů:
${sampleTexts}

Odpověz JSON objektem:
{
  "name": "snake_case_name",
  "displayName": "Český název",
  "description": "Stručný popis"
}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Jsi expert na české právo a právní taxonomii. Odpovídáš vždy validním JSON objektem.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      const data = await response.json() as any;
      const content = data.choices[0].message.content.trim();

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        names.push({
          name: parsed.name || `doctrine_${i + 1}`,
          displayName: parsed.displayName || `Právní institut ${i + 1}`,
          description: parsed.description || 'Automaticky detekovaný právní institut'
        });

        console.log(`[Clustering] Cluster ${i}: "${parsed.displayName}" (${cluster.members.length} members)`);
      } else {
        throw new Error('No JSON found in response');
      }

    } catch (error) {
      console.error(`[Clustering] Failed to generate name for cluster ${i}:`, error);
      names.push({
        name: `auto_doctrine_${i + 1}`,
        displayName: `Právní institut ${i + 1}`,
        description: `Cluster obsahující: ${keywords}`
      });
    }
  }

  return names;
}
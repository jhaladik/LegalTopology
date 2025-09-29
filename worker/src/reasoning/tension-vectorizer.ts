/**
 * Tension Vectorizer - Converts legal tensions into vector search strategies
 * Uses vector arithmetic to navigate the legal topology
 */

import { TensionVectorStrategy } from './legal-tensions';

// Vector math utilities (already exist in the codebase)
export function addVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimension');
  }
  return a.map((val, i) => val + b[i]);
}

export function subtractVectors(a: number[], b: number[]): number[] {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimension');
  }
  return a.map((val, i) => val - b[i]);
}

export function scaleVector(vector: number[], scale: number): number[] {
  return vector.map(val => val * scale);
}

export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

export function combineWeightedVectors(
  vectors: Array<{ vector: number[]; weight: number }>
): number[] {
  if (vectors.length === 0) {
    throw new Error('No vectors to combine');
  }

  const dimension = vectors[0].vector.length;
  let combined = new Array(dimension).fill(0);
  let totalWeight = 0;

  for (const { vector, weight } of vectors) {
    const scaled = scaleVector(vector, weight);
    combined = addVectors(combined, scaled);
    totalWeight += weight;
  }

  // Normalize by total weight
  if (totalWeight > 0) {
    combined = scaleVector(combined, 1 / totalWeight);
  }

  return normalizeVector(combined);
}

/**
 * Cache for tension vectors to avoid repeated embeddings
 */
const VECTOR_CACHE = new Map<string, number[]>();

/**
 * Pre-computed doctrine probe vectors (Czech legal doctrines)
 */
export const DOCTRINE_PROBE_VECTORS: Record<string, string> = {
  // Core doctrines
  vydržení: 'vydržení dobromyslná držba legitimní očekávání časový faktor třicet let deset let faktický výkon práva',
  dobrá_víra: 'dobrá víra dobromyslnost nevěděl nemohl vědět důvodně spoléhal legitimní důvěra',
  bezdůvodné_obohacení: 'bezdůvodné obohacení bez právního důvodu neoprávněný prospěch vydání plnění',
  ochrana_spotřebitele: 'ochrana spotřebitele slabší strana nerovné postavení adhezní smlouva',
  náhrada_škody: 'náhrada škody způsobená škoda zavinění příčinná souvislost',
  neplatnost: 'neplatnost absolutní neplatnost relativní neplatnost rozpor se zákonem dobrými mravy',
  předběžné_opatření: 'předběžné opatření prozatímní úprava hrozící škoda neodkladné',
  služebnost: 'služebnost věcné břemeno právo cesty právo průchodu oprávněný povinný',

  // Property rights
  vlastnické_právo: 'vlastnické právo vlastnictví vlastník držet užívat požívat nakládat vyloučit',
  vlastnictví: 'vlastnictví vlastnické právo vlastník absolutní věcné právo',
  spoluvlastnictví: 'spoluvlastnictví podílové spoluvlastnictví společné jmění',

  // Contracts
  smlouva: 'smlouva smluvní strany závazek plnění protiplnění',
  kupní_smlouva: 'kupní smlouva kupující prodávající kupní cena převod vlastnictví',
  nájemní_smlouva: 'nájem nájemní smlouva pronajímatel nájemce nájemné',
  smlouva_o_dílo: 'smlouva o dílo zhotovitel objednatel dílo cena díla',
  darovací_smlouva: 'darovací smlouva dárce obdarovaný darování bezplatně',

  // Obligations
  závazek: 'závazek dlužník věřitel plnění splnění závazku',
  porušení_smlouvy: 'porušení smlouvy porušení povinnosti prodlení vadné plnění',
  odstoupení: 'odstoupení od smlouvy podstatné porušení zrušení ex tunc',
  výpověď: 'výpověď ukončení výpovědní doba výpovědní důvod',

  // Family law
  manželství: 'manželství manželé společné jmění manželů rozvod',
  vyživovací_povinnost: 'vyživovací povinnost výživné alimenty nezletilé dítě',
  rodičovská_odpovědnost: 'rodičovská odpovědnost péče o dítě výchova zastoupení',

  // Inheritance
  dědictví: 'dědictví dědic zůstavitel pozůstalost závěť intestátní',
  závěť: 'závěť testament zůstavitel dědic odkaz',
  povinný_díl: 'povinný díl nepominutelný dědic zákonný dědický podíl',

  // Torts
  delikt: 'delikt protiprávní čin zavinění škoda náhrada',
  odpovědnost: 'odpovědnost objektivní odpovědnost subjektivní zavinění'
};

/**
 * Convert tension-based strategy to composite vector
 */
export async function createTensionVector(
  strategy: TensionVectorStrategy,
  getEmbedding: (text: string, env: any) => Promise<number[]>,
  env: any
): Promise<number[]> {
  // Create base vector from competing values
  const baseText = strategy.base_terms.join(' ');
  let resultVector = await getCachedEmbedding(baseText, getEmbedding, env);

  // Apply additive modifiers (reinforce certain concepts)
  for (const addTerm of strategy.add_modifiers) {
    const addVector = await getCachedEmbedding(addTerm, getEmbedding, env);
    const scaledAdd = scaleVector(addVector, 0.3); // Don't overwhelm base
    resultVector = addVectors(resultVector, scaledAdd);
  }

  // Apply subtractive modifiers (de-emphasize certain concepts)
  for (const subTerm of strategy.subtract_modifiers) {
    const subVector = await getCachedEmbedding(subTerm, getEmbedding, env);
    const scaledSub = scaleVector(subVector, 0.2); // Gentle subtraction
    resultVector = subtractVectors(resultVector, scaledSub);
  }

  return normalizeVector(resultVector);
}

/**
 * Create composite search vector from multiple tension strategies
 */
export async function createCompositeSearchVector(
  strategies: TensionVectorStrategy[],
  getEmbedding: (text: string, env: any) => Promise<number[]>,
  env: any
): Promise<number[]> {
  if (strategies.length === 0) {
    throw new Error('No strategies provided');
  }

  const vectors = await Promise.all(
    strategies.map(async (strategy) => {
      const vector = await createTensionVector(strategy, getEmbedding, env);
      return {
        vector,
        weight: strategy.weight
      };
    })
  );

  return combineWeightedVectors(vectors);
}

/**
 * Create search vectors for specific doctrines
 */
export async function createDoctrineVector(
  doctrine: string,
  weight: number,
  getEmbedding: (text: string, env: any) => Promise<number[]>,
  env: any
): Promise<{ vector: number[]; weight: number }> {
  // Use predefined probe text if available, otherwise use doctrine name itself
  const probeText = DOCTRINE_PROBE_VECTORS[doctrine] || doctrine;

  if (!probeText) {
    console.warn(`Unknown doctrine: ${doctrine}, using doctrine name as search term`);
  }

  const vector = await getCachedEmbedding(probeText, getEmbedding, env);

  return {
    vector: normalizeVector(vector),
    weight
  };
}

/**
 * Cached embedding helper
 */
async function getCachedEmbedding(
  text: string,
  getEmbedding: (text: string, env: any) => Promise<number[]>,
  env: any
): Promise<number[]> {
  const cacheKey = `embed:${text}`;

  if (VECTOR_CACHE.has(cacheKey)) {
    return VECTOR_CACHE.get(cacheKey)!;
  }

  const vector = await getEmbedding(text, env);
  VECTOR_CACHE.set(cacheKey, vector);

  // Limit cache size
  if (VECTOR_CACHE.size > 100) {
    const firstKey = VECTOR_CACHE.keys().next().value;
    VECTOR_CACHE.delete(firstKey);
  }

  return vector;
}

/**
 * Hybrid search combining tension vectors and traditional queries
 */
export interface HybridSearchStrategy {
  tension_vector?: {
    vector: number[];
    weight: number;
  };
  doctrine_vectors?: Array<{
    vector: number[];
    weight: number;
  }>;
  keyword_vector?: {
    vector: number[];
    weight: number;
  };
}

/**
 * Create hybrid search strategy combining tensions, doctrines, and keywords
 */
export async function createHybridSearchStrategy(
  tensionStrategies: TensionVectorStrategy[],
  doctrines: Array<{ doctrine: string; weight: number }>,
  keywords: string | null,
  getEmbedding: (text: string, env: any) => Promise<number[]>,
  env: any
): Promise<HybridSearchStrategy> {
  const result: HybridSearchStrategy = {};

  // Create tension-based vector if strategies exist
  if (tensionStrategies.length > 0) {
    const tensionVector = await createCompositeSearchVector(
      tensionStrategies,
      getEmbedding,
      env
    );
    result.tension_vector = {
      vector: tensionVector,
      weight: 0.5 // Primary weight to tensions
    };
  }

  // Create doctrine vectors
  if (doctrines.length > 0) {
    result.doctrine_vectors = await Promise.all(
      doctrines.map(d => createDoctrineVector(d.doctrine, d.weight, getEmbedding, env))
    );
  }

  // Add keyword vector as fallback
  if (keywords) {
    const keywordVector = await getCachedEmbedding(keywords, getEmbedding, env);
    result.keyword_vector = {
      vector: normalizeVector(keywordVector),
      weight: 0.2 // Lower weight for keywords
    };
  }

  return result;
}

/**
 * Execute hybrid search with multiple vector strategies
 */
export async function executeHybridSearch(
  strategy: HybridSearchStrategy,
  vectorIndex: any,
  topK: number = 20
): Promise<any[]> {
  const searchPromises = [];

  // Search with tension vector
  if (strategy.tension_vector) {
    searchPromises.push(
      vectorIndex.query(strategy.tension_vector.vector, {
        topK: Math.floor(topK * strategy.tension_vector.weight),
        returnMetadata: true
      }).then((results: any) => ({
        results: results.matches,
        weight: strategy.tension_vector!.weight,
        source: 'tension'
      }))
    );
  }

  // Search with doctrine vectors
  if (strategy.doctrine_vectors) {
    for (const docVector of strategy.doctrine_vectors) {
      searchPromises.push(
        vectorIndex.query(docVector.vector, {
          topK: Math.floor(topK * docVector.weight * 0.5),
          returnMetadata: true
        }).then((results: any) => ({
          results: results.matches,
          weight: docVector.weight,
          source: 'doctrine'
        }))
      );
    }
  }

  // Search with keyword vector
  if (strategy.keyword_vector) {
    searchPromises.push(
      vectorIndex.query(strategy.keyword_vector.vector, {
        topK: Math.floor(topK * strategy.keyword_vector.weight),
        returnMetadata: true
      }).then((results: any) => ({
        results: results.matches,
        weight: strategy.keyword_vector!.weight,
        source: 'keyword'
      }))
    );
  }

  // Execute all searches in parallel
  const searchResults = await Promise.all(searchPromises);

  // Combine and deduplicate results
  const combinedResults = new Map<string, any>();

  for (const { results, weight, source } of searchResults) {
    for (const match of results) {
      const existingMatch = combinedResults.get(match.id);

      if (existingMatch) {
        // Update with weighted average
        existingMatch.score = (existingMatch.score * existingMatch.weight + match.score * weight) /
                              (existingMatch.weight + weight);
        existingMatch.weight += weight;
        existingMatch.sources.add(source);
      } else {
        combinedResults.set(match.id, {
          ...match,
          weight,
          sources: new Set([source])
        });
      }
    }
  }

  // Sort by weighted score
  const finalResults = Array.from(combinedResults.values())
    .sort((a, b) => (b.score * b.weight) - (a.score * a.weight))
    .slice(0, topK);

  // Convert sources Set to array
  finalResults.forEach(r => {
    r.sources = Array.from(r.sources);
  });

  return finalResults;
}

/**
 * Analyze search results to understand which tensions led to which findings
 */
export function analyzeSearchProvenance(
  results: any[],
  originalTensions: string[]
): Record<string, any> {
  const provenance: Record<string, any> = {
    tension_contributions: {},
    doctrine_contributions: {},
    dominant_source: '',
    tension_alignment: {}
  };

  // Count contributions by source
  const sourceCounts: Record<string, number> = {};
  for (const result of results) {
    for (const source of result.sources || []) {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }
  }

  // Determine dominant source
  provenance.dominant_source = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';

  // Map results back to original tensions
  for (const tension of originalTensions) {
    const relevantResults = results.filter(r =>
      r.sources?.includes('tension') &&
      r.metadata?.text?.toLowerCase().includes(tension.toLowerCase())
    );

    provenance.tension_contributions[tension] = relevantResults.length;
    provenance.tension_alignment[tension] = relevantResults.length > 0 ? 'aligned' : 'weak';
  }

  return provenance;
}
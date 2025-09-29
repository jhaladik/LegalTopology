import { loadDiscoveredDoctrines } from '../services/doctrine-loader';
import { Env, getEmbedding } from '../embedding/openai-client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface TopologyQueryRequest {
  question: string;
  topK?: number;
  explore_modifiers?: boolean;
}

interface DoctrineCluster {
  doctrine_name: string;
  confidence: number;
  top_sections: any[];
  reasoning: string;
}

function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(val => val / magnitude);
}

function addVectors(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

const CONTEXT_PATTERNS = {
  unauthorized: {
    keywords: ['bez souhlasu', 'bez mého souhlasu', 'neoprávněn', 'unauthorized', 'bez povolení', 'nesouhlas', 'bez vědomí'],
    modifier_query: 'neoprávněný bez souhlasu bez právního důvodu',
  },
  profit_income: {
    keywords: ['zisk', 'profit', 'příjem', 'výnos', 'vydělává', 'obohacení', ' kč', 'korun'],
    doctrines: {
      consensual: 'podíl na zisku společníci partnerství',
      unauthorized: 'bezdůvodné obohacení neoprávněné vydání prospěchu'
    }
  },
  lease_rental: {
    keywords: ['nájem', 'pronájem', 'podnájem', 'nájemce', 'pronajímatel'],
    modifier_query: 'nájem pronájem podnájem'
  },
  time_duration: {
    keywords: ['let', 'rok', 'měsíc', 'léta', 'dlouhodobě'],
    doctrines: {
      adverse_possession: 'vydržení dlouhodobé užívání získání práva',
      prescription: 'promlčení zánik nároku uplynulá doba'
    }
  }
};

function detectContextPatterns(question: string): {
  has_unauthorized: boolean;
  has_profit: boolean;
  has_lease: boolean;
  has_time_element: boolean;
  suggested_modifiers: string[];
} {
  const lowerQ = question.toLowerCase();

  const has_unauthorized = CONTEXT_PATTERNS.unauthorized.keywords.some(kw => lowerQ.includes(kw));
  const has_profit = CONTEXT_PATTERNS.profit_income.keywords.some(kw => lowerQ.includes(kw));
  const has_lease = CONTEXT_PATTERNS.lease_rental.keywords.some(kw => lowerQ.includes(kw));
  const has_time_element = CONTEXT_PATTERNS.time_duration.keywords.some(kw => lowerQ.includes(kw));

  const suggested_modifiers: string[] = [];

  if (has_unauthorized) {
    suggested_modifiers.push(CONTEXT_PATTERNS.unauthorized.modifier_query);
  }
  if (has_lease) {
    suggested_modifiers.push(CONTEXT_PATTERNS.lease_rental.modifier_query);
  }

  return {
    has_unauthorized,
    has_profit,
    has_lease,
    has_time_element,
    suggested_modifiers
  };
}

export async function queryTopology(
  request: Request,
  env: Env & { VECTORIZE: any; DB?: D1Database },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: TopologyQueryRequest = await request.json();
    const { question, topK = 15, explore_modifiers = true } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Topology Query] Question:', question);

    const patterns = detectContextPatterns(question);
    console.log('[Topology Query] Detected patterns:', patterns);

    const baseEmbedding = await getEmbedding(question, env);

    const baseResults = await env.VECTORIZE.query(baseEmbedding, {
      topK: Math.min(topK * 3, 50),
      returnMetadata: true,
      returnValues: false
    });

    const weightedBaseResults = baseResults.matches.map((m: any) => ({
      ...m,
      raw_score: m.score,
      score: m.score * (m.metadata.weight || 1.0),
      weighted_score: m.score * (m.metadata.weight || 1.0)
    })).sort((a: any, b: any) => b.weighted_score - a.weighted_score).slice(0, topK * 2);

    baseResults.matches = weightedBaseResults;

    console.log('[Topology Query] Base search top 3 (weighted):', weightedBaseResults.slice(0, 3).map((m: any) => `§${m.metadata.section} (raw:${m.raw_score.toFixed(3)} weighted:${m.weighted_score.toFixed(3)})`).join(', '));

    let doctrine_clusters: DoctrineCluster[] = [];

    const discoveredDoctrines = env.DB ? await loadDiscoveredDoctrines(env.DB) : [];
    console.log(`[Topology Query] Loaded ${discoveredDoctrines.length} discovered doctrines`);

    const DOCTRINE_PROBES = discoveredDoctrines.length > 0
      ? discoveredDoctrines.map(d => ({
          name: d.name,
          query: `${d.display_name} ${d.description}`,
          threshold: 0.54
        }))
      : [
          {
            name: 'unjust_enrichment',
            query: 'bezdůvodné obohacení neoprávněný zisk bez právního důvodu vydání prospěchu',
            threshold: 0.57
          },
          {
            name: 'profit_sharing_partnership',
            query: 'podíl na zisku společníci partnerství rozdělení výnosů dohoda smlouva',
            threshold: 0.54
          },
          {
            name: 'adverse_possession',
            query: 'vydržení dlouhodobé užívání nabytí vlastnictví držba',
            threshold: 0.50
          },
          {
            name: 'prescription',
            query: 'promlčení zánik nároku uplynulá doba',
            threshold: 0.50
          }
        ];

    const unauthorizedEmbedding = await getEmbedding('bez souhlasu neoprávněný bez právního důvodu', env);
    const unauthorizedVector = [...baseEmbedding];
    for (let i = 0; i < unauthorizedEmbedding.length; i++) {
      unauthorizedVector[i] = (unauthorizedVector[i] + unauthorizedEmbedding[i]) / 2;
    }
    const unauthorizedProbe = await env.VECTORIZE.query(normalizeVector(unauthorizedVector), { topK: 10, returnMetadata: true });
    const weightedUnauthorizedMatches = unauthorizedProbe.matches.map((m: any) => ({
      ...m,
      weighted_score: m.score * (m.metadata.weight || 1.0)
    })).sort((a: any, b: any) => b.weighted_score - a.weighted_score).slice(0, 3);
    const unauthorizedScore = weightedUnauthorizedMatches.reduce((sum: number, m: any) => sum + m.weighted_score, 0) / weightedUnauthorizedMatches.length;
    const hasUnauthorizedContext = unauthorizedScore > 0.52;

    console.log(`[Topology Query] Unauthorized context check: ${unauthorizedScore.toFixed(3)} -> ${hasUnauthorizedContext}`);

    for (const probe of DOCTRINE_PROBES) {
      const probeEmbedding = await getEmbedding(probe.query, env);

      let queryVector = [...baseEmbedding];
      for (let i = 0; i < probeEmbedding.length; i++) {
        queryVector[i] = (queryVector[i] + probeEmbedding[i]) / 2;
      }
      queryVector = normalizeVector(queryVector);

      const probeResults = await env.VECTORIZE.query(queryVector, {
        topK: 15,
        returnMetadata: true
      });

      const weightedProbeResults = probeResults.matches.map((m: any) => ({
        ...m,
        raw_score: m.score,
        score: m.score * (m.metadata.weight || 1.0),
        weighted_score: m.score * (m.metadata.weight || 1.0)
      })).sort((a: any, b: any) => b.weighted_score - a.weighted_score).slice(0, 5);

      probeResults.matches = weightedProbeResults;

      const avgScore = weightedProbeResults.reduce((sum: number, m: any) => sum + m.weighted_score, 0) / weightedProbeResults.length;

      console.log(`[Topology Query] Probe "${probe.name}": avg_score=${avgScore.toFixed(3)}, threshold=${probe.threshold}`);

      if (probe.name === 'unjust_enrichment' && !hasUnauthorizedContext) {
        console.log(`[Topology Query] Skipping enrichment - no unauthorized context detected`);
        continue;
      }

      if (avgScore >= probe.threshold) {
        doctrine_clusters.push({
          doctrine_name: probe.name,
          confidence: Math.min((avgScore / probe.threshold), 1.0),
          top_sections: probeResults.matches.map((m: any) => ({
            section: m.metadata.section,
            score: m.score,
            text: m.metadata.text,
            type: m.metadata.type
          })),
          reasoning: `Vector similarity to ${probe.name} doctrine: ${(avgScore * 100).toFixed(1)}%`
        });
      }
    }

    console.log('[Topology Query] Doctrine clusters found:', doctrine_clusters.map(d => `${d.doctrine_name} (${(d.confidence * 100).toFixed(0)}%)`).join(', '));

    doctrine_clusters = doctrine_clusters.sort((a, b) => b.confidence - a.confidence);

    if (false && patterns.has_profit && patterns.has_unauthorized) {
      console.log('[Topology Query] Profit + Unauthorized detected → Exploring enrichment doctrine');

      const enrichmentQuery = patterns.has_lease
        ? 'bezdůvodné obohacení neoprávněný zisk z pronájmu vydání prospěchu'
        : 'bezdůvodné obohacení neoprávněný bez právního důvodu vydání';

      const enrichmentEmbedding = await getEmbedding(enrichmentQuery, env);
      const enrichmentResults = await env.VECTORIZE.query(enrichmentEmbedding, {
        topK: 30,
        returnMetadata: true
      });

      const weightedEnrichmentResults = enrichmentResults.matches.map((m: any) => ({
        ...m,
        weighted_score: m.score * (m.metadata.weight || 1.0)
      })).sort((a: any, b: any) => b.weighted_score - a.weighted_score);

      doctrine_clusters.push({
        doctrine_name: 'unjust_enrichment',
        confidence: 0.85,
        top_sections: weightedEnrichmentResults.slice(0, 5).map((m: any) => ({
          section: m.metadata.section,
          score: m.weighted_score,
          text: m.metadata.text,
          type: m.metadata.type
        })),
        reasoning: 'Unauthorized profit detected → unjust enrichment doctrine (§2991-3004) applies'
      });

      const partnershipEmbedding = await getEmbedding('podíl na zisku společníci rozdělení výnosů', env);
      const partnershipResults = await env.VECTORIZE.query(partnershipEmbedding, {
        topK: 30,
        returnMetadata: true
      });

      const weightedPartnershipResults = partnershipResults.matches.map((m: any) => ({
        ...m,
        weighted_score: m.score * (m.metadata.weight || 1.0)
      })).sort((a: any, b: any) => b.weighted_score - a.weighted_score);

      doctrine_clusters.push({
        doctrine_name: 'profit_sharing_partnership',
        confidence: 0.15,
        top_sections: weightedPartnershipResults.slice(0, 5).map((m: any) => ({
          section: m.metadata.section,
          score: m.weighted_score,
          text: m.metadata.text,
          type: m.metadata.type
        })),
        reasoning: 'Alternative doctrine (consensual profit sharing) - less likely given unauthorized context'
      });

    } else if (patterns.has_profit && !patterns.has_unauthorized) {
      console.log('[Topology Query] Profit without unauthorized → Partnership doctrine more likely');

      const partnershipEmbedding = await getEmbedding('podíl na zisku společníci rozdělení výnosů', env);
      const partnershipResults = await env.VECTORIZE.query(partnershipEmbedding, {
        topK: 30,
        returnMetadata: true
      });

      const weightedPartnershipResults = partnershipResults.matches.map((m: any) => ({
        ...m,
        weighted_score: m.score * (m.metadata.weight || 1.0)
      })).sort((a: any, b: any) => b.weighted_score - a.weighted_score);

      doctrine_clusters.push({
        doctrine_name: 'profit_sharing_partnership',
        confidence: 0.80,
        top_sections: weightedPartnershipResults.slice(0, 5).map((m: any) => ({
          section: m.metadata.section,
          score: m.weighted_score,
          text: m.metadata.text,
          type: m.metadata.type
        })),
        reasoning: 'Consensual profit sharing - no unauthorized activity mentioned'
      });
    }

    if (patterns.has_time_element && patterns.has_unauthorized) {
      console.log('[Topology Query] Time + Unauthorized → Checking adverse possession vs prescription');

      const adversePossessionEmbedding = await getEmbedding('vydržení dlouhodobé užívání nabytí vlastnictví držba', env);
      const adversePossessionResults = await env.VECTORIZE.query(adversePossessionEmbedding, {
        topK: 15,
        returnMetadata: true
      });

      const weightedAdverseResults = adversePossessionResults.matches.map((m: any) => ({
        ...m,
        weighted_score: m.score * (m.metadata.weight || 1.0)
      })).sort((a: any, b: any) => b.weighted_score - a.weighted_score);

      doctrine_clusters.push({
        doctrine_name: 'adverse_possession',
        confidence: 0.70,
        top_sections: weightedAdverseResults.slice(0, 5).map((m: any) => ({
          section: m.metadata.section,
          score: m.weighted_score,
          text: m.metadata.text,
          type: m.metadata.type
        })),
        reasoning: 'Time + use pattern → vydržení (adverse possession) §1089+ may apply'
      });
    }

    let context_enhanced_results = null;
    if (explore_modifiers && patterns.suggested_modifiers.length > 0) {
      console.log('[Topology Query] Enhancing with modifiers:', patterns.suggested_modifiers);

      let enhancedVector = [...baseEmbedding];
      for (const modifier of patterns.suggested_modifiers) {
        const modEmbedding = await getEmbedding(modifier, env);
        enhancedVector = addVectors(enhancedVector, modEmbedding);
      }
      enhancedVector = normalizeVector(enhancedVector);

      const enhancedResults = await env.VECTORIZE.query(enhancedVector, {
        topK: topK * 2,
        returnMetadata: true
      });

      const weightedEnhancedResults = enhancedResults.matches.map((m: any) => ({
        ...m,
        weighted_score: m.score * (m.metadata.weight || 1.0)
      })).sort((a: any, b: any) => b.weighted_score - a.weighted_score).slice(0, topK);

      context_enhanced_results = {
        modifiers_applied: patterns.suggested_modifiers,
        top_sections: weightedEnhancedResults.map((m: any) => ({
          section: m.metadata.section,
          score: m.weighted_score,
          text: m.metadata.text,
          type: m.metadata.type
        }))
      };
    }

    return new Response(
      JSON.stringify({
        question,
        patterns_detected: patterns,

        base_search: {
          query: question,
          top_sections: baseResults.matches.slice(0, topK).map((m: any) => ({
            section: m.metadata.section,
            score: m.score,
            text: m.metadata.text,
            type: m.metadata.type
          }))
        },

        context_enhanced_search: context_enhanced_results,

        doctrine_clusters,

        topology_analysis: {
          method: 'vector_probing',
          probes_tested: DOCTRINE_PROBES.map(p => p.name),
          primary_doctrine: doctrine_clusters.length > 0
            ? doctrine_clusters.sort((a, b) => b.confidence - a.confidence)[0].doctrine_name
            : 'general_search',
          confidence: doctrine_clusters.length > 0
            ? doctrine_clusters.sort((a, b) => b.confidence - a.confidence)[0].confidence
            : 0.5,
          competing_doctrines: doctrine_clusters.length > 1,
          requires_disambiguation: doctrine_clusters.filter(d => d.confidence > 0.3).length > 1
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in topology query:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
import { Env, getEmbedding } from '../embedding/openai-client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ExploreRequest {
  base_concept: string;
  add_modifiers?: string[];
  subtract_modifiers?: string[];
  topK?: number;
}

function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(val => val / magnitude);
}

function addVectors(a: number[], b: number[]): number[] {
  return a.map((val, i) => val + b[i]);
}

function subtractVectors(a: number[], b: number[]): number[] {
  return a.map((val, i) => val - b[i]);
}

export async function exploreTopology(
  request: Request,
  env: Env & { VECTORIZE: any },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: ExploreRequest = await request.json();
    const { base_concept, add_modifiers = [], subtract_modifiers = [], topK = 10 } = body;

    if (!base_concept) {
      return new Response(
        JSON.stringify({ error: 'base_concept is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Explore Topology]', {
      base: base_concept,
      add: add_modifiers,
      subtract: subtract_modifiers
    });

    const baseEmbedding = await getEmbedding(base_concept, env);

    const addEmbeddings = await Promise.all(
      add_modifiers.map(mod => getEmbedding(mod, env))
    );

    const subtractEmbeddings = await Promise.all(
      subtract_modifiers.map(mod => getEmbedding(mod, env))
    );

    let resultVector = [...baseEmbedding];

    for (const addVec of addEmbeddings) {
      resultVector = addVectors(resultVector, addVec);
    }

    for (const subVec of subtractEmbeddings) {
      resultVector = subtractVectors(resultVector, subVec);
    }

    resultVector = normalizeVector(resultVector);

    const baseResults = await env.VECTORIZE.query(baseEmbedding, {
      topK: topK,
      returnMetadata: true
    });

    const modifiedResults = await env.VECTORIZE.query(resultVector, {
      topK: topK,
      returnMetadata: true
    });

    const experiments: any[] = [];

    if (add_modifiers.length > 0) {
      for (const mod of add_modifiers) {
        const modEmbedding = await getEmbedding(mod, env);
        const modResults = await env.VECTORIZE.query(modEmbedding, {
          topK: 5,
          returnMetadata: true
        });
        experiments.push({
          query: mod,
          top_sections: modResults.matches.slice(0, 5).map((m: any) => ({
            section: m.metadata.section,
            score: m.score,
            text: m.metadata.text?.substring(0, 150)
          }))
        });
      }
    }

    if (subtract_modifiers.length > 0) {
      for (const mod of subtract_modifiers) {
        const modEmbedding = await getEmbedding(mod, env);
        const modResults = await env.VECTORIZE.query(modEmbedding, {
          topK: 5,
          returnMetadata: true
        });
        experiments.push({
          query: mod,
          top_sections: modResults.matches.slice(0, 5).map((m: any) => ({
            section: m.metadata.section,
            score: m.score,
            text: m.metadata.text?.substring(0, 150)
          }))
        });
      }
    }

    const baseTopSections = baseResults.matches.map((m: any) => ({
      section: m.metadata.section,
      score: m.score,
      text: m.metadata.text,
      type: m.metadata.type
    }));

    const modifiedTopSections = modifiedResults.matches.map((m: any) => ({
      section: m.metadata.section,
      score: m.score,
      text: m.metadata.text,
      type: m.metadata.type
    }));

    const baseSections = new Set(baseTopSections.map((s: any) => s.section));
    const modifiedSections = new Set(modifiedTopSections.map((s: any) => s.section));

    const disappeared = baseTopSections.filter((s: any) => !modifiedSections.has(s.section));
    const appeared = modifiedTopSections.filter((s: any) => !baseSections.has(s.section));
    const stayed = baseTopSections.filter((s: any) => modifiedSections.has(s.section));

    const vector_operation = [
      base_concept,
      ...add_modifiers.map(m => `+ ${m}`),
      ...subtract_modifiers.map(m => `- ${m}`)
    ].join(' ');

    return new Response(
      JSON.stringify({
        vector_operation,
        base_concept,
        add_modifiers,
        subtract_modifiers,

        base_query_results: {
          query: base_concept,
          top_sections: baseTopSections.slice(0, topK)
        },

        modified_query_results: {
          query: vector_operation,
          top_sections: modifiedTopSections.slice(0, topK)
        },

        topology_shift: {
          disappeared: disappeared.map((s: any) => ({
            section: s.section,
            base_score: s.score,
            text: s.text?.substring(0, 200)
          })),
          appeared: appeared.map((s: any) => ({
            section: s.section,
            modified_score: s.score,
            text: s.text?.substring(0, 200)
          })),
          stayed: stayed.map((s: any) => {
            const modifiedMatch = modifiedTopSections.find((m: any) => m.section === s.section);
            return {
              section: s.section,
              base_score: s.score,
              modified_score: modifiedMatch?.score,
              score_delta: modifiedMatch ? (modifiedMatch.score - s.score) : 0,
              text: s.text?.substring(0, 200)
            };
          })
        },

        individual_modifiers: experiments,

        analysis: {
          total_base_results: baseResults.matches.length,
          total_modified_results: modifiedResults.matches.length,
          sections_disappeared: disappeared.length,
          sections_appeared: appeared.length,
          sections_stayed: stayed.length,
          topology_shift_magnitude: (disappeared.length + appeared.length) / topK
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error exploring topology:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
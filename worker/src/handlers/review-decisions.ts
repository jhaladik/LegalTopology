import { Env } from '../types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Review decision relevance for synthesis results
 * Gets full text from Vectorize for each decision ID
 */
export async function reviewDecisions(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await request.json() as {
      decision_ids: string[];
      question?: string;
      tensions?: string[];
    };

    const { decision_ids, question, tensions } = body;

    if (!decision_ids || decision_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Decision IDs required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Review Decisions] Fetching ${decision_ids.length} decisions from Vectorize`);

    // Fetch each decision from Vectorize by ID
    const decisions = await Promise.all(
      decision_ids.map(async (id) => {
        try {
          // Query Vectorize by ID
          const results = await env.VECTORIZE.getByIds(
            'czech-legal-topology',
            [id]
          );

          if (!results.ids || results.ids.length === 0) {
            return {
              id,
              found: false,
              error: 'Not found in Vectorize'
            };
          }

          const vector = results.vectors[0];
          const metadata = vector?.metadata || {};

          return {
            id,
            found: true,
            case_id: metadata.case_id || id,
            court: metadata.court || 'Unknown',
            weight: metadata.weight || 1.0,
            text: metadata.text || '',
            pravni_veta: metadata.pravni_veta || '',
            sections_referenced: metadata.sections_referenced || [],
            type: metadata.type || 'judicial',
            year: metadata.year,
            text_length: metadata.text?.length || 0
          };
        } catch (error) {
          console.error(`[Review Decisions] Error fetching ${id}:`, error);
          return {
            id,
            found: false,
            error: String(error)
          };
        }
      })
    );

    // Analyze relevance if question and tensions provided
    let relevanceAnalysis = null;
    if (question && tensions) {
      relevanceAnalysis = decisions.map(d => {
        if (!d.found || !d.text) return { id: d.id, relevance: 'unknown' };

        const text = d.text.toLowerCase();
        const relevantTensions = tensions.filter(t =>
          text.includes(t.toLowerCase())
        );

        return {
          id: d.id,
          case_id: d.case_id,
          relevant_tensions: relevantTensions,
          has_tension_keywords: relevantTensions.length > 0,
          text_preview: d.text.substring(0, 500)
        };
      });
    }

    const summary = {
      total_requested: decision_ids.length,
      found: decisions.filter(d => d.found).length,
      not_found: decisions.filter(d => !d.found).length,
      average_text_length: Math.round(
        decisions
          .filter(d => d.found && d.text_length)
          .reduce((sum, d) => sum + d.text_length, 0) /
        decisions.filter(d => d.found).length
      )
    };

    return new Response(
      JSON.stringify({
        summary,
        decisions: decisions.filter(d => d.found),
        not_found: decisions.filter(d => !d.found).map(d => d.id),
        relevance_analysis: relevanceAnalysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Review Decisions] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
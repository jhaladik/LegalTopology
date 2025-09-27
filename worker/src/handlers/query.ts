import { Env, getEmbedding } from '../embedding/openai-client';
import { inferQueryContext } from '../classification/legal-classifier';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface QueryRequest {
  question: string;
  topK?: number;
  filter?: {
    type?: 'statute' | 'judicial';
    section?: string;
    case_id?: string;
    court?: string;
  };
}

interface WeightedMatch {
  id: string;
  score: number;
  weighted_score: number;
  metadata: any;
}

export async function queryTopology(
  request: Request,
  env: Env & { VECTORIZE: any },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: QueryRequest = await request.json();
    const { question, topK = 20, filter } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queryEmbedding = await getEmbedding(question, env);

    const inferredContext = inferQueryContext(question);

    const queryOptions: any = {
      topK: topK,
      returnMetadata: true
    };

    console.log('Query context inferred:', inferredContext);
    console.log('Applied filter:', queryOptions.filter);

    const results = await env.VECTORIZE.query(queryEmbedding, queryOptions);

    const statutes = results.matches.filter((m: any) => m.metadata?.type === 'statute');
    const judicial = results.matches.filter((m: any) => m.metadata?.type === 'judicial');

    const weightedResults: WeightedMatch[] = results.matches
      .map((match: any) => ({
        id: match.id,
        score: match.score,
        weighted_score: match.score * (match.metadata?.weight || 1.0),
        metadata: match.metadata
      }))
      .sort((a: WeightedMatch, b: WeightedMatch) => b.weighted_score - a.weighted_score);

    return new Response(
      JSON.stringify({
        query: question,
        inferred_context: inferredContext,
        applied_filter: queryOptions.filter,
        total_results: results.matches.length,
        results: {
          all: weightedResults.slice(0, 10),
          statutes: statutes.slice(0, 5),
          judicial: judicial.slice(0, 5)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error querying topology:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
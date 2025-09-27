import { Env } from '../embedding/openai-client';
import { calculateDecisionWeight } from '../weights/calculator';

export async function recomputeWeights(
  request: Request,
  env: Env & { VECTORIZE: any },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { case_ids } = body;

    if (!case_ids || !Array.isArray(case_ids)) {
      return new Response(
        JSON.stringify({ error: 'case_ids array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updated: string[] = [];

    for (const caseId of case_ids) {
      const vectors = await env.VECTORIZE.query([], {
        filter: { case_id: caseId },
        returnMetadata: true,
        topK: 1000
      });

      if (vectors.matches && vectors.matches.length > 0) {
        const firstMatch = vectors.matches[0];
        const metadata = firstMatch.metadata;

        const newWeight = calculateDecisionWeight(metadata);

        for (const match of vectors.matches) {
          const updatedMetadata = {
            ...match.metadata,
            weight: newWeight,
            weight_updated_at: new Date().toISOString()
          };

          await env.VECTORIZE.upsert([
            {
              id: match.id,
              values: match.vector || [],
              metadata: updatedMetadata
            }
          ]);
        }

        updated.push(caseId);
      }
    }

    return new Response(
      JSON.stringify({
        status: 'completed',
        updated_cases: updated,
        count: updated.length
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error recomputing weights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
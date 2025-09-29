import { Env } from '../embedding/openai-client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function getDecision(
  request: Request,
  env: Env & { DB: D1Database },
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const caseId = decodeURIComponent(pathParts[pathParts.length - 1]);

  if (!caseId) {
    return new Response(
      JSON.stringify({ error: 'Case ID required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const decision = await env.DB
      .prepare('SELECT * FROM decisions WHERE case_id = ?')
      .bind(caseId)
      .first();

    if (!decision) {
      return new Response(
        JSON.stringify({ error: 'Decision not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsedDecision = {
      ...decision,
      sections_referenced: decision.sections_referenced
        ? JSON.parse(decision.sections_referenced as string)
        : []
    };

    return new Response(
      JSON.stringify(parsedDecision),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Get Decision] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

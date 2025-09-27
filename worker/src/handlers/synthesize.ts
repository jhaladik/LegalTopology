import { Env } from '../embedding/openai-client';
import { inferQueryContext } from '../classification/legal-classifier';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface SynthesisRequest {
  question: string;
  facts?: Record<string, any>;
  topK?: number;
}

export async function synthesizeInterpretation(
  request: Request,
  env: Env & { VECTORIZE: any; OPENAI_API_KEY: string },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: SynthesisRequest = await request.json();
    const { question, facts, topK = 10 } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { getEmbedding } = await import('../embedding/openai-client');
    const queryEmbedding = await getEmbedding(question, env);

    const inferredContext = inferQueryContext(question);

    const queryOptions: any = {
      topK: inferredContext ? topK * 2 : topK,
      returnMetadata: true
    };

    if (inferredContext) {
      queryOptions.filter = { legal_framework: inferredContext };
      console.log('Synthesis using context filter:', inferredContext);
    }

    const results = await env.VECTORIZE.query(queryEmbedding, queryOptions);

    const statutes = results.matches
      .filter((m: any) => m.metadata?.type === 'statute' || m.metadata?.type === 'civil_code')
      .slice(0, 5);

    const cases = results.matches
      .filter((m: any) => m.metadata?.type === 'judicial')
      .slice(0, 5);

    const statuteContext = statutes
      .map((s: any) => `§${s.metadata.section}: ${s.metadata.text}`)
      .join('\n\n');

    const caseContext = cases.length > 0
      ? cases
          .map((c: any) =>
            `Case ${c.metadata.case_id} (weight: ${c.metadata.weight}): ${c.metadata.text}`
          )
          .join('\n\n')
      : 'No relevant case law found yet.';

    const factsContext = facts
      ? `\n\nClient Facts:\n${JSON.stringify(facts, null, 2)}`
      : '';

    const isCzech = /[čďěňřšťůžá]/i.test(question);

    const systemPrompt = isCzech
      ? `Jste expert na české občanské právo. Analyzujte poskytnutá ustanovení zákonů a judikaturu k zodpovězení právních otázek.

Instrukce:
1. Začněte zákonným základem (co říká zákon)
2. Uveďte soudní výklady (jak to soudy aplikovaly)
3. Aplikujte na konkrétní skutečnosti, pokud jsou uvedeny
4. Poskytněte hodnocení míry jistoty
5. Jasně vysvětlete své úvahy

Buďte přesní, citujte paragrafy a tam, kde je to vhodné, uveďte nejistotu.`
      : `You are an expert in Czech civil law. Analyze the provided statutory provisions and case law to answer legal questions.

Instructions:
1. Start with the statutory foundation (what the law says)
2. Note any judicial interpretations (how courts have applied it)
3. Apply to the specific facts if provided
4. Provide a confidence assessment
5. Explain your reasoning clearly

Be precise, cite sections, and indicate uncertainty where appropriate.`;

    const userPrompt = isCzech
      ? `ZÁKONNÉ USTANOVENÍ:
${statuteContext}

JUDIKATURA:
${caseContext}
${factsContext}

OTÁZKA:
${question}

Poskytněte komplexní právní analýzu.`
      : `STATUTORY LAW:
${statuteContext}

CASE LAW:
${caseContext}
${factsContext}

QUESTION:
${question}

Provide a comprehensive legal analysis.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const completion = await response.json() as any;
    const analysis = completion.choices[0].message.content;

    return new Response(
      JSON.stringify({
        question,
        facts,
        statutory_foundation: statutes.map((s: any) => ({
          section: `§${s.metadata.section}`,
          text: s.metadata.text,
          relevance: s.score
        })),
        case_law: cases.map((c: any) => ({
          case_id: c.metadata.case_id,
          weight: c.metadata.weight,
          text: c.metadata.text,
          relevance: c.score
        })),
        analysis: analysis,
        metadata: {
          model: 'gpt-4o-mini',
          statutes_found: statutes.length,
          cases_found: cases.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in synthesis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
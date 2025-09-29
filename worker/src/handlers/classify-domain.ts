import { Env } from '../embedding/openai-client';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface ClassifyDomainRequest {
  question: string;
}

interface DomainClassificationResult {
  is_civil_law: boolean;
  confidence: number;
  detected_domains: string[];
  recommendation: 'proceed' | 'reject' | 'clarify';
  reasoning: string;
}

export async function classifyDomain(
  request: Request,
  env: Env & { OPENAI_API_KEY: string }
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: ClassifyDomainRequest = await request.json();
    const { question } = body;

    if (!question || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Domain Classifier] Analyzing:', question);

    const systemPrompt = `You are a Czech legal domain classifier. Your task is to determine if a legal query falls within Czech civil law (§1-3081 NOZ).

CIVIL LAW DOMAINS (§1-3081 NOZ):
- Věcná práva (property rights): ownership, possession, easements, mortgages
- Závazkové právo (contract law): contracts, obligations, breach, damages
- Rodinné právo (family law): marriage, divorce, child support, adoption
- Dědické právo (inheritance law): wills, succession, estates
- Bezdůvodné obohacení (unjust enrichment)
- Delikty (torts): personal injury, product liability
- Náhrada škody (damages)

REJECT THESE DOMAINS:
- Trestní právo (criminal law): crimes, prosecution, imprisonment
- Pracovní právo (employment law): labor contracts, workplace disputes, termination
- Správní právo (administrative law): government decisions, permits, licenses
- Daňové právo (tax law): taxation, VAT, income tax
- Ústavní právo (constitutional law)
- Obchodní společnosti (business entity formation)

Respond ONLY with valid JSON in this exact format:
{
  "is_civil_law": true/false,
  "confidence": 0.0-1.0,
  "detected_domains": ["domain1", "domain2"],
  "recommendation": "proceed" | "reject" | "clarify",
  "reasoning": "brief explanation in Czech"
}`;

    const userPrompt = `Analyze this legal query and classify its domain:\n\n"${question}"`;

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
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const completion = await response.json() as any;
    const resultText = completion.choices[0].message.content;

    let result: DomainClassificationResult;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      console.error('[Domain Classifier] Failed to parse LLM response:', resultText);
      throw new Error('Invalid classification response');
    }

    console.log('[Domain Classifier] Result:', {
      is_civil_law: result.is_civil_law,
      confidence: result.confidence,
      domains: result.detected_domains,
      recommendation: result.recommendation
    });

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in domain classification:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        is_civil_law: false,
        confidence: 0,
        detected_domains: [],
        recommendation: 'reject',
        reasoning: 'Chyba při analýze dotazu'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
import { Env, getEmbedding, callOpenAI } from '../embedding/openai-client';
import { queryTopology } from './query-topology';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface TopologySynthesisRequest {
  question: string;
  topK?: number;
}

function buildSynthesisPrompt(
  question: string,
  baseResults: any[],
  contextEnhancedResults: any[] | null,
  doctrineClusters: any[],
  topologyAnalysis: any
): string {
  let prompt = `Jsi expert na české občanské právo. Analyzuj následující právní otázku z perspektivy topologie právních institutů.

# OTÁZKA KLIENTA
${question}

# TOPOLOGICKÁ ANALÝZA
`;

  if (topologyAnalysis.primary_doctrine !== 'general_search') {
    prompt += `\nPrimární právní institut: ${topologyAnalysis.primary_doctrine}
Jistota: ${(topologyAnalysis.confidence * 100).toFixed(0)}%
`;
  }

  if (topologyAnalysis.competing_doctrines) {
    prompt += `\n⚠️ KONKURUJÍCÍ PRÁVNÍ INSTITUTY DETEKOVÁNO
Systém našel více právních institutů, které by mohly být relevantní.
Musíš rozhodnout, který institut se aplikuje na základě faktů v otázce.
`;
  }

  if (doctrineClusters.length > 0) {
    prompt += `\n## PRÁVNÍ INSTITUTY IDENTIFIKOVANÉ TOPOLOGIÍ:\n`;
    for (const cluster of doctrineClusters) {
      prompt += `\n### ${cluster.doctrine_name.toUpperCase()} (Jistota: ${(cluster.confidence * 100).toFixed(0)}%)
${cluster.reasoning}

Relevantní paragrafy:
`;
      for (const sec of cluster.top_sections.slice(0, 3)) {
        prompt += `\n**§${sec.section}** (relevance: ${(sec.score * 100).toFixed(0)}%)
${sec.text.substring(0, 300)}...
`;
      }
    }
  }

  if (contextEnhancedResults) {
    prompt += `\n## KONTEXTOVĚ OBOHACENÉ VÝSLEDKY
Aplikované modifikátory: ${contextEnhancedResults.modifiers_applied.join(', ')}

Top relevantní paragrafy po aplikaci kontextu:
`;
    for (const sec of contextEnhancedResults.top_sections.slice(0, 5)) {
      prompt += `\n**§${sec.section}** (score: ${(sec.score * 100).toFixed(0)}%)
${sec.text.substring(0, 250)}...
`;
    }
  }

  prompt += `\n## ZÁKLADNÍ VYHLEDÁVÁNÍ (bez kontextových modifikátorů)
`;
  for (const sec of baseResults.slice(0, 5)) {
    prompt += `\n**§${sec.section}** (score: ${(sec.score * 100).toFixed(0)}%)
${sec.text.substring(0, 250)}...
`;
  }

  prompt += `

# INSTRUKCE PRO ANALÝZU

1. **Identifikace právního institutu:**
   - Který právní institut se aplikuje? (např. bezdůvodné obohacení vs. společnická práva)
   - Pokud jsou konkurující instituty, vysvětli PROČ jeden platí a druhý ne
   - Odkaz na konkrétní skutečnosti v otázce, které určují volbu institutu

2. **Právní základ:**
   - Cituj relevantní paragrafy s plným textem
   - Vysvětli, jak se paragrafy aplikují na fakta

3. **Judikaturu (pokud dostupná):**
   - Shrň relevantní rozhodnutí
   - Vysvětli, jak podporují tvou analýzu

4. **Praktická doporučení:**
   - Co má klient KONKRÉTNĚ udělat?
   - Jaké jsou jeho možnosti?
   - Prioritizuj akce podle naléhavosti a šance na úspěch

5. **DŮLEŽITÉ - Topologická transparentnost:**
   - Pokud systém našel konkurující instituty, VYSVĚTLI uživateli proč jsi zvolil jeden přes druhý
   - Pokud je volba nejednoznačná, ŘEKNI to a vysvětli, jaké další skutečnosti by rozhodly

# FORMÁT ODPOVĚDI

## Právní institut
[Který institut se aplikuje a proč]

## Právní základ
### §XXXX - [Název]
[Text paragrafu a aplikace na fakta]

## Judikatura
[Relevantní rozhodnutí]

## Doporučení
1. [Prioritní akce]
2. [Sekundární akce]
3. [Další možnosti]

## Poznámka k topologii
[Pokud byly konkurující instituty, vysvětli volbu]
`;

  return prompt;
}

export async function synthesizeTopology(
  request: Request,
  env: Env & { VECTORIZE: any },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: TopologySynthesisRequest = await request.json();
    const { question, topK = 15 } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Topology Synthesis] Question:', question);

    const topologyQueryRequest = new Request('http://internal/api/topology/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, topK, explore_modifiers: true })
    });

    const topologyResponse = await queryTopology(topologyQueryRequest, env, ctx);
    const topologyData = await topologyResponse.json() as any;

    console.log('[Topology Synthesis] Primary doctrine:', topologyData.topology_analysis.primary_doctrine);
    console.log('[Topology Synthesis] Competing doctrines:', topologyData.topology_analysis.competing_doctrines);

    const synthesisPrompt = buildSynthesisPrompt(
      question,
      topologyData.base_search.top_sections,
      topologyData.context_enhanced_search?.top_sections || null,
      topologyData.doctrine_clusters || [],
      topologyData.topology_analysis
    );

    console.log('[Topology Synthesis] Calling GPT-4o for synthesis...');

    const synthesisResponse = await callOpenAI(
      [
        {
          role: 'system',
          content: 'Jsi expert na české občanské právo s hlubokým porozuměním právní topologii a vztahům mezi právními instituty.'
        },
        {
          role: 'user',
          content: synthesisPrompt
        }
      ],
      env,
      {
        model: 'gpt-4o',
        max_tokens: 4000,
        temperature: 0.1
      }
    );

    const analysis = synthesisResponse.choices[0].message.content;

    return new Response(
      JSON.stringify({
        question,
        topology_analysis: topologyData.topology_analysis,
        patterns_detected: topologyData.patterns_detected,
        doctrine_clusters: topologyData.doctrine_clusters,

        base_search_preview: topologyData.base_search.top_sections.slice(0, 3).map((s: any) => ({
          section: s.section,
          score: s.score
        })),

        context_enhanced_preview: topologyData.context_enhanced_search
          ? topologyData.context_enhanced_search.top_sections.slice(0, 3).map((s: any) => ({
              section: s.section,
              score: s.score
            }))
          : null,

        analysis,

        metadata: {
          model: 'gpt-4o',
          topology_method: 'vector_arithmetic_with_doctrine_clusters',
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in topology synthesis:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
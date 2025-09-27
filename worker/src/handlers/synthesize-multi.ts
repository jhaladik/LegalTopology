import { Env } from '../embedding/openai-client';
import { decomposeQuery } from '../reasoning/query-decomposer';

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

export async function synthesizeMultiIssue(
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

    const decomposed = await decomposeQuery(question, env);

    console.log('[Multi-Issue Synthesis] Complexity:', decomposed.complexity);
    console.log('[Multi-Issue Synthesis] Total issues:', decomposed.issues.length);

    const { getEmbedding } = await import('../embedding/openai-client');

    const issueResults = await Promise.all(
      decomposed.issues.map(async (issue) => {
        console.log(`[Issue: ${issue.issue_id}] Searching with query:`, issue.search_query);

        const embedding = await getEmbedding(issue.search_query, env);

        const results = await env.VECTORIZE.query(embedding, {
          topK: topK,
          returnMetadata: true
        });

        const statutes = results.matches
          .filter((m: any) => m.metadata?.type === 'statute' || m.metadata?.type === 'civil_code')
          .slice(0, 5);

        const cases = results.matches
          .filter((m: any) => m.metadata?.type === 'judicial')
          .slice(0, 3);

        console.log(`[Issue: ${issue.issue_id}] Found ${statutes.length} statutes, ${cases.length} cases`);

        return {
          issue,
          statutes,
          cases
        };
      })
    );

    const allStatutes = new Map<string, any>();
    const allCases = new Map<string, any>();

    issueResults.forEach(result => {
      result.statutes.forEach((s: any) => {
        const key = s.metadata.section;
        if (!allStatutes.has(key) || allStatutes.get(key).score < s.score) {
          allStatutes.set(key, { ...s, issues: [result.issue.issue_id] });
        } else {
          allStatutes.get(key).issues.push(result.issue.issue_id);
        }
      });

      result.cases.forEach((c: any) => {
        const key = c.metadata.case_id;
        if (!allCases.has(key) || allCases.get(key).score < c.score) {
          allCases.set(key, { ...c, issues: [result.issue.issue_id] });
        } else {
          allCases.get(key).issues.push(result.issue.issue_id);
        }
      });
    });

    const isCzech = /[čďěňřšťůžá]/i.test(question);

    const issueContexts = issueResults.map(result => {
      const issueStatutes = result.statutes
        .map((s: any) => `§${s.metadata.section}: ${s.metadata.text}`)
        .join('\n');

      const issueCases = result.cases.length > 0
        ? result.cases
            .map((c: any) => `Case ${c.metadata.case_id}: ${c.metadata.text.substring(0, 500)}...`)
            .join('\n')
        : 'Nebyla nalezena judikatura.';

      return isCzech
        ? `## PRÁVNÍ PROBLÉM: ${result.issue.description} (ID: ${result.issue.issue_id})

RELEVANTNÍ ZÁKONY:
${issueStatutes}

RELEVANTNÍ JUDIKATURA:
${issueCases}
`
        : `## LEGAL ISSUE: ${result.issue.description} (ID: ${result.issue.issue_id})

RELEVANT STATUTES:
${issueStatutes}

RELEVANT CASE LAW:
${issueCases}
`;
    }).join('\n\n---\n\n');

    const factsContext = facts
      ? `\n\nKLIENTSKÉ SKUTEČNOSTI:\n${JSON.stringify(facts, null, 2)}`
      : '';

    const systemPrompt = isCzech
      ? `Jste expert na české občanské, obchodní a pracovní právo se zaměřením na strategické právní poradenství pro podnikání.

ÚKOL:
Pro KAŽDÝ právní problém poskytněte HLOUBKOVOU analýzu (minimálně 500 slov na problém):

1. ZÁKONNÝ ZÁKLAD (detailně):
   - Přesné citace relevantních paragrafů
   - Výklad podmínek a výjimek
   - Promlčecí lhůty a procedurální požadavky

2. JUDIKATURA (aplikovaně):
   - Konkrétní rozhodnutí a jejich význam
   - Jak soudy vykládají sporné body
   - Aktuální trendy v judikatuře

3. APLIKACE NA PŘÍPADU (prakticky):
   - Silné a slabé stránky pozice klienta
   - Pravděpodobnost úspěchu (v %)
   - Rizikové faktory

4. STRATEGICKÉ DOPORUČENÍ (konkrétně):
   - Prioritizace kroků (co nejdříve, co může počkat)
   - Argumentační strategie
   - Vyjednávací páky
   - Ekonomické dopady

5. VZÁJEMNÉ ZÁVISLOSTI:
   - Jak výsledek tohoto problému ovlivní ostatní
   - Která řešení je třeba koordinovat
   - Strategický timing

ZÁVĚREČNÁ SYNTHÉZA:
Po analýze všech problémů poskytněte:
- Celkovou strategii řešení
- Doporučené pořadí kroků
- Očekávané náklady vs. potenciální výnosy
- Nejvyšší rizika
- Nejlepší a nejhorší scénáře

STYL: Pište jako senior právní poradce pro podnikatele - konkrétně, strategicky, s důrazem na business dopady.`
      : `You are an expert in Czech civil law. Analyze ALL identified legal issues and provide a comprehensive answer.

TASK:
For EACH legal issue:
1. State the statutory foundation (what the law says)
2. Note judicial interpretations (how courts have applied it)
3. Apply to the specific facts
4. Provide recommendations

ANSWER STRUCTURE:
Number answers by legal issues (1, 2, 3...).
For each issue clearly state:
- What the law says
- What case law says
- Client's options
- Recommended approach

Be precise, cite sections, and explain your reasoning clearly.`;

    const userPrompt = isCzech
      ? `PŮVODNÍ OTÁZKA:
${question}
${factsContext}

IDENTIFIKOVANÉ PRÁVNÍ PROBLÉMY (${decomposed.issues.length}):
${decomposed.issues.map((i, idx) => `${idx + 1}. ${i.description} (${i.issue_type})`).join('\n')}

${issueContexts}

Poskytněte komplexní právní analýzu pokrývající VŠECHNY problémy.`
      : `ORIGINAL QUESTION:
${question}
${factsContext}

IDENTIFIED LEGAL ISSUES (${decomposed.issues.length}):
${decomposed.issues.map((i, idx) => `${idx + 1}. ${i.description} (${i.issue_type})`).join('\n')}

${issueContexts}

Provide comprehensive legal analysis covering ALL issues.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 16000
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
        query_decomposition: {
          complexity: decomposed.complexity,
          total_issues: decomposed.issues.length,
          issues: decomposed.issues.map(i => ({
            id: i.issue_id,
            type: i.issue_type,
            description: i.description,
            priority: i.priority
          }))
        },
        legal_research: issueResults.map(r => ({
          issue: r.issue.issue_id,
          statutes_found: r.statutes.length,
          cases_found: r.cases.length,
          top_sections: r.statutes.slice(0, 3).map((s: any) => `§${s.metadata.section}`)
        })),
        statutory_foundation: Array.from(allStatutes.values()).map((s: any) => ({
          section: `§${s.metadata.section}`,
          text: s.metadata.text,
          relevance: s.score,
          relevant_to_issues: s.issues
        })),
        case_law: Array.from(allCases.values()).map((c: any) => ({
          case_id: c.metadata.case_id,
          weight: c.metadata.weight,
          text: c.metadata.text.substring(0, 1000),
          relevance: c.score,
          relevant_to_issues: c.issues
        })),
        analysis: analysis,
        metadata: {
          model: 'gpt-4o',
          max_tokens: 16000,
          total_statutes: allStatutes.size,
          total_cases: allCases.size,
          multi_issue: true,
          analysis_depth: 'comprehensive',
          includes_strategy: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in multi-issue synthesis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
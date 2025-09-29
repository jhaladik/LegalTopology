/**
 * Synthesize Multi V2 - Tension-based legal synthesis
 * Uses topological analysis to provide deeper legal insights
 */

import { Env } from '../embedding/openai-client';
import { analyzeTopology, TopologicalAnalysis } from '../reasoning/query-decomposer-v2';
import {
  createHybridSearchStrategy,
  executeHybridSearch,
  analyzeSearchProvenance
} from '../reasoning/tension-vectorizer';
import { clusterQueryResults, enrichClustersWithAnchors, selectRepresentativesFromCluster } from '../clustering/query-clustering';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface SynthesisRequest {
  question: string;
  facts?: Record<string, any>;
  topK?: number;
  use_tensions?: boolean; // Feature flag for gradual rollout
}

export async function synthesizeMultiIssueV2(
  request: Request,
  env: Env & { VECTORIZE: any; OPENAI_API_KEY: string },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const startTime = Date.now();
    const body: SynthesisRequest = await request.json();
    const { question, facts, topK = 20, use_tensions = true } = body;

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Synthesis V2] Starting topological analysis');

    // Step 1: Topological Analysis
    const topology = await analyzeTopology(question, env);

    console.log('[Synthesis V2] Identified tensions:', topology.legal_tensions.map(t => ({
      type: t.tension_type,
      strength: t.strength
    })));

    console.log('[Synthesis V2] Competing doctrines:', topology.competing_doctrines.map(d => ({
      doctrine: d.doctrine,
      weight: d.weight
    })));

    // Step 2: Vector Search Strategy
    const { getEmbedding } = await import('../embedding/openai-client');

    // Create hybrid search strategy
    const searchStrategy = await createHybridSearchStrategy(
      topology.vector_strategies,
      topology.competing_doctrines.map(d => ({
        doctrine: d.doctrine,
        weight: d.weight
      })),
      topology.enriched_query,
      getEmbedding,
      env
    );

    // Step 3: Execute Hybrid Search
    console.log('[Synthesis V2] Executing hybrid vector search');

    const searchResults = await executeHybridSearch(
      searchStrategy,
      env.VECTORIZE,
      topK * 3 // Get more results for better clustering
    );

    console.log(`[Synthesis V2] Found ${searchResults.length} results from hybrid search`);

    // Step 4: Separate and Process Results
    const statutes = searchResults
      .filter((m: any) => m.metadata?.type === 'statute' || m.metadata?.type === 'civil_code')
      .slice(0, 10);

    const judicialResults = searchResults
      .filter((m: any) => m.metadata?.type === 'judicial');

    console.log(`[Synthesis V2] ${statutes.length} statutes, ${judicialResults.length} judicial decisions`);

    // Step 5: Cluster Judicial Decisions
    let clusters = [];
    let representativeCases = judicialResults.slice(0, 5);

    if (judicialResults.length >= 10) {
      console.log('[Synthesis V2] Clustering judicial decisions');

      clusters = clusterQueryResults(judicialResults, 0.4, 3);

      if (clusters.length > 0) {
        clusters = await enrichClustersWithAnchors(clusters, env.VECTORIZE, getEmbedding, env);
        representativeCases = clusters.flatMap(cluster =>
          selectRepresentativesFromCluster(cluster, 3)
        ).slice(0, 8);
      }

      console.log(`[Synthesis V2] Found ${clusters.length} doctrine clusters`);
    }

    // Step 6: Analyze Search Provenance
    const provenance = analyzeSearchProvenance(
      searchResults,
      topology.legal_tensions.map(t => t.tension_type)
    );

    console.log('[Synthesis V2] Search provenance:', provenance);

    // Step 7: TWO-STAGE SYNTHESIS - Junior Lawyer Phase
    const isCzech = /[čďěňřšťůžá]/i.test(question);
    console.log('[Synthesis V2] Starting two-stage synthesis - Junior Lawyer phase');

    // Extract resolution for each tension separately (Junior Lawyer)
    const tensionResolutions = await extractTensionResolutions(
      topology,
      statutes,
      representativeCases,
      isCzech,
      env
    );

    const tensionContext = buildTensionContext(topology, isCzech);
    const statuteContext = buildStatuteContext(statutes, topology, isCzech);
    const caseContext = buildCaseContext(representativeCases, clusters, topology, isCzech);

    // Step 8: TWO-STAGE SYNTHESIS - Senior Lawyer Phase
    console.log('[Synthesis V2] Starting Senior Lawyer synthesis phase');

    // Step 9: Enhanced System Prompt
    const systemPrompt = isCzech
      ? `Jsi senior právní poradce specializující se na české civilní právo s důrazem na strategické řešení skrze právní napětí.

TVŮJ PŘÍSTUP:
1. Analyzuješ právní situace skrze NAPĚTÍ, ne mechanicky skrze paragrafy
2. Vidíš konkurující právní hodnoty a doktríny
3. Rozumíš, PROČ určité instituty existují (jaká napětí řeší)
4. Posktuješ strategické řešení, ne akademickou analýzu

STRUKTURA ODPOVĚDI:
Pro každé identifikované napětí poskytni:

## NAPĚTÍ: [Název napětí]

### Konflikt hodnot
- Jaké právní hodnoty jsou zde v konfliktu
- Proč toto napětí vzniká v dané situaci
- Síla napětí (${topology.legal_tensions.map(t => `${t.tension_type}: ${(t.strength * 100).toFixed(0)}%`).join(', ')})

### Harmonizující doktrína
- Která doktrína toto napětí nejlépe řeší
- PROČ právě tato doktrína (test absurdity)
- Relevantní ustanovení NOZ

### Konkurující přístupy
- Alternativní doktríny a jejich problémy
- Proč jsou méně vhodné v této situaci

### Judikatura
- Jak soudy toto napětí řeší
- Trendy v rozhodování
- Klíčová rozhodnutí

### Strategické doporučení
- Konkrétní kroky klienta
- Argumentační strategie
- Vyjednávací pozice
- Rizika a příležitosti

## SYNTÉZA NAPŘÍČ NAPĚTÍMI

### Dominantní topologie
- Které napětí je primární
- Jak se napětí vzájemně ovlivňují
- Celková právní krajina případu

### Integrovaná strategie
- Jak koordinovat řešení různých napětí
- Prioritizace kroků
- Časování akcí

### Ekonomická analýza
- Náklady různých strategií
- Pravděpodobnost úspěchu
- ROI právních kroků

DŮLEŽITÉ:
- Neřeš mechanicky "§X říká Y"
- Vysvětli PROČ určité řešení funguje
- Ukaž jak napětí formují právní krajinu
- Buď konkrétní a strategický, ne akademický`
      : `You are a senior legal advisor analyzing Czech civil law through LEGAL TENSIONS, not mechanical rule application.

YOUR APPROACH:
1. Analyze situations through TENSIONS between competing legal values
2. Understand WHY legal institutes exist (what tensions they resolve)
3. Provide strategic solutions, not academic analysis

For each identified tension, provide:
- Competing values in conflict
- Harmonizing doctrine and why it works
- Alternative approaches and their problems
- Case law trends
- Strategic recommendations

SYNTHESIZE across tensions to show the complete legal topology.`;

    const userPrompt = isCzech
      ? `PRÁVNÍ SITUACE:
${question}
${facts ? `\nKLIENTSKÉ FAKTY:\n${JSON.stringify(facts, null, 2)}` : ''}

TOPOLOGICKÁ ANALÝZA:
${tensionContext}

RELEVANTNÍ PRÁVNÍ ÚPRAVA:
${statuteContext}

JUDIKATURA A DOKTRÍNY:
${caseContext}

🎯 ŘEŠENÍ JEDNOTLIVÝCH NAPĚTÍ (Junior Lawyer Analysis):
${tensionResolutions.map(r => r.resolution).join('\n\n')}

ABSURDITY TEST:
${topology.absurdity_test.without_primary_doctrine}
→ Potvrzuje doktrínu: ${topology.absurdity_test.confirms_doctrine}

Poskytni komplexní analýzu skrze identifikovaná napětí s konkrétními strategickými doporučeními.`
      : `LEGAL SITUATION:
${question}
${facts ? `\nCLIENT FACTS:\n${JSON.stringify(facts, null, 2)}` : ''}

TOPOLOGICAL ANALYSIS:
${tensionContext}

RELEVANT STATUTES:
${statuteContext}

CASE LAW AND DOCTRINES:
${caseContext}

🎯 INDIVIDUAL TENSION RESOLUTIONS (Junior Lawyer Analysis):
${tensionResolutions.map(r => r.resolution).join('\n\n')}

ABSURDITY TEST:
${topology.absurdity_test.without_primary_doctrine}
→ Confirms doctrine: ${topology.absurdity_test.confirms_doctrine}

Provide comprehensive analysis through identified tensions with concrete strategic recommendations.`;

    // Step 10: Generate Enhanced Synthesis (Senior Lawyer integrates all tensions)
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
        temperature: 0.3, // Slightly higher for nuanced tension analysis
        max_tokens: 16000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const completion = await response.json() as any;
    const analysis = completion.choices[0].message.content;

    const processingTime = Date.now() - startTime;

    // Step 11: Return Enhanced Response
    return new Response(
      JSON.stringify({
        question,
        facts,
        topological_analysis: {
          tensions: topology.legal_tensions,
          temporal_factors: topology.temporal_factors,
          power_dynamics: topology.power_dynamics,
          competing_doctrines: topology.competing_doctrines,
          absurdity_test: topology.absurdity_test,
          complexity: topology.complexity
        },
        search_strategy: {
          used_tensions: use_tensions,
          vector_strategies: topology.vector_strategies.length,
          search_provenance: provenance
        },
        legal_research: {
          statutes_found: statutes.length,
          cases_found: judicialResults.length,
          doctrine_clusters: clusters.length,
          representative_cases: representativeCases.length
        },
        statutory_foundation: statutes.map((s: any) => ({
          section: `§${s.metadata.section}`,
          text: s.metadata.text,
          relevance: s.score,
          source: s.sources || ['unknown']
        })),
        case_law: representativeCases.map((c: any) => ({
          case_id: c.metadata?.case_id || 'Unknown',
          court: c.metadata?.court || 'Unknown',
          weight: c.metadata?.weight || 1.0,
          text: c.metadata?.text?.substring(0, 1500) || '',
          relevance: c.score,
          source: c.sources || ['unknown'],
          cluster: c.cluster_id || null
        })),
        doctrine_clusters: clusters.map((cluster: any) => ({
          doctrine_id: cluster.id,
          member_count: cluster.members.length,
          common_sections: cluster.common_sections,
          supreme_court_anchor: cluster.supreme_court_precedent?.case_id || null,
          statute_anchor: cluster.statute_anchor?.section || null
        })),
        analysis: analysis,
        metadata: {
          model: 'gpt-4o',
          processing_time_ms: processingTime,
          used_tension_analysis: use_tensions,
          total_statutes: statutes.length,
          total_cases: judicialResults.length,
          analysis_depth: 'topological',
          version: '2.0'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error in topological synthesis:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Build context from tensions for LLM
 */
function buildTensionContext(topology: TopologicalAnalysis, isCzech: boolean): string {
  const tensions = topology.legal_tensions
    .sort((a, b) => b.strength - a.strength)
    .map(t => {
      const label = isCzech ? 'Napětí' : 'Tension';
      const values = t.competing_values.join(' vs. ');
      const strength = `${(t.strength * 100).toFixed(0)}%`;
      return `${label}: ${values} (síla: ${strength})`;
    })
    .join('\n');

  const temporal = topology.temporal_factors.duration ?
    (isCzech ? `Časový faktor: ${topology.temporal_factors.duration}` :
               `Temporal factor: ${topology.temporal_factors.duration}`) : '';

  const power = topology.power_dynamics.weaker_party ?
    (isCzech ? `Slabší strana: ${topology.power_dynamics.weaker_party}` :
               `Weaker party: ${topology.power_dynamics.weaker_party}`) : '';

  return [tensions, temporal, power].filter(Boolean).join('\n');
}

/**
 * Build statute context enhanced with tension relevance
 */
function buildStatuteContext(
  statutes: any[],
  topology: TopologicalAnalysis,
  isCzech: boolean
): string {
  return statutes.map(s => {
    const section = `§${s.metadata.section}`;
    // CRITICAL FIX: Don't truncate statute text, it's already concise
    const text = s.metadata.text;
    const sources = s.sources || [];
    const score = s.score || 0;

    // Find which doctrines this statute supports
    const relevantDoctrines = topology.competing_doctrines
      .filter(d => d.relevant_sections.includes(section))
      .map(d => d.doctrine);

    // Find which tensions this statute helps resolve
    const relevantTensions = topology.legal_tensions
      .filter(t => {
        // Check if statute was found via tension search or contains tension concepts
        return sources.includes('tension') ||
               t.competing_values.some(v => text.toLowerCase().includes(v.toLowerCase()));
      })
      .map(t => t.tension_type);

    // Build enriched statute context
    let statuteContext = `${section}: ${text}`;

    if (relevantTensions.length > 0) {
      statuteContext += isCzech ?
        `\n🎯 Řeší napětí: ${relevantTensions.join(', ')}` :
        `\n🎯 Resolves tensions: ${relevantTensions.join(', ')}`;
    }

    if (relevantDoctrines.length > 0) {
      statuteContext += isCzech ?
        `\n📚 Podporuje doktríny: ${relevantDoctrines.join(', ')}` :
        `\n📚 Supports doctrines: ${relevantDoctrines.join(', ')}`;
    }

    if (sources.length > 0) {
      statuteContext += isCzech ?
        `\n🔍 Nalezeno skrze: ${sources.join(', ')}` :
        `\n🔍 Found via: ${sources.join(', ')}`;
    }

    statuteContext += isCzech ?
      `\n📊 Relevance: ${(score * 100).toFixed(0)}%` :
      `\n📊 Relevance: ${(score * 100).toFixed(0)}%`;

    return statuteContext;
  }).join('\n\n');
}

/**
 * Build case law context with cluster information
 */
function buildCaseContext(
  cases: any[],
  clusters: any[],
  topology: TopologicalAnalysis,
  isCzech: boolean
): string {
  const caseTexts = cases.map(c => {
    const caseId = c.metadata?.case_id || 'Unknown';
    const court = c.metadata?.court || '';
    const weight = c.metadata?.weight || 1.0;

    // CRITICAL FIX: Increase from 800 to 1500 chars to preserve legal reasoning
    const text = c.metadata?.text?.substring(0, 1500) || '';

    // Extract legal principle if available
    const pravniVeta = c.metadata?.pravni_veta || '';
    const sectionsReferenced = c.metadata?.sections_referenced || [];

    // Find which tensions this case helps resolve
    const relevantTensions = topology.legal_tensions
      .filter(t => {
        // Check if case relates to tension based on sources or content
        const sources = c.sources || [];
        return sources.includes('tension') ||
               (t.competing_values.some(v => text.toLowerCase().includes(v.toLowerCase())));
      })
      .map(t => t.tension_type);

    // Find cluster membership
    const cluster = clusters.find((cl: any) =>
      cl.members.some((m: any) => m.id === c.id)
    );

    // Build comprehensive case context
    let caseContext = `${caseId} (${court})`;

    if (pravniVeta) {
      caseContext += isCzech ?
        `\n📌 Právní věta: ${pravniVeta}` :
        `\n📌 Legal principle: ${pravniVeta}`;
    }

    if (relevantTensions.length > 0) {
      caseContext += isCzech ?
        `\n🎯 Řeší napětí: ${relevantTensions.join(', ')}` :
        `\n🎯 Resolves tensions: ${relevantTensions.join(', ')}`;
    }

    if (sectionsReferenced.length > 0) {
      caseContext += isCzech ?
        `\n📖 Interpretuje: §§${sectionsReferenced.join(', ')}` :
        `\n📖 Interprets: §§${sectionsReferenced.join(', ')}`;
    }

    caseContext += isCzech ?
      `\n⚖️ Váha: ${weight.toFixed(2)}` :
      `\n⚖️ Weight: ${weight.toFixed(2)}`;

    caseContext += `\n📝 ${text}`;

    const clusterNote = cluster ?
      (isCzech ? `\n[Doktrína: ${cluster.id}]` :
                 `\n[Doctrine: ${cluster.id}]`) : '';

    return caseContext + clusterNote;
  }).join('\n\n');

  // Add cluster summary
  const clusterSummary = clusters.length > 0 ?
    (isCzech ?
      `\nIDENTIFIKOVANÉ DOKTRÍNY (${clusters.length}):\n` +
      clusters.map((cl: any) =>
        `- ${cl.id}: ${cl.members.length} rozhodnutí, §§${cl.common_sections.join(', ')}`
      ).join('\n') :
      `\nIDENTIFIED DOCTRINES (${clusters.length}):\n` +
      clusters.map((cl: any) =>
        `- ${cl.id}: ${cl.members.length} decisions, §§${cl.common_sections.join(', ')}`
      ).join('\n')) : '';

  return caseTexts + clusterSummary;
}

/**
 * TWO-STAGE SYNTHESIS: Extract specific resolutions for each tension
 * Junior Lawyer phase - focused extraction per tension
 */
async function extractTensionResolutions(
  topology: TopologicalAnalysis,
  statutes: any[],
  cases: any[],
  isCzech: boolean,
  env: Env
): Promise<Array<{tension: string, resolution: string}>> {
  console.log(`[Junior Lawyer] Processing ${topology.legal_tensions.length} tensions in parallel`);

  // Process tensions in PARALLEL to reduce total time
  const resolutionPromises = topology.legal_tensions.map(async (tension) => {
    // Find statutes relevant to THIS specific tension
    const relevantStatutes = statutes.filter(s => {
      const sources = s.sources || [];
      const text = s.metadata?.text || '';
      return sources.includes('tension') ||
             tension.competing_values.some(v => text.toLowerCase().includes(v.toLowerCase()));
    }).slice(0, 3); // Top 3 most relevant

    // Find cases relevant to THIS specific tension
    const relevantCases = cases.filter(c => {
      const sources = c.sources || [];
      const text = c.metadata?.text || '';
      return sources.includes('tension') ||
             tension.competing_values.some(v => text.toLowerCase().includes(v.toLowerCase()));
    }).slice(0, 3); // Top 3 most relevant

    // Build focused prompt for THIS tension
    const systemPrompt = isCzech ?
      `Jsi junior právník analyzující JEDNO KONKRÉTNÍ napětí v českém právu.
Tvůj úkol: Extrahuj PŘESNÁ ŘEŠENÍ z judikatury a zákonů.

PRAVIDLA:
1. Cituj PŘESNÉ pasáže z rozhodnutí (ne parafráze)
2. Ukaž JAK konkrétní případ řešil toto napětí
3. Vyber NEJRELEVANTNĚJŠÍ holding pro toto napětí
4. Buď STRUČNÝ ale PŘESNÝ` :
      `You are a junior lawyer analyzing ONE SPECIFIC tension in Czech law.
Your task: Extract EXACT resolutions from case law and statutes.

RULES:
1. Quote EXACT passages from decisions (not paraphrases)
2. Show HOW specific case resolved this tension
3. Select MOST RELEVANT holding for this tension
4. Be CONCISE but PRECISE`;

    const userPrompt = isCzech ?
      `NAPĚTÍ: ${tension.tension_type}
Konkurující hodnoty: ${tension.competing_values.join(' vs. ')}
Síla: ${(tension.strength * 100).toFixed(0)}%

RELEVANTNÍ ZÁKONY:
${relevantStatutes.map(s => `§${s.metadata.section}: ${s.metadata.text}`).join('\n')}

RELEVANTNÍ JUDIKATURA:
${relevantCases.map(c => {
  const caseId = c.metadata?.case_id || 'Unknown';
  const text = c.metadata?.text?.substring(0, 2000) || ''; // Give MORE context for extraction
  const pravniVeta = c.metadata?.pravni_veta || '';
  return `${caseId}:\n${pravniVeta ? `Právní věta: ${pravniVeta}\n` : ''}${text}`;
}).join('\n\n')}

Extrahuj KONKRÉTNÍ řešení tohoto napětí. Cituj PŘESNĚ z judikatury.` :
      `TENSION: ${tension.tension_type}
Competing values: ${tension.competing_values.join(' vs. ')}
Strength: ${(tension.strength * 100).toFixed(0)}%

RELEVANT STATUTES:
${relevantStatutes.map(s => `§${s.metadata.section}: ${s.metadata.text}`).join('\n')}

RELEVANT CASE LAW:
${relevantCases.map(c => {
  const caseId = c.metadata?.case_id || 'Unknown';
  const text = c.metadata?.text?.substring(0, 2000) || '';
  const pravniVeta = c.metadata?.pravni_veta || '';
  return `${caseId}:\n${pravniVeta ? `Legal principle: ${pravniVeta}\n` : ''}${text}`;
}).join('\n\n')}

Extract SPECIFIC resolution of this tension. Quote EXACTLY from case law.`;

    // Retry logic for API calls
    let retries = 3;
    while (retries > 0) {
      try {
        // Use GPT-4o-mini for extraction (junior lawyer)
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
            temperature: 0.1, // Very low for precise extraction
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          if (response.status === 503 && retries > 1) {
            console.log(`[Junior Lawyer] 503 error for ${tension.tension_type}, retrying...`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            continue;
          }
          console.error(`Failed to extract resolution for tension ${tension.tension_type}: ${response.status}`);
          return null;
        }

        const completion = await response.json() as any;
        const resolution = completion.choices[0].message.content;

        return {
          tension: tension.tension_type,
          resolution: `### 🎯 NAPĚTÍ: ${tension.tension_type}\n${resolution}`
        };

      } catch (error) {
        retries--;
        if (retries > 0) {
          console.log(`[Junior Lawyer] Error for ${tension.tension_type}, retrying... (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error(`Error extracting resolution for tension ${tension.tension_type}:`, error);
          return null;
        }
      }
    }
    return null;
  });

  // Wait for all resolutions in parallel
  const results = await Promise.all(resolutionPromises);

  // Filter out nulls and return valid resolutions
  return results.filter(r => r !== null) as Array<{tension: string, resolution: string}>;
}
/**
 * Query Decomposer V2 - Tension-based legal analysis
 * Analyzes legal questions through tensions rather than keywords
 */

import {
  LegalTension,
  identifyTensions,
  calculateTensionStrength,
  generateVectorStrategies,
  performAbsurdityTest,
  TensionVectorStrategy
} from './legal-tensions';

interface CompetingDoctrine {
  doctrine: string;
  relevant_sections: string[];
  resolves_tensions: string[];
  creates_problems: string[];
  weight: number;
  reasoning: string;
}

interface TemporalFactors {
  duration?: string;
  creates_expectation: boolean;
  prescription_relevant: boolean;
  years?: number;
}

interface PowerDynamics {
  weaker_party?: string;
  needs_protection: boolean;
  asymmetry_level: 'equal' | 'slight' | 'significant' | 'extreme';
}

interface AbsurdityTest {
  without_primary_doctrine: string;
  confirms_doctrine: string;
}

export interface TopologicalAnalysis {
  original_question: string;
  legal_tensions: LegalTension[];
  temporal_factors: TemporalFactors;
  power_dynamics: PowerDynamics;
  competing_doctrines: CompetingDoctrine[];
  absurdity_test: AbsurdityTest;
  vector_strategies: TensionVectorStrategy[];
  enriched_query: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

export async function analyzeTopology(
  question: string,
  env: { OPENAI_API_KEY: string }
): Promise<TopologicalAnalysis> {
  const systemPrompt = `Jsi senior právní analytik analyzující české právo skrze PRÁVNÍ NAPĚTÍ, ne klíčová slova.

METODOLOGIE PRÁVNÍ TOPOLOGIE:

1. IDENTIFIKUJ PRÁVNÍ NAPĚTÍ V SITUACI
Nehledej slova, hledej KONFLIKTY mezi právními hodnotami:
- Co je zde v rozporu? (faktický stav vs. formální právo)
- Jaké zájmy si konkurují? (ochrana vlastnictví vs. dobrá víra)
- Kde je nerovnováha moci? (silnější vs. slabší strana)
- Jaké hodnoty jsou v konfliktu? (jistota vs. spravedlnost)

2. ANALYZUJ RELEVANTNÍ DIMENZE
Časová: Jak dlouho trvá stav? Vznikla legitimní očekávání?
Subjektová: Kdo je slabší strana? Kdo jednal v dobré víře?
Ekonomická: Kdo nese riziko? Kdo má prospěch?
Morální: Co je spravedlivé? Co by bylo absurdní?

3. NAJDI PRÁVNÍ DOKTRÍNY ŘEŠÍCÍ TATO NAPĚTÍ
Pro každé napětí existují konkurující řešení:
- Která doktrína harmonizuje konflikt?
- Která vytváří nové problémy?
- Jak se doktríny vzájemně vylučují nebo doplňují?

4. APLIKUJ TEST ABSURDITY
Představ si, že dominantní doktrína neexistuje:
- Jaký absurdní důsledek by nastal?
- Který institut tuto absurditu řeší?
- To je často správná doktrína

5. VÝSTUP - TOPOLOGICKÁ MAPA
Ne seznam paragrafů, ale VÁHOVANÉ DOKTRÍNY s odůvodněním:
- Primární doktrína (řeší hlavní napětí)
- Konkurující doktríny (alternativní cesty)
- Podpůrné instituty (zesilují primární)
- Fallback pozice (když vše selže)

STRUKTURA ODPOVĚDI (JSON):
{
  "legal_tensions": [
    {
      "tension_type": "formal_vs_factual|protection_vs_autonomy|time_creates_rights|substance_over_form|good_faith_vs_strict_law|economic_efficiency_vs_fairness|prevention_vs_reparation|individual_vs_collective|certainty_vs_flexibility|restitution_vs_stability",
      "competing_values": ["hodnota1", "hodnota2"],
      "strength": 0.0-1.0,
      "reasoning": "proč tato síla"
    }
  ],
  "temporal_factors": {
    "duration": "30 let|3 měsíce|není relevantní",
    "years": číslo nebo null,
    "creates_expectation": true/false,
    "prescription_relevant": true/false
  },
  "power_dynamics": {
    "weaker_party": "spotřebitel|nájemce|zaměstnanec|null",
    "needs_protection": true/false,
    "asymmetry_level": "equal|slight|significant|extreme"
  },
  "competing_doctrines": [
    {
      "doctrine": "vydržení|dobrá_víra|bezdůvodné_obohacení|ochrana_spotřebitele|neplatnost|náhrada_škody",
      "relevant_sections": ["§1089", "§1090"],
      "resolves_tensions": ["formal_vs_factual", "time_creates_rights"],
      "creates_problems": ["restitution_vs_stability"],
      "weight": 0.0-1.0,
      "reasoning": "proč tato váha"
    }
  ],
  "absurdity_test": {
    "without_primary_doctrine": "co by se stalo bez hlavní doktríny",
    "confirms_doctrine": "název potvrzené doktríny"
  },
  "enriched_query": "dotaz obohacený o napětí a doktríny, ne mechanická klíčová slova"
}

PŘÍKLADY NAPĚTÍ:
- formal_vs_factual: Forma vs. faktický stav
- protection_vs_autonomy: Ochrana slabšího vs. smluvní svoboda
- time_creates_rights: Čas vytváří práva
- substance_over_form: Substance nad formou
- good_faith_vs_strict_law: Dobrá víra vs. přísné právo
- economic_efficiency_vs_fairness: Ekonomická efektivita vs. spravedlnost
- prevention_vs_reparation: Prevence vs. reparace
- individual_vs_collective: Individuální vs. kolektivní zájem
- certainty_vs_flexibility: Právní jistota vs. flexibilita
- restitution_vs_stability: Restituce vs. stabilita vztahů

KRITICKÉ PŘÍKLADY:

Situace: "Soused 30 let chodí přes můj pozemek, není to nikde zapsáno"
NAPĚTÍ:
- formal_vs_factual (0.9): formální vlastnictví vs. 30 let faktického užívání
- time_creates_rights (0.95): 30 let vytváří silné očekávání
DOKTRÍNY:
- vydržení (0.9): harmonizuje obě napětí
- vlastnické právo (0.3): ignoruje časový faktor
TEST ABSURDITY: Bez vydržení by 30 let užívání bylo irelevantní → absurdní

Situace: "Nájemce podnajímá byt na Airbnb bez mého souhlasu za dvojnásobek"
NAPĚTÍ:
- protection_vs_autonomy (0.3): pronajímatel není slabší strana
- economic_efficiency_vs_fairness (0.8): nájemce profituje z cizího majetku
DOKTRÍNY:
- bezdůvodné_obohacení (0.85): nájemce se obohacuje bez právního důvodu
- porušení_nájemní_smlouvy (0.7): formální porušení
TEST ABSURDITY: Bez bezdůvodného obohacení by nájemce mohl ponechat celý zisk → nespravedlivé

PAMATUJ:
- Neřeš mechanicky "obsahuje X → aplikuj Y"
- Hledej PROČ nějaký institut existuje (jaké napětí řeší)
- Konkurující doktríny jsou normální, važ je podle kontextu
- Časový faktor často mění celou topologii (1 rok vs. 30 let)
- Test absurdity odhalí správné řešení
- NIKDY nevracej prázdné tensions nebo doctrines

Analyzuj situaci jako zkušený právník, který vidí napětí a jejich řešení, ne jako mechanický vyhledávač.`;

  const userPrompt = `Analyzuj tuto právní situaci skrze napětí a doktríny:

"${question}"

Vrať JSON s topologickou analýzou.`;

  try {
    // Call OpenAI for topological analysis
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
        temperature: 0.3, // Slightly higher for creative tension identification
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const completion = await response.json() as any;
    const analysis = JSON.parse(completion.choices[0].message.content);

    // Enhance with calculated values
    for (const tension of analysis.legal_tensions) {
      // Recalculate strength based on our rules
      const calculatedStrength = calculateTensionStrength(
        tension.tension_type,
        analysis.temporal_factors.years,
        analysis.power_dynamics.asymmetry_level
      );

      // Use maximum of AI suggested and calculated
      tension.strength = Math.max(tension.strength, calculatedStrength);
    }

    // Generate vector strategies
    const vectorStrategies = generateVectorStrategies(analysis.legal_tensions);

    // Determine complexity
    const tensionCount = analysis.legal_tensions.length;
    const doctrineCount = analysis.competing_doctrines.length;
    const complexity = (tensionCount > 3 || doctrineCount > 4) ? 'complex' :
                       (tensionCount > 1 || doctrineCount > 2) ? 'moderate' : 'simple';

    // Create enriched query that emphasizes tensions over keywords
    const primaryTension = analysis.legal_tensions
      .sort((a: LegalTension, b: LegalTension) => b.strength - a.strength)[0];

    const primaryDoctrine = analysis.competing_doctrines
      .sort((a: CompetingDoctrine, b: CompetingDoctrine) => b.weight - a.weight)[0];

    const enrichedQuery = analysis.enriched_query ||
      `${primaryTension?.competing_values.join(' vs ') || ''} ${primaryDoctrine?.doctrine || ''} ${
        analysis.temporal_factors.duration || ''
      }`.trim();

    return {
      original_question: question,
      legal_tensions: analysis.legal_tensions,
      temporal_factors: analysis.temporal_factors,
      power_dynamics: analysis.power_dynamics,
      competing_doctrines: analysis.competing_doctrines,
      absurdity_test: analysis.absurdity_test,
      vector_strategies: vectorStrategies,
      enriched_query: enrichedQuery,
      complexity: complexity
    };

  } catch (error) {
    console.error('[Topological Analysis Error]', error);

    // Fallback to basic tension identification
    const identifiedTensionTypes = identifyTensions(question);
    const basicTensions: LegalTension[] = identifiedTensionTypes.map(type => ({
      tension_type: type,
      competing_values: ['právní princip', 'faktická situace'],
      strength: 0.5
    }));

    return {
      original_question: question,
      legal_tensions: basicTensions,
      temporal_factors: {
        creates_expectation: false,
        prescription_relevant: false
      },
      power_dynamics: {
        needs_protection: false,
        asymmetry_level: 'equal'
      },
      competing_doctrines: [],
      absurdity_test: {
        without_primary_doctrine: 'Situace by zůstala nevyřešena',
        confirms_doctrine: 'obecné principy'
      },
      vector_strategies: generateVectorStrategies(basicTensions),
      enriched_query: question,
      complexity: 'simple'
    };
  }
}
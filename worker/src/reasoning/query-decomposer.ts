interface LegalIssue {
  issue_id: string;
  issue_type: string;
  description: string;
  search_query: string;
  priority: number;
  relevant_sections: string[];
  legal_terms: string[];
  dependencies?: string[];
  strategic_notes?: string;
}

interface DecomposedQuery {
  original_question: string;
  issues: LegalIssue[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export async function decomposeQuery(
  question: string,
  env: { OPENAI_API_KEY: string }
): Promise<DecomposedQuery> {
  const isCzech = /[čďěňřšťůžá]/i.test(question);

  const systemPrompt = isCzech
    ? `Jsi expert na české občanské, obchodní a pracovní právo. Analyzuj právní otázku a rozlož ji na samostatné právní problémy s důrazem na jejich vzájemné závislosti.

ÚKOL:
Identifikuj VŠECHNY oddělené právní problémy v otázce. Každý problém vyžaduje samostatné vyhledávání v zákoně.

Pro KAŽDÝ problém vytvoř:
1. issue_id: krátký identifikátor (např. "vady_kupni_smlouvy", "vydrzeni_sluzebnosti")
2. issue_type: typ problému (např. "smlouva", "věcná práva", "delikt", "pojistné právo", "pracovní právo")
3. description: stručný popis problému (1 věta)
4. search_query: optimalizovaný dotaz pro vyhledávání (klíčová slova + právní termíny + KONKRÉTNÍ PARAGRAFY)
5. priority: 1-5 (1 = nejvyšší priorita)
6. relevant_sections: navrhované paragrafy (BE SPECIFIC: §2813-2815 místo §2800+)
7. legal_terms: relevantní právní termíny
8. dependencies: ID jiných issues, na kterých tento závisí (např. ["insurance_claim"] pokud výsledek ovlivní tento issue)
9. strategic_notes: praktické poznámky k prioritizaci nebo sekvenčnímu řešení

DŮLEŽITÉ PRO OBCHODNÍ PŘÍPADY:
- Vždy identifikuj PRIMÁRNÍ issue (obvykle pojistné plnění, hlavní smlouva)
- Sekundární issues často závisí na primárním
- Pro pojištění VŽDY zahrnuj §2813-2815 (povinnost zabránit škodě)
- Pro zaměstnance zahrnuj zákoník práce §52, §55
- Pro nemožnost plnění zahrnuj §1971, §2006
- Pro odpovědnost za škodu zahrnuj §2894-2971

KRITICKÉ - BEZDŮVODNÉ OBOHACENÍ:
Pokud někdo získává ekonomický prospěch BEZ PRÁVNÍHO DŮVODU:
- Neoprávněný podnájem (pronajímatel nesouhlas → nájemce vydělává)
- Užívání cizí věci bez práva (soused používá pozemek → vlastník neplatí)
- Protiprávní nakládání s cizím majetkem
→ TO NENÍ "profit_sharing" (společnická práva §2728)!
→ TO JE "unjust_enrichment" (bezdůvodné obohacení §2991-2992, §3003-3004)

search_query MUSÍ obsahovat: "bezdůvodné obohacení neoprávněný bez právního důvodu vydání prospěchu"
relevant_sections: ["§2991", "§2992", "§3003", "§3004"]

PŘÍKLADY:

Otázka: "Koupil jsem dům s vadami za 5M. Soused chodí přes můj pozemek 13 let. Co mám dělat?"

Rozdělení:
[
  {
    "issue_id": "vady_kupni_smlouvy",
    "issue_type": "smlouva",
    "description": "Skryté vady nemovitosti při koupi",
    "search_query": "vady kupní smlouvy skryté vady nemovitost odstoupení sleva kupní cena",
    "priority": 1,
    "relevant_sections": ["§2106", "§2107", "§2129"],
    "legal_terms": ["vadné plnění", "odstoupení od smlouvy", "sleva z ceny"]
  },
  {
    "issue_id": "vydrzeni_sluzebnosti",
    "issue_type": "věcná práva",
    "description": "Nabytí práva cesty vydržením po 13 letech",
    "search_query": "vydržení právo cesty služebnost pozemek 13 let držba",
    "priority": 2,
    "relevant_sections": ["§1089", "§1090", "§1091", "§1021"],
    "legal_terms": ["vydržení", "služebnost", "právo cesty", "držba"]
  }
]

Otázka: "Nájemce mi neplatí 3 měsíce. Co mám dělat?"

Rozdělení:
[
  {
    "issue_id": "prodleni_najemce",
    "issue_type": "nájem",
    "description": "Prodlení nájemce s platbami nájemného",
    "search_query": "nájem prodlení nájemné neplacení výpověď nájmu",
    "priority": 1,
    "relevant_sections": ["§2201", "§2288"],
    "legal_terms": ["nájem", "prodlení", "výpověď"]
  }
]

Otázka: "Pronajímám za 25k Kč/měsíc. Zjistil jsem, že nájemce byt podnajímá přes Airbnb za 60k Kč/měsíc bez mého souhlasu."

Rozdělení:
[
  {
    "issue_id": "unauthorized_subletting",
    "issue_type": "nájem",
    "description": "Neoprávněný podnájem bez souhlasu pronajímatele",
    "search_query": "podnájem bez souhlasu pronajímatel nesouhlas §2275 §2276 výpověď",
    "priority": 1,
    "relevant_sections": ["§2275", "§2276", "§2232"],
    "legal_terms": ["podnájem", "souhlas pronajímatele", "výpověď"]
  },
  {
    "issue_id": "unjust_enrichment",
    "issue_type": "bezdůvodné obohacení",
    "description": "Neoprávněné obohacení nájemce z nepovoleného podnájmu",
    "search_query": "bezdůvodné obohacení neoprávněný zisk bez právního důvodu podnájem vydání prospěchu §2991",
    "priority": 1,
    "relevant_sections": ["§2991", "§2992", "§3003", "§3004"],
    "legal_terms": ["bezdůvodné obohacení", "bez právního důvodu", "vydání prospěchu"],
    "dependencies": ["unauthorized_subletting"],
    "strategic_notes": "Nájemce profituje 35k Kč/měsíc bez práva - nárok na vydání rozdílu, ne jen na ukončení nájmu"
  }
]

DŮLEŽITÉ:
- Každý SAMOSTATNÝ právní problém = samostatný issue
- Pokud je jen 1 problém → 1 issue
- Pokud jsou 2-3 problémy → 2-3 issues
- Pokud je 4+ problémů → označit jako "complex"

Vrať JSON s klíči: original_question, issues (array), complexity`
    : `You are an expert in Czech civil law. Analyze the legal question and decompose it into separate legal issues.

TASK:
Identify ALL separate legal issues in the question. Each issue requires separate statute search.

For EACH issue create:
1. issue_id: short identifier (e.g., "contract_defects", "adverse_possession")
2. issue_type: problem type (e.g., "contract", "property_rights", "tort")
3. description: brief description (1 sentence)
4. search_query: optimized search query (keywords + legal terms)
5. priority: 1-5 (1 = highest priority)
6. relevant_sections: suggested sections
7. legal_terms: relevant legal terminology

EXAMPLES:

Question: "I bought a house with defects for 5M. Neighbor walks across my land for 13 years. What to do?"

Decomposition:
[
  {
    "issue_id": "contract_defects",
    "issue_type": "contract",
    "description": "Hidden defects in property purchase",
    "search_query": "contract defects hidden defects property withdrawal price reduction",
    "priority": 1,
    "relevant_sections": ["§2106", "§2107", "§2129"],
    "legal_terms": ["defective performance", "withdrawal from contract", "price reduction"]
  },
  {
    "issue_id": "adverse_possession",
    "issue_type": "property_rights",
    "description": "Acquisition of right of way by adverse possession after 13 years",
    "search_query": "adverse possession vydržení right of way easement land 13 years possession",
    "priority": 2,
    "relevant_sections": ["§1089", "§1090", "§1091", "§1021"],
    "legal_terms": ["vydržení", "easement", "right of way", "possession"]
  }
]

IMPORTANT:
- Each SEPARATE legal issue = separate issue object
- If only 1 issue → 1 issue object
- If 2-3 issues → 2-3 issue objects
- If 4+ issues → mark as "complex"

Return JSON with keys: original_question, issues (array), complexity`;

  const userPrompt = isCzech
    ? `Otázka: ${question}

Rozlož na samostatné právní problémy a vrať JSON.`
    : `Question: ${question}

Decompose into separate legal issues and return JSON.`;

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
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const completion = await response.json() as any;
  const content = completion.choices[0].message.content;
  const decomposed = JSON.parse(content);

  const issues: LegalIssue[] = decomposed.issues || [];
  const complexity = issues.length === 1 ? 'simple' : issues.length <= 3 ? 'moderate' : 'complex';

  console.log('[Query Decomposition]', {
    total_issues: issues.length,
    complexity,
    issues: issues.map((i: any) => i.issue_id)
  });

  return {
    original_question: question,
    issues,
    complexity
  };
}
interface LegalConcepts {
  legal_terms: string[];
  relevant_sections: string[];
  legal_area: string;
  enriched_query: string;
}

export async function extractLegalConcepts(
  question: string,
  env: { OPENAI_API_KEY: string }
): Promise<LegalConcepts> {
  const isCzech = /[čďěňřšťůžá]/i.test(question);

  const systemPrompt = isCzech
    ? `Jsi expert na české občanské a obchodní právo včetně pojistného práva, pracovního práva a závazkového práva. Analyzuj uživatelskou otázku a extrahuj právní koncepty.

ÚKOL:
1. Identifikuj relevantní právní termíny (např. "vydržení", "služebnost", "pojistná událost", "výluka")
2. Navrhni relevantní paragrafy občanského zákoníku a dalších předpisů (např. "§2813", "§1971", "§52 zákoníku práce")
3. Urči právní oblast (např. "věcná práva", "pojistné právo", "pracovní právo", "odpovědnost za škodu")
4. Vytvoř obohacený dotaz, který kombinuje původní otázku s právními termíny

DŮLEŽITÉ PRO OBCHODNÍ PŘÍPADY:
- Pojištění → §2758-2872, "pojistná událost", "výluka", "povinnost zabránit škodě"
- Zaměstnanci → "zákoník práce", "výpovědní doba", "odstoupení od smlouvy", "skončení pracovního poměru"
- Dodavatelské smlouvy → "smlouva o dílo", "vadné plnění", "náhrada škody", "odpovědnost zhotovitele"
- Nemožnost plnění → "§1971", "§2006", "vis maior", "změna okolností"
- Nájemní smlouvy → "§2201-2301", "sleva z nájemného", "užívání věci"

PŘÍKLADY:
Otázka: "Soused 13 let chodí přes můj pozemek. Může si tím získat právo cesty?"
→ Právní termíny: ["vydržení", "služebnost", "věcné břemeno", "právo cesty", "držba"]
→ Paragrafy: ["§1089", "§1090", "§1091", "§1021", "§1028"]
→ Oblast: "věcná práva - nabývání vlastnického práva"
→ Obohacený dotaz: "vydržení služebnosti právo cesty pozemek 13 let držba dobré víry soused"

Otázka: "Nájemce pojistil majetek pronajímatele bez jeho souhlasu"
→ Právní termíny: ["pojistná smlouva", "pojistný zájem", "pojištění cizí věci", "souhlas", "nájemní vztah"]
→ Paragrafy: ["§2758", "§2767", "§2261"]
→ Oblast: "pojistné právo - pojistný zájem"
→ Obohacený dotaz: "pojištění cizí věci pojistný zájem souhlas vlastníka nájemce pojistná smlouva"

Vrať odpověď ve formátu JSON.`
    : `You are an expert in Czech civil law. Analyze the user's question and extract legal concepts.

TASK:
1. Identify relevant legal terms (e.g., "adverse possession", "easement", "real burden")
2. Suggest relevant Civil Code sections (e.g., "§1089", "§1021")
3. Determine legal area (e.g., "property rights", "contract law", "family law")
4. Create enriched query combining original question with legal terms

EXAMPLES:
Question: "Neighbor walks across my land for 13 years. Can they acquire right of way?"
→ Legal terms: ["adverse possession", "vydržení", "easement", "right of way", "possession"]
→ Sections: ["§1089", "§1090", "§1091", "§1021", "§1028"]
→ Area: "property rights - acquisition of ownership"
→ Enriched query: "adverse possession vydržení easement right of way land 13 years good faith possession neighbor"

Return answer in JSON format.`;

  const userPrompt = isCzech
    ? `Otázka: ${question}

Vrať JSON s klíči: legal_terms, relevant_sections, legal_area, enriched_query`
    : `Question: ${question}

Return JSON with keys: legal_terms, relevant_sections, legal_area, enriched_query`;

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
  const concepts = JSON.parse(content);

  console.log('[Legal Concept Extraction]', concepts);

  return {
    legal_terms: concepts.legal_terms || [],
    relevant_sections: concepts.relevant_sections || [],
    legal_area: concepts.legal_area || 'general_civil_law',
    enriched_query: concepts.enriched_query || question
  };
}
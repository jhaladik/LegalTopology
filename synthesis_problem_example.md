# The Synthesis Problem - Real Example

## What We Have in Vectorize Database

### Full Case Text (2000+ characters):
```
22 Cdo 2570/98 - Nejvyšší soud

Nejvyšší soud rozhodl, že pro vydržení práva odpovídajícího věcnému břemenu
je třeba, aby držitel vykonával právo po celou vydržecí dobu v dobré víře,
pokojně, nepřerušeně a aby šlo o držbu kvalifikovanou.

Pouhé strpění průchodu sousedem bez aktivního bránění není dostačující pro
vznik práva cesty vydržením. Je nutné, aby držba byla vykonávána jako právo,
nikoliv z pouhé shovívavosti vlastníka pozemku.

V posuzovaném případě žalobce prokázal, že jeho právní předchůdci užívali
cestu přes pozemek žalovaného po dobu převyšující 30 let, přičemž toto
užívání mělo charakter výkonu práva, nikoliv pouhé tolerance. Svědci
potvrdili, že cesta byla udržována, opravována a užívána jako jediná
přístupová cesta k nemovitosti žalobce. Žalovaný ani jeho právní předchůdci
nikdy neprojevili nesouhlas s tímto užíváním.

Soud proto dovodil, že byly splněny všechny podmínky pro vydržení služebnosti
cesty podle § 1089 a násl. občanského zákoníku.
```

**Key Information:**
- ✅ Clear distinction: exercise of right vs. mere tolerance
- ✅ Specific facts: 30+ years, maintenance, sole access
- ✅ Court's reasoning: all conditions met
- ✅ Legal principle clearly stated

## What GPT-4o Receives (Current System)

### Truncated to 300 characters:
```
22 Cdo 2570/98: Nejvyšší soud rozhodl, že pro vydržení práva odpovídajícího
věcnému břemenu je třeba, aby držitel vykonával právo po celou vydržecí dobu
v dobré víře, pokojně, nepřeruš...
```

**Lost Information:**
- ❌ The crucial "pouhé strpění" distinction
- ❌ The specific facts that led to vydržení
- ❌ The reasoning why conditions were met
- ❌ The practical application guidance

## The Result in Synthesis

### What GPT-4o Writes (Generic):
```
"Soudy často zohledňují dlouhodobé užívání při posuzování vydržení..."
```

### What It SHOULD Write (Specific):
```
"Nejvyšší soud v 22 Cdo 2570/98 stanovil klíčové kritérium: nestačí pouhá
tolerance vlastníka (strpění průchodu), držba musí být vykonávána jako právo.
V našem případě 30leté udržování a opravování cesty sousedem pravděpodobně
splňuje toto kritérium aktivního výkonu práva, nikoliv pouhé tolerance."
```

## The Core Problem

**We have AMAZING data** in Vectorize:
- Full case texts with reasoning
- Legal principles (pravni_veta)
- Specific holdings
- Cross-references to statutes

**But we throw it away** by truncating to 300 chars!

## Simple Fix That Would Transform Quality

```javascript
// CURRENT (synthesize-multi-v2.ts line ~160):
const issueCases = result.cases.length > 0
  ? result.cases.map((c: any) => {
      const text = c.metadata?.text || '';
      return `Case ${caseId}: ${text.substring(0, 500)}...`;  // ← THE PROBLEM
    }).join('\n')

// PROPOSED:
const issueCases = result.cases.length > 0
  ? result.cases.map((c: any) => {
      const text = c.metadata?.text || '';
      const pravniVeta = c.metadata?.pravni_veta || '';

      return `Case ${caseId}:
        Právní věta: ${pravniVeta}
        Relevance k napětí: ${identifyRelevantTension(c, tensions)}
        Klíčové rozhodnutí: ${text.substring(0, 1500)}
        Řeší §§: ${c.metadata.sections_referenced?.join(', ')}`;
    }).join('\n\n')
```

## Impact of This Change

### Before (Generic Analysis):
"Judikatura suggests that long-term use can establish easement rights..."

### After (Specific Analysis):
"22 Cdo 2570/98 directly addresses your situation: 30 years of maintaining
a path as sole access, without owner objection, establishes easement through
vydržení because it shows 'exercise of right' not 'mere tolerance' - exactly
your neighbor's situation."

## Why This Matters

1. **We paid for expensive vector search** - why waste the results?
2. **We have rich metadata** - case weights, legal principles, cross-refs
3. **GPT-4o is capable** - it just needs the actual information
4. **Users want specific answers** - not generic legal essays

The system's architecture is brilliant, but we're bottlenecking at the final step by not giving GPT-4o the rich information we've already found!
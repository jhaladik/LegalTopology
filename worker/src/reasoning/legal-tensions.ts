/**
 * Legal Tensions - Core definitions for Czech legal topology
 * These tensions represent fundamental conflicts in legal reasoning
 */

export interface LegalTension {
  tension_type: string;
  competing_values: string[];
  strength: number;
  temporal_relevance?: boolean;
  power_dynamics_relevance?: boolean;
}

export interface TensionVectorStrategy {
  base_terms: string[];
  add_modifiers: string[];
  subtract_modifiers: string[];
  weight: number;
}

/**
 * Core legal tensions in Czech civil law
 */
export const LEGAL_TENSIONS = {
  // Fundamental tensions
  formal_vs_factual: {
    name: 'Forma vs. faktický stav',
    competing_values: ['formální náležitosti', 'faktická realita'],
    indicators: ['není zapsáno', 'fakticky vykonává', 'dlouhodobě užívá', 'bez formálního'],
    vector_strategy: {
      add: ['faktický stav', 'dlouhodobé užívání', 'dobrá víra', 'legitimní očekávání'],
      subtract: ['formální náležitosti', 'zápis v katastru', 'písemná forma']
    }
  },

  protection_vs_autonomy: {
    name: 'Ochrana slabšího vs. smluvní svoboda',
    competing_values: ['ochrana slabší strany', 'autonomie vůle'],
    indicators: ['spotřebitel', 'nerovné postavení', 'adhezní smlouva', 'zneužití postavení'],
    vector_strategy: {
      add: ['ochrana spotřebitele', 'nerovnováha sil', 'zneužití', 'slabší strana'],
      subtract: ['smluvní volnost', 'autonomie', 'B2B', 'profesionál']
    }
  },

  time_creates_rights: {
    name: 'Čas vytváří práva',
    competing_values: ['časový faktor', 'okamžité právo'],
    indicators: ['let', 'dlouhodobě', 'po dobu', 'vydržení', 'promlčení'],
    vector_strategy: {
      add: ['vydržení', 'promlčení', 'legitimní očekávání', 'dobromyslná držba'],
      subtract: ['okamžitost', 'novost', 'přerušení']
    }
  },

  substance_over_form: {
    name: 'Substance nad formou',
    competing_values: ['materiální pravda', 'formální správnost'],
    indicators: ['ve skutečnosti', 'reálně', 'fakticky', 'zastřený'],
    vector_strategy: {
      add: ['skutečný účel', 'materiální pravda', 'obcházení zákona', 'simulace'],
      subtract: ['formální náležitosti', 'procedura', 'forma']
    }
  },

  good_faith_vs_strict_law: {
    name: 'Dobrá víra vs. přísné právo',
    competing_values: ['dobrá víra', 'striktní aplikace'],
    indicators: ['nevěděl', 'nemohl vědět', 'důvodně spoléhal', 'v dobré víře'],
    vector_strategy: {
      add: ['dobrá víra', 'důvodné očekávání', 'ochrana dobromyslného', 'legitimní důvěra'],
      subtract: ['přísné právo', 'objektivní odpovědnost', 'ignorantia iuris']
    }
  },

  economic_efficiency_vs_fairness: {
    name: 'Ekonomická efektivita vs. spravedlnost',
    competing_values: ['ekonomická racionalita', 'materiální spravedlnost'],
    indicators: ['neúměrné', 'nepřiměřené', 'lichva', 'zneužití tísně'],
    vector_strategy: {
      add: ['spravedlnost', 'přiměřenost', 'ekvita', 'dobré mravy'],
      subtract: ['tržní mechanismus', 'ekonomická svoboda', 'podnikatelské riziko']
    }
  },

  prevention_vs_reparation: {
    name: 'Prevence vs. reparace',
    competing_values: ['předcházení škodám', 'náhrada škody'],
    indicators: ['hrozí škoda', 'předejít', 'zabránit', 'již vznikla škoda'],
    vector_strategy: {
      add: ['prevence', 'předběžné opatření', 'zdržení se', 'zákaz'],
      subtract: ['náhrada škody', 'kompenzace', 'reparace', 'odčinění']
    }
  },

  individual_vs_collective: {
    name: 'Individuální vs. kolektivní zájem',
    competing_values: ['soukromý zájem', 'veřejný zájem'],
    indicators: ['veřejný zájem', 'společné', 'komunita', 'soukromé právo'],
    vector_strategy: {
      add: ['veřejný zájem', 'společné dobro', 'veřejný pořádek'],
      subtract: ['soukromé vlastnictví', 'individuální svoboda', 'autonomie']
    }
  },

  certainty_vs_flexibility: {
    name: 'Právní jistota vs. flexibilita',
    competing_values: ['předvídatelnost', 'adaptabilita'],
    indicators: ['změna okolností', 'clausula rebus', 'nepředvídatelné', 'mimořádná událost'],
    vector_strategy: {
      add: ['flexibilita', 'změna poměrů', 'přizpůsobení', 'spravedlnost případu'],
      subtract: ['právní jistota', 'pacta sunt servanda', 'předvídatelnost']
    }
  },

  restitution_vs_stability: {
    name: 'Restituce vs. stabilita vztahů',
    competing_values: ['navrácení původního stavu', 'ochrana nabytých práv'],
    indicators: ['vrácení', 'restituce', 'neplatnost', 'nabyl v dobré víře'],
    vector_strategy: {
      add: ['navrácení', 'restituce', 'neplatnost od počátku', 'bezdůvodné obohacení'],
      subtract: ['ochrana třetích osob', 'stabilita', 'dobromyslné nabytí']
    }
  }
};

/**
 * Temporal thresholds that affect legal reasoning
 */
export const TEMPORAL_THRESHOLDS = {
  immediate: { max_days: 30, weight: 0.1 },
  short_term: { max_years: 1, weight: 0.3 },
  medium_term: { max_years: 3, weight: 0.5 },
  long_term: { max_years: 10, weight: 0.7 },
  prescriptive: { min_years: 10, weight: 0.9 },
  generational: { min_years: 30, weight: 0.95 }
};

/**
 * Power dynamics categories
 */
export const POWER_DYNAMICS = {
  equal: {
    indicators: ['podnikatel', 'B2B', 'profesionálové'],
    protection_weight: 0.0
  },
  slight_asymmetry: {
    indicators: ['malý podnikatel', 'OSVČ', 'franšíza'],
    protection_weight: 0.3
  },
  significant_asymmetry: {
    indicators: ['spotřebitel', 'zaměstnanec', 'nájemce bytu'],
    protection_weight: 0.7
  },
  extreme_asymmetry: {
    indicators: ['nezletilý', 'osoba s postižením', 'senior v tísni'],
    protection_weight: 0.95
  }
};

/**
 * Doctrine weights based on tension resolution
 */
export const DOCTRINE_TENSION_MAP = {
  vydržení: {
    resolves: ['formal_vs_factual', 'time_creates_rights'],
    creates: ['restitution_vs_stability'],
    primary_weight: 0.9
  },

  dobrá_víra: {
    resolves: ['good_faith_vs_strict_law', 'formal_vs_factual'],
    creates: ['certainty_vs_flexibility'],
    primary_weight: 0.8
  },

  bezdůvodné_obohacení: {
    resolves: ['economic_efficiency_vs_fairness', 'substance_over_form'],
    creates: ['restitution_vs_stability'],
    primary_weight: 0.85
  },

  ochrana_spotřebitele: {
    resolves: ['protection_vs_autonomy', 'economic_efficiency_vs_fairness'],
    creates: ['certainty_vs_flexibility'],
    primary_weight: 0.75
  },

  neplatnost: {
    resolves: ['substance_over_form', 'good_faith_vs_strict_law'],
    creates: ['restitution_vs_stability'],
    primary_weight: 0.7
  },

  náhrada_škody: {
    resolves: ['prevention_vs_reparation'],
    creates: ['economic_efficiency_vs_fairness'],
    primary_weight: 0.8
  },

  předběžné_opatření: {
    resolves: ['prevention_vs_reparation', 'time_creates_rights'],
    creates: ['certainty_vs_flexibility'],
    primary_weight: 0.6
  }
};

/**
 * Analyze text to identify legal tensions
 */
export function identifyTensions(text: string): string[] {
  const identifiedTensions: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [tensionKey, tension] of Object.entries(LEGAL_TENSIONS)) {
    for (const indicator of tension.indicators) {
      if (lowerText.includes(indicator.toLowerCase())) {
        identifiedTensions.push(tensionKey);
        break;
      }
    }
  }

  return [...new Set(identifiedTensions)]; // Remove duplicates
}

/**
 * Calculate tension strength based on temporal and power factors
 */
export function calculateTensionStrength(
  tensionType: string,
  temporalFactor?: number, // in years
  powerDynamic?: string
): number {
  let strength = 0.5; // Base strength

  // Adjust for temporal factor
  if (temporalFactor !== undefined) {
    if (tensionType === 'time_creates_rights' || tensionType === 'formal_vs_factual') {
      if (temporalFactor >= 30) strength = 0.95;
      else if (temporalFactor >= 10) strength = 0.85;
      else if (temporalFactor >= 3) strength = 0.7;
      else strength = 0.4;
    }
  }

  // Adjust for power dynamics
  if (powerDynamic && tensionType === 'protection_vs_autonomy') {
    const dynamic = POWER_DYNAMICS[powerDynamic as keyof typeof POWER_DYNAMICS];
    if (dynamic) {
      strength = Math.max(strength, dynamic.protection_weight);
    }
  }

  return strength;
}

/**
 * Generate vector strategies from identified tensions
 */
export function generateVectorStrategies(tensions: LegalTension[]): TensionVectorStrategy[] {
  const strategies: TensionVectorStrategy[] = [];

  // Sort tensions by strength
  const sortedTensions = [...tensions].sort((a, b) => b.strength - a.strength);

  for (const tension of sortedTensions) {
    const tensionDef = LEGAL_TENSIONS[tension.tension_type as keyof typeof LEGAL_TENSIONS];
    if (!tensionDef) continue;

    strategies.push({
      base_terms: tension.competing_values,
      add_modifiers: tensionDef.vector_strategy.add,
      subtract_modifiers: tensionDef.vector_strategy.subtract,
      weight: tension.strength
    });
  }

  return strategies;
}

/**
 * Test for legal absurdity - what would happen without the primary doctrine
 */
export function performAbsurdityTest(
  situation: string,
  primaryDoctrine: string
): { absurd_result: string; confirms_doctrine: boolean } {
  // This is a simplified version - in production, this would use LLM
  const absurdityMap: Record<string, string> = {
    vydržení: 'Faktický uživatel by po 30 letech musel vrátit vše formálnímu vlastníkovi',
    dobrá_víra: 'Dobromyslný nabyvatel by ztratil vše ve prospěch podvodníka',
    bezdůvodné_obohacení: 'Ten kdo neoprávněně profituje by si mohl vše ponechat',
    ochrana_spotřebitele: 'Spotřebitel by neměl žádnou ochranu proti velkým korporacím',
    náhrada_škody: 'Škůdce by nemusel nahradit způsobenou škodu'
  };

  const absurd_result = absurdityMap[primaryDoctrine] ||
    'Právní řád by postrádal mechanismus řešení této situace';

  return {
    absurd_result,
    confirms_doctrine: true
  };
}
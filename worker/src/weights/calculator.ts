import { JudicialMetadata } from '../types/metadata';

const COURT_WEIGHTS: Record<string, number> = {
  'Nejvyšší soud': 10.0,
  'Supreme Court': 10.0,
  'Vrchní soud': 5.0,
  'High Court': 5.0,
  'Krajský soud': 2.0,
  'Regional Court': 2.0,
  'Okresní soud': 1.0,
  'District Court': 1.0
};

export function calculateDecisionWeight(metadata: JudicialMetadata | Record<string, any>): number {
  let weight = 1.0;

  const courtWeight = COURT_WEIGHTS[metadata.court] || 1.0;
  weight *= courtWeight;

  const decisionDate = new Date(metadata.date);
  const now = new Date();
  const yearsOld = (now.getTime() - decisionDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const recency = Math.exp(-0.15 * yearsOld);
  weight *= recency;

  const citationCount = metadata.citation_count || 0;
  const citationFactor = 1 + Math.log1p(citationCount) * 0.2;
  weight *= citationFactor;

  if (metadata.is_binding) {
    weight *= 2.0;
  }

  if (metadata.en_banc) {
    weight *= 1.5;
  }

  if (metadata.overruled) {
    weight *= 0.1;
  }

  return weight;
}

export function calculateStatuteWeight(): number {
  return 1.0;
}
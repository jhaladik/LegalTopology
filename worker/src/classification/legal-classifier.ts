export interface LegalClassification {
  legal_framework: string;
  relationship_type: string;
  subject_matter: string;
  legal_area: string;
}

export function classifyStatute(section: string, text: string): LegalClassification {
  if (section.match(/^(913|914|915)$/)) {
    return {
      legal_framework: "parent_child_support",
      relationship_type: "ascending",
      subject_matter: "maintenance_obligations",
      legal_area: "family_law"
    };
  }

  if (section.match(/^(910|911|912)$/)) {
    return {
      legal_framework: "child_support",
      relationship_type: "descending",
      subject_matter: "maintenance_obligations",
      legal_area: "family_law"
    };
  }

  if (section.match(/^(761|762|763)$/)) {
    return {
      legal_framework: "spousal_support",
      relationship_type: "spousal",
      subject_matter: "maintenance_obligations",
      legal_area: "family_law"
    };
  }

  if (section.match(/^(2767|2768|2769)$/)) {
    return {
      legal_framework: "insurance_consent",
      relationship_type: "third_party_property",
      subject_matter: "insurance_contracts",
      legal_area: "insurance_law"
    };
  }

  if (section.match(/^(2758|2759|2760)$/)) {
    return {
      legal_framework: "insurance_formation",
      relationship_type: "contractual",
      subject_matter: "insurance_contracts",
      legal_area: "insurance_law"
    };
  }

  if (section.match(/^(1724|1725|1726)$/)) {
    return {
      legal_framework: "contract_formation",
      relationship_type: "contractual",
      subject_matter: "contract_validity",
      legal_area: "contract_law"
    };
  }

  if (section.match(/^(34|94|96|97|98)$/)) {
    return {
      legal_framework: "consent_requirements",
      relationship_type: "general",
      subject_matter: "legal_acts_form",
      legal_area: "general_civil_law"
    };
  }

  if (section.match(/^(976|980|1040|1099|1105)$/)) {
    return {
      legal_framework: "property_ownership",
      relationship_type: "property_rights",
      subject_matter: "ownership_acquisition",
      legal_area: "property_law"
    };
  }

  return {
    legal_framework: "general_civil_law",
    relationship_type: "general",
    subject_matter: "civil_obligations",
    legal_area: "civil_law"
  };
}

export function classifyDecision(metadata: any): LegalClassification {
  const sections = metadata.statute_refs || [];

  for (const sectionRef of sections) {
    const sectionNum = sectionRef.replace('§', '');
    const classification = classifyStatute(sectionNum, '');

    if (classification.legal_framework !== 'general_civil_law') {
      return classification;
    }
  }

  return {
    legal_framework: "general_civil_law",
    relationship_type: "judicial",
    subject_matter: "court_interpretation",
    legal_area: "civil_law"
  };
}

export function inferQueryContext(question: string): string | null {
  const lowerQ = question.toLowerCase();

  if ((lowerQ.includes('syn') || lowerQ.includes('potomci') || lowerQ.includes('potomk')) &&
      (lowerQ.includes('výživné') || lowerQ.includes('vyživné') || lowerQ.includes('vyživovac') ||
       lowerQ.includes('alimenty') || lowerQ.match(/v[yi].ivn/))) {
    return 'parent_child_support';
  }

  if ((lowerQ.includes('dítě') || lowerQ.includes('dite') || lowerQ.includes('rodič') || lowerQ.includes('rodic')) &&
      (lowerQ.includes('výživné') || lowerQ.includes('vyživné') || lowerQ.includes('vyživovac') || lowerQ.match(/v[yi].ivn/))) {
    return 'child_support';
  }

  if ((lowerQ.includes('manžel') || lowerQ.includes('manzel') || lowerQ.includes('rozvedený') || lowerQ.includes('rozveden')) &&
      (lowerQ.includes('výživné') || lowerQ.includes('vyživné') || lowerQ.includes('vyživovac') || lowerQ.match(/v[yi].ivn/))) {
    return 'spousal_support';
  }

  if (lowerQ.includes('pojist') && (lowerQ.includes('souhlas') || lowerQ.includes('consent'))) {
    return 'insurance_consent';
  }

  if (lowerQ.includes('smlouva') && (lowerQ.includes('platnost') || lowerQ.includes('uzavření') || lowerQ.includes('uzavreni'))) {
    return 'contract_formation';
  }

  return null;
}
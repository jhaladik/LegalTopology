export interface DomainClassificationResult {
  is_civil_law: boolean;
  confidence: number;
  detected_domains: string[];
  recommendation: 'proceed' | 'reject' | 'clarify';
  reasoning: string;
}

export interface QueryIssue {
  id: string;
  type: string;
  description: string;
  priority: string;
}

export interface LegalResearch {
  issue: string;
  statutes_found: number;
  cases_found: number;
  top_sections: string[];
}

export interface StatutoryFoundation {
  section: string;
  text: string;
  relevance: number;
  relevant_to_issues: string[];
}

export interface CaseLaw {
  case_id: string;
  weight: number;
  text: string;
  relevance: number;
  relevant_to_issues: string[];
}

export interface SynthesisResult {
  question: string;
  facts?: Record<string, any>;
  query_decomposition: {
    complexity: string;
    total_issues: number;
    issues: QueryIssue[];
  };
  legal_research: LegalResearch[];
  statutory_foundation: StatutoryFoundation[];
  case_law: CaseLaw[];
  analysis: string;
  metadata: {
    model: string;
    max_tokens: number;
    total_statutes: number;
    total_cases: number;
    multi_issue: boolean;
    analysis_depth: string;
    includes_strategy: boolean;
  };
}

export async function classifyDomain(
  baseUrl: string,
  question: string
): Promise<DomainClassificationResult> {
  const response = await fetch(`${baseUrl}/api/classify-domain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Domain classification failed');
  }

  return await response.json();
}

export async function synthesizeMultiIssue(
  baseUrl: string,
  question: string,
  useTensions: boolean = true
): Promise<SynthesisResult> {
  // Use V2 endpoint for tension-based analysis
  const endpoint = useTensions ? '/api/synthesize-multi-v2' : '/api/synthesize-multi';

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, use_tensions: useTensions })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Multi-issue synthesis failed');
  }

  return await response.json();
}
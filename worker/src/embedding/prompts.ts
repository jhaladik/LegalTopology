import { StatuteMetadata, JudicialMetadata } from '../types/metadata';

export function prepareStatuteText(text: string, metadata: StatuteMetadata): string {
  const chapter = metadata.chapter ? ` - ${metadata.chapter}` : '';

  return `Legal Statute - Civil Code Section §${metadata.section}${chapter}

${text}

[This is a statutory provision from Czech Civil Code, effective ${metadata.version_date}]`;
}

export function prepareDecisionText(text: string, metadata: JudicialMetadata): string {
  const refs = metadata.statute_refs?.length > 0
    ? metadata.statute_refs.join(', ')
    : 'general principles';

  const year = new Date(metadata.date).getFullYear();

  return `Court Decision - ${metadata.court} (${year})
Case: ${metadata.case_id}
Interprets: ${refs}

${text}

[This is judicial interpretation from Czech ${metadata.court}]`;
}
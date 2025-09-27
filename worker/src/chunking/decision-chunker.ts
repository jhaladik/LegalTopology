import { DecisionChunk } from '../types/chunks';
import { extractStatuteReferences } from './utils';

interface DecisionBaseMetadata {
  case_id: string;
  court: string;
  date: string;
  is_binding?: boolean;
  en_banc?: boolean;
  citation_count?: number;
  overruled?: boolean;
  cites?: string[];
}

export interface ParsedDecision {
  case_id: string;
  court: string;
  date: string;
  ecli?: string;
  decision_number?: string;
  decision_type?: string;
  legal_area?: string;
  pravni_veta: string;
  full_text: string;
  sections_referenced: string[];
}

export function parseDecision(text: string): ParsedDecision {
  const lines = text.split('\n');

  let case_id = '';
  let court = '';
  let date = '';
  let ecli = '';
  let decision_number = '';
  let decision_type = '';
  let legal_area = '';
  let pravni_veta = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('sp. zn.')) {
      const match = line.match(/sp\.\s*zn\.\s*([\d\s\w\/]+)/);
      if (match) case_id = match[1].trim();
    }

    if (line.includes('ECLI:')) {
      const match = line.match(/ECLI:([\w\d\.:]+)/);
      if (match) ecli = match[1].trim();
    }

    if (line.startsWith('Soud:')) {
      court = line.replace('Soud:', '').trim();
    }

    if (line.includes('Datum rozhodnutí:') || line.includes('Datum rozhodnut')) {
      const match = line.match(/\d{2}\.\d{2}\.\d{4}/);
      if (match) {
        const parts = match[0].split('.');
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    if (line.includes('Číslo rozhodnutí:') || line.includes('slo rozhodnut')) {
      const match = line.match(/\d+\/\d+/);
      if (match) decision_number = match[0];
    }

    if (line.includes('Typ rozhodnutí:') || line.includes('Typ rozhodnut')) {
      decision_type = line.split(':')[1]?.trim() || '';
    }

    if (line.startsWith('Hesla:')) {
      legal_area = line.replace('Hesla:', '').trim();
    }

    if (line.includes('Právní věta:') || line.includes('vn') && line.includes('ta:')) {
      let veta = '';
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('Soud:') || nextLine.startsWith('Datum')) break;
        if (nextLine.length > 20) {
          veta += nextLine + ' ';
          if (nextLine.endsWith('.')) break;
        }
      }
      pravni_veta = veta.trim();
      break;
    }
  }

  const sections = extractStatuteReferences(text);

  return {
    case_id: case_id || 'unknown',
    court: court || 'Nejvyšší soud',
    date: date || new Date().toISOString().split('T')[0],
    ecli,
    decision_number,
    decision_type,
    legal_area,
    pravni_veta: pravni_veta || text.slice(0, 500),
    full_text: text,
    sections_referenced: sections
  };
}

function splitDecisionBySections(text: string): { section: string; content: string }[] {
  const sections: { section: string; content: string }[] = [];

  const sectionRegex = /^(I{1,4}|V{1,3})\.\s*$/gm;
  const matches = [...text.matchAll(sectionRegex)];

  if (matches.length === 0) {
    return [{ section: 'full', content: text }];
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const sectionName = match[1];
    const startIdx = match.index! + match[0].length;
    const endIdx = matches[i + 1]?.index ?? text.length;
    const content = text.slice(startIdx, endIdx).trim();

    if (content.length > 100) {
      sections.push({ section: sectionName, content });
    }
  }

  return sections.length > 0 ? sections : [{ section: 'full', content: text }];
}

export function chunkDecision(
  text: string,
  metadata: DecisionBaseMetadata
): DecisionChunk[] {
  const chunks: DecisionChunk[] = [];
  const parsed = parseDecision(text);
  const caseIdSafe = metadata.case_id.replace(/\s+/g, '_');

  const statuteRefs = extractStatuteReferences(text);

  chunks.push({
    id: `decision_${caseIdSafe}_principle`,
    text: parsed.pravni_veta,
    metadata: {
      type: 'judicial',
      subtype: 'principle',
      case_id: metadata.case_id,
      court: metadata.court,
      date: metadata.date,
      statute_refs: statuteRefs,
      is_binding: metadata.is_binding ?? true,
      en_banc: metadata.en_banc,
      citation_count: metadata.citation_count || 0,
      overruled: metadata.overruled || false,
      cites: metadata.cites
    }
  });

  const sections = splitDecisionBySections(parsed.full_text);

  sections.forEach((section, idx) => {
    const MAX_CHARS = 14000;
    let sectionText = section.content;

    if (sectionText.length > MAX_CHARS) {
      sectionText = sectionText.slice(0, MAX_CHARS) + '\n\n[Section continues...]';
    }

    chunks.push({
      id: `decision_${caseIdSafe}_section_${section.section}_${idx}`,
      text: sectionText,
      metadata: {
        type: 'judicial',
        subtype: 'full_decision',
        case_id: metadata.case_id,
        court: metadata.court,
        date: metadata.date,
        statute_refs: statuteRefs,
        is_binding: metadata.is_binding ?? true,
        en_banc: metadata.en_banc,
        citation_count: metadata.citation_count || 0,
        overruled: metadata.overruled || false,
        cites: metadata.cites
      }
    });
  });

  return chunks;
}
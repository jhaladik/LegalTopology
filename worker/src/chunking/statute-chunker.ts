import { StatuteChunk } from '../types/chunks';
import {
  splitByParagraphMarkers,
  slidingWindowChunk,
  estimateTokens
} from './utils';

interface StatuteBaseMetadata {
  version_date: string;
  source: string;
  book?: string;
  chapter?: string;
}

export function chunkStatute(
  text: string,
  baseMetadata: StatuteBaseMetadata
): StatuteChunk[] {
  const chunks: StatuteChunk[] = [];

  const sectionRegex = /§\s*(\d+)/g;
  const sections = text.split(sectionRegex);

  for (let i = 1; i < sections.length; i += 2) {
    const sectionNum = sections[i];
    const sectionText = sections[i + 1];

    if (!sectionText || sectionText.trim().length < 20) continue;

    const fullSectionText = sectionText.trim();
    const estimatedTokens = estimateTokens(fullSectionText);

    if (estimatedTokens > 1000) {
      const subChunks = slidingWindowChunk(fullSectionText, 4000, 400);
      subChunks.forEach((subChunk, subIdx) => {
        chunks.push({
          id: `statute_${sectionNum}_${subIdx}`,
          text: subChunk,
          metadata: {
            type: 'statute',
            section: sectionNum,
            sub_chunk: subIdx,
            ...baseMetadata
          }
        });
      });
    } else {
      chunks.push({
        id: `statute_${sectionNum}`,
        text: fullSectionText,
        metadata: {
          type: 'statute',
          section: sectionNum,
          ...baseMetadata
        }
      });
    }
  }

  return chunks;
}
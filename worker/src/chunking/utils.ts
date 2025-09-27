export function splitByParagraphMarkers(text: string): string[] {
  const paraRegex = /\((\d+)\)/g;
  const parts = text.split(paraRegex);

  const paragraphs: string[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const paraNum = parts[i];
    const paraText = parts[i + 1];
    if (paraText && paraText.trim()) {
      paragraphs.push(`(${paraNum}) ${paraText.trim()}`);
    }
  }

  return paragraphs.length > 0 ? paragraphs : [text];
}

export function slidingWindowChunk(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }

  return chunks;
}

export function extractStatuteReferences(text: string): string[] {
  const refs: string[] = [];
  const regex = /§\s*(\d+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    refs.push(`§${match[1]}`);
  }

  return [...new Set(refs)];
}

export function estimateTokens(text: string): number {
  return text.length / 4;
}
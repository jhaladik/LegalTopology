import { Env } from '../embedding/openai-client';
import { chunkDecision, parseDecision } from '../chunking/decision-chunker';
import { calculateDecisionWeight } from '../weights/calculator';
import { QueueService } from '../services/queue-service';
import { DecisionService } from '../services/decision-service';

interface DecisionMetadata {
  case_id: string;
  court: string;
  date: string;
  is_binding?: boolean;
  en_banc?: boolean;
  citation_count?: number;
  overruled?: boolean;
  cites?: string[];
}

export async function ingestDecision(
  request: Request,
  env: Env & { VECTORIZE: any; DOCUMENTS: any; DB: D1Database },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let decisionText: string;
    let metadata: DecisionMetadata;
    let parsed: any;
    let file: File | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json() as { text: string; metadata: DecisionMetadata };
      decisionText = body.text;
      parsed = parseDecision(decisionText);
      metadata = { ...body.metadata, ...parsed };
    } else {
      const formData = await request.formData();
      file = formData.get('file') as File | null;
      const textContent = formData.get('text') as string | null;
      const metadataJson = formData.get('metadata') as string | null;

      if (textContent) {
        decisionText = textContent;
      } else if (file) {
        const pdfBuffer = await file.arrayBuffer();
        decisionText = await extractPDFText(pdfBuffer);
      } else {
        return new Response('File or text required', { status: 400 });
      }

      parsed = parseDecision(decisionText);

      metadata = metadataJson
        ? { ...JSON.parse(metadataJson), ...parsed }
        : {
            case_id: parsed.case_id,
            court: parsed.court,
            date: parsed.date,
            is_binding: true,
            citation_count: 0
          };

        if (file) {
          const pdfBuffer = await file.arrayBuffer();
          await env.DOCUMENTS.put(
            `decisions/${metadata.case_id.replace(/\s+/g, '_')}.pdf`,
            pdfBuffer,
            {
              customMetadata: {
                case_id: metadata.case_id,
                court: metadata.court,
                date: metadata.date
              } as any
            }
          );
        }
    }

    const weight = calculateDecisionWeight(metadata);

    const decisionService = new DecisionService(env.DB);
    await decisionService.storeDecision(parsed, weight);

    const chunks = chunkDecision(decisionText, metadata);

    console.log(`Created ${chunks.length} chunks from decision ${metadata.case_id}`);

    const chunksWithWeight = chunks.map((chunk, idx) => {
      const isPrinciple = chunk.metadata.subtype === 'principle';
      const chunkWeight = isPrinciple ? weight * 1.2 : weight;

      return {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          weight: chunkWeight
        }
      };
    });

    const queueService = new QueueService(env.DB);
    const added = await queueService.addChunks(chunksWithWeight, 10);

    if (metadata.cites && metadata.cites.length > 0) {
      for (const citedCase of metadata.cites) {
        await decisionService.addCitation(metadata.case_id, citedCase);
      }
    }

    return new Response(
      JSON.stringify({
        status: 'queued',
        case_id: metadata.case_id,
        chunks: chunks.length,
        weight: weight,
        queued: added,
        pravni_veta: parsed.pravni_veta,
        sections_referenced: parsed.sections_referenced
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error ingesting decision:', error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}


async function extractPDFText(buffer: ArrayBuffer): Promise<string> {
  const { extractText } = await import('unpdf');
  const { text } = await extractText(new Uint8Array(buffer));
  return text;
}
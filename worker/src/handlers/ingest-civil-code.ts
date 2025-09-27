import { Env } from '../embedding/openai-client';
import { chunkStatute } from '../chunking/statute-chunker';
import { QueueService } from '../services/queue-service';

export async function ingestCivilCode(
  request: Request,
  env: Env & { VECTORIZE: any; DOCUMENTS: any; DB: any },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const useR2 = formData.get('useR2') === 'true';

    let fileBuffer: ArrayBuffer;
    let fileName: string = '';

    if (useR2) {
      const filename = formData.get('filename') as string;
      const object = await env.DOCUMENTS.get(filename);
      if (!object) {
        return new Response('File not found in R2', { status: 404 });
      }
      fileBuffer = await object.arrayBuffer();
      fileName = filename;
    } else {
      if (!file) {
        return new Response('No file provided', { status: 400 });
      }
      fileBuffer = await file.arrayBuffer();
      fileName = file.name;
    }

    const fileText = fileName.endsWith('.docx')
      ? await extractDOCXText(fileBuffer)
      : await extractPDFText(fileBuffer);

    const chunks = chunkStatute(fileText, {
      type: 'civil_code',
      version_date: '2025-07-01',
      source: 'czech_civil_code_2012'
    });

    console.log(`Created ${chunks.length} chunks from civil code`);

    const queueService = new QueueService(env.DB);
    const added = await queueService.addChunks(chunks, 0);

    return new Response(
      JSON.stringify({
        status: 'queued',
        total_chunks: chunks.length,
        chunks_added: added,
        message: 'Civil code chunks added to processing queue. Processing will happen via cron job.'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error ingesting civil code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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

async function extractDOCXText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}
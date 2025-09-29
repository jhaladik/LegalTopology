import { Env } from '../embedding/openai-client';
import { chunkDecision } from '../chunking/decision-chunker';
import { calculateDecisionWeight } from '../weights/calculator';
import { QueueService } from '../services/queue-service';
import { DecisionService } from '../services/decision-service';

interface XMLDecisionMetadata {
  case_id: string;
  court: string;
  date: string;
  author?: string;
  ecli?: string;
  subject?: string;
  keywords?: string[];
  statute_refs?: string[];
  is_binding?: boolean;
  citation_count?: number;
}

interface XMLDocument {
  JednaciCislo: string;
  Soud: string;
  Autor?: string;
  ECLI?: string;
  PredmetRizeni?: string;
  DatumVydani: string;
  DatumZverejneni?: string;
  KlicovaSlova?: { KlicoveSlovo: string | string[] };
  ZminenaUstanoveni?: { ZmineneUstanovení: string | string[] };
  Vyrok?: string;
  Oduvodneni?: string;
}

function parseXMLDecision(doc: XMLDocument): { text: string; metadata: XMLDecisionMetadata } {
  const caseId = doc.JednaciCislo;
  const court = doc.Soud;
  const date = doc.DatumVydani;
  const author = doc.Autor;
  const ecli = doc.ECLI;
  const subject = doc.PredmetRizeni;

  let keywords: string[] = [];
  if (doc.KlicovaSlova?.KlicoveSlovo) {
    if (Array.isArray(doc.KlicovaSlova.KlicoveSlovo)) {
      keywords = doc.KlicovaSlova.KlicoveSlovo;
    } else {
      keywords = [doc.KlicovaSlova.KlicoveSlovo];
    }
  }

  let statutes: string[] = [];
  if (doc.ZminenaUstanoveni?.ZmineneUstanovení) {
    if (Array.isArray(doc.ZminenaUstanoveni.ZmineneUstanovení)) {
      statutes = doc.ZminenaUstanoveni.ZmineneUstanovení;
    } else {
      statutes = [doc.ZminenaUstanoveni.ZmineneUstanovení];
    }
  }

  const extractedStatutes = statutes
    .map(s => {
      const match = s.match(/§\s*(\d+[a-z]?)/i);
      return match ? `§${match[1]}` : null;
    })
    .filter(Boolean) as string[];

  const vyrok = doc.Vyrok || '';
  const oduvodneni = doc.Oduvodneni || '';

  const fullText = `Soud: ${court}

Spisová značka: ${caseId}

Datum rozhodnutí: ${date}

Typ rozhodnutí: ROZSUDEK

${keywords.length > 0 ? `Klíčová slova: ${keywords.join(', ')}` : ''}

${extractedStatutes.length > 0 ? `Dotčené předpisy: ${extractedStatutes.join(', ')}` : ''}

${subject ? `Předmět řízení: ${subject}` : ''}

VÝROK

${vyrok}

ODŮVODNĚNÍ

${oduvodneni}`;

  const isSupremeCourt = court.toLowerCase().includes('nejvyšší');

  const metadata: XMLDecisionMetadata = {
    case_id: caseId,
    court: court,
    date: date,
    author: author,
    ecli: ecli,
    subject: subject,
    keywords: keywords,
    statute_refs: extractedStatutes,
    is_binding: isSupremeCourt,
    citation_count: 0
  };

  return { text: fullText, metadata };
}

async function parseXMLFile(xmlContent: string): Promise<XMLDocument[]> {
  const { XMLParser } = await import('fast-xml-parser');

  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreDeclaration: true,
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: false,
    allowBooleanAttributes: true
  };

  const parser = new XMLParser(options);
  const result = parser.parse(xmlContent);

  console.log('[XML Parser] Parsed XML structure');

  if (!result.Dokumenty) {
    console.error('[XML Parser] No Dokumenty root element found');
    return [];
  }

  const dokumenty = result.Dokumenty;

  if (!dokumenty.Dokument) {
    console.error('[XML Parser] No Dokument elements found');
    return [];
  }

  const docs = Array.isArray(dokumenty.Dokument) ? dokumenty.Dokument : [dokumenty.Dokument];

  console.log(`[XML Parser] Found ${docs.length} Dokument elements`);

  const documents: XMLDocument[] = [];

  for (const doc of docs) {
    const getArrayFromField = (field: any): string[] => {
      if (!field) return [];

      if (typeof field === 'string') {
        return [field];
      }

      if (field.KlicoveSlovo) {
        return Array.isArray(field.KlicoveSlovo) ? field.KlicoveSlovo : [field.KlicoveSlovo];
      }

      if (field['ZmineneUstanovení']) {
        return Array.isArray(field['ZmineneUstanovení']) ? field['ZmineneUstanovení'] : [field['ZmineneUstanovení']];
      }

      return [];
    };

    const klicovaSlova = getArrayFromField(doc.KlicovaSlova);
    const zminenaUstanoveni = getArrayFromField(doc.ZminenaUstanoveni);

    const xmlDoc: XMLDocument = {
      JednaciCislo: doc.JednaciCislo || '',
      Soud: doc.Soud || '',
      Autor: doc.Autor,
      ECLI: doc.ECLI,
      PredmetRizeni: doc.PredmetRizeni,
      DatumVydani: doc.DatumVydani || '',
      DatumZverejneni: doc.DatumZverejneni,
      KlicovaSlova: klicovaSlova.length > 0 ? { KlicoveSlovo: klicovaSlova } : undefined,
      ZminenaUstanoveni: zminenaUstanoveni.length > 0 ? { ZmineneUstanovení: zminenaUstanoveni } : undefined,
      Vyrok: doc.Vyrok,
      Oduvodneni: doc.Oduvodneni
    };

    if (xmlDoc.JednaciCislo && xmlDoc.Soud && xmlDoc.DatumVydani) {
      documents.push(xmlDoc);
    } else {
      console.warn(`[XML Parser] Skipping document missing required fields:`, {
        JednaciCislo: xmlDoc.JednaciCislo,
        Soud: xmlDoc.Soud,
        DatumVydani: xmlDoc.DatumVydani
      });
    }
  }

  return documents;
}

export async function ingestXMLDecisions(
  request: Request,
  env: Env & { VECTORIZE: any; DOCUMENTS: any; DB: D1Database },
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let xmlContent: string;

    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      xmlContent = await request.text();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return new Response('XML file required', { status: 400 });
      }

      xmlContent = await file.text();
    } else {
      return new Response('Invalid content type. Expected XML.', { status: 400 });
    }

    console.log('[XML Ingestion] Parsing XML file...');
    const xmlDocuments = await parseXMLFile(xmlContent);
    console.log(`[XML Ingestion] Found ${xmlDocuments.length} decisions in XML`);

    const queueService = new QueueService(env.DB);
    const decisionService = new DecisionService(env.DB);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const xmlDoc of xmlDocuments) {
      try {
        const { text, metadata } = parseXMLDecision(xmlDoc);

        const weight = calculateDecisionWeight(metadata);

        await decisionService.storeDecision({
          case_id: metadata.case_id,
          court: metadata.court,
          date: metadata.date,
          ecli: metadata.ecli,
          decision_number: undefined,
          decision_type: 'ROZSUDEK',
          legal_area: metadata.subject,
          pravni_veta: metadata.keywords?.join('; ') || '',
          full_text: text,
          sections_referenced: metadata.statute_refs || []
        }, weight);

        const chunks = chunkDecision(text, metadata);

        console.log(`[XML Ingestion] Created ${chunks.length} chunks from decision ${metadata.case_id}`);

        const chunksWithWeight = chunks.map((chunk) => {
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

        await queueService.addChunks(chunksWithWeight);

        successCount++;

      } catch (error: any) {
        errorCount++;
        const errorMsg = `Error processing ${xmlDoc.JednaciCislo}: ${error.message}`;
        console.error(`[XML Ingestion] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_documents: xmlDocuments.length,
        success_count: successCount,
        error_count: errorCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        message: `Successfully queued ${successCount} decisions for ingestion. ${errorCount} errors.`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[XML Ingestion] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
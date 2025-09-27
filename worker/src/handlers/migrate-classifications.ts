import { classifyStatute, classifyDecision } from '../classification/legal-classifier';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function migrateClassifications(
  request: Request,
  env: any,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { batchSize = 50, startFrom = 0 } = body;

    let processed = 0;
    let updated = 0;
    let errors = 0;

    while (processed < 500) {
      console.log(`Processing batch starting from ${startFrom + processed}`);

      const results = await env.VECTORIZE.query(
        new Array(1536).fill(0),
        {
          topK: Math.min(batchSize, 50),
          returnMetadata: 'all',
          returnValues: false,
          filter: { classified: { $ne: true } }
        }
      );

      if (!results.matches || results.matches.length === 0) {
        console.log('No more unclassified items found');
        break;
      }

      const updates = [];

      for (const match of results.matches) {
        try {
          const metadata = match.metadata;
          let classification;

          if (metadata.type === 'statute' || metadata.type === 'civil_code') {
            classification = classifyStatute(metadata.section, metadata.text || '');
          } else if (metadata.type === 'judicial') {
            classification = classifyDecision(metadata);
          } else {
            continue;
          }

          const existingVector = await env.VECTORIZE.getByIds([match.id]);
          const vectorValues = existingVector[0]?.values || match.values;

          updates.push({
            id: match.id,
            values: vectorValues,
            metadata: {
              ...metadata,
              ...classification,
              classified: true,
              classification_version: '1.0',
              classified_at: new Date().toISOString()
            }
          });

        } catch (error) {
          console.error(`Error classifying ${match.id}:`, error);
          errors++;
        }
      }

      if (updates.length > 0) {
        await env.VECTORIZE.upsert(updates);
        updated += updates.length;
        console.log(`Updated ${updates.length} items in this batch`);
      }

      processed += results.matches.length;

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return new Response(
      JSON.stringify({
        status: 'completed',
        processed: processed,
        updated: updated,
        errors: errors,
        message: `Batch completed. Total processed: ${processed}, updated: ${updated}, errors: ${errors}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
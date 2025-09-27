import { ingestCivilCode } from './handlers/ingest-civil-code';
import { ingestDecision } from './handlers/ingest-decision';
import { queryTopology } from './handlers/query';
import { recomputeWeights } from './handlers/recompute-weights';
import { synthesizeInterpretation } from './handlers/synthesize';
import { synthesizeMultiIssue } from './handlers/synthesize-multi';
import { migrateClassifications } from './handlers/migrate-classifications';
import { exploreTopology } from './handlers/explore-topology';
import { queryTopology as queryTopologyV2 } from './handlers/query-topology';
import { synthesizeTopology } from './handlers/synthesize-topology';
import { QueueService } from './services/queue-service';
import { ProcessorService } from './services/processor-service';

export interface Env {
  VECTORIZE: VectorizeIndex;
  DOCUMENTS: R2Bucket;
  DB: D1Database;
  PROCESSING_QUEUE: KVNamespace;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  EMBEDDING_DIMENSIONS: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (url.pathname) {
        case '/api/ingest/civil-code':
          return await ingestCivilCode(request, env, ctx);

        case '/api/ingest/decision':
          return await ingestDecision(request, env, ctx);

        case '/api/query':
          return await queryTopology(request, env, ctx);

        case '/api/synthesize':
          return await synthesizeInterpretation(request, env, ctx);

        case '/api/synthesize-multi':
          return await synthesizeMultiIssue(request, env, ctx);

        case '/api/weights/recompute':
          return await recomputeWeights(request, env, ctx);

        case '/api/queue/stats':
          return await handleQueueStats(env);

        case '/api/queue/process':
          return await handleProcessQueue(env);

        case '/api/queue/clear':
          return await handleClearQueue(env);

        case '/api/queue/retry':
          return await handleRetryFailed(env);

        case '/api/migrate/classifications':
          return await migrateClassifications(request, env, ctx);

        case '/api/topology/explore':
          return await exploreTopology(request, env, ctx);

        case '/api/topology/query':
          return await queryTopologyV2(request, env, ctx);

        case '/api/topology/synthesize':
          return await synthesizeTopology(request, env, ctx);

        case '/api/health':
          return new Response(
            JSON.stringify({
              status: 'ok',
              timestamp: new Date().toISOString(),
              version: '1.0.0'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );

        case '/':
          return new Response(
            JSON.stringify({
              service: 'Legal Topology API',
              version: '1.0.0',
              endpoints: [
                'POST /api/ingest/civil-code',
                'POST /api/ingest/decision',
                'POST /api/query',
                'POST /api/weights/recompute',
                'GET /api/health'
              ]
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );

        default:
          return new Response(
            JSON.stringify({ error: 'Not Found' }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }
    } catch (error: any) {
      console.error('Worker error:', error);
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
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[Scheduled] Processing queue...');

    try {
      const queueService = new QueueService(env.DB);
      const processor = new ProcessorService(queueService, env);

      const result = await processor.processNextBatch(50);

      console.log('[Scheduled] Batch processed:', result);

      if (result.remaining > 0) {
        console.log(`[Scheduled] ${result.remaining} items remaining in queue`);
      } else {
        console.log('[Scheduled] Queue is empty');
      }
    } catch (error: any) {
      console.error('[Scheduled] Processing failed:', error);
    }
  }
};

async function handleQueueStats(env: Env): Promise<Response> {
  try {
    const queueService = new QueueService(env.DB);
    const stats = await queueService.getStats();

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleProcessQueue(env: Env): Promise<Response> {
  try {
    const queueService = new QueueService(env.DB);
    const processor = new ProcessorService(queueService, env);

    const result = await processor.processNextBatch(50);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleClearQueue(env: Env): Promise<Response> {
  try {
    const queueService = new QueueService(env.DB);
    await queueService.clearAll();

    return new Response(
      JSON.stringify({ status: 'cleared' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
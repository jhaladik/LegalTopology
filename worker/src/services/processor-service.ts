import { QueueService, QueueItem } from './queue-service';
import { getEmbedding } from '../embedding/openai-client';
import { prepareStatuteText, prepareDecisionText } from '../embedding/prompts';

export class ProcessorService {
  constructor(
    private queueService: QueueService,
    private env: any
  ) {}

  async processNextBatch(batchSize: number = 10): Promise<{
    processed: number;
    failed: number;
    remaining: number;
  }> {
    const items = await this.queueService.getNextBatch(batchSize);

    if (items.length === 0) {
      const stats = await this.queueService.getStats();
      return {
        processed: 0,
        failed: 0,
        remaining: stats.pending
      };
    }

    await this.queueService.markProcessing(items.map(i => i.chunk_id));

    let processed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        await this.processItem(item);
        await this.queueService.markCompleted(item.chunk_id);
        processed++;
      } catch (error: any) {
        console.error(`Failed to process ${item.chunk_id}:`, error.message);
        await this.queueService.markFailed(item.chunk_id, error.message);
        failed++;
      }
    }

    const stats = await this.queueService.getStats();

    return {
      processed,
      failed,
      remaining: stats.pending
    };
  }

  private async processItem(item: QueueItem): Promise<void> {
    const metadata = JSON.parse(item.chunk_metadata);

    let preparedText: string;
    if (metadata.type === 'statute') {
      preparedText = prepareStatuteText(item.chunk_text, metadata);
    } else {
      preparedText = prepareDecisionText(item.chunk_text, metadata);
    }

    const embedding = await getEmbedding(preparedText, this.env);

    const weight = metadata.type === 'statute' ? 1.0 : metadata.weight || 1.0;

    const metadataText = item.chunk_text.length > 5000
      ? item.chunk_text.slice(0, 5000) + '...[truncated]'
      : item.chunk_text;

    await this.env.VECTORIZE.upsert([{
      id: item.chunk_id,
      values: embedding,
      metadata: {
        ...metadata,
        weight: weight,
        text: metadataText,
        indexed_at: new Date().toISOString(),
        embedding_model: this.env.OPENAI_MODEL || 'text-embedding-3-large'
      }
    }]);
  }
}
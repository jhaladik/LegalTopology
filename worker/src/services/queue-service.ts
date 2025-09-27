import { LegalChunk } from '../types/chunks';

export interface QueueItem {
  id?: number;
  chunk_id: string;
  chunk_text: string;
  chunk_metadata: string;  // JSON
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  retry_count: number;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

export class QueueService {
  constructor(private db: D1Database) {}

  async addChunks(chunks: LegalChunk[], priority: number = 0): Promise<number> {
    const timestamp = new Date().toISOString();
    const BATCH_SIZE = 50;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const statements = batch.map(chunk =>
        this.db
          .prepare(`
            INSERT INTO processing_queue
            (chunk_id, chunk_text, chunk_metadata, status, priority, retry_count, created_at)
            VALUES (?, ?, ?, 'pending', ?, 0, ?)
          `)
          .bind(
            chunk.id,
            chunk.text,
            JSON.stringify(chunk.metadata),
            priority,
            timestamp
          )
      );

      await this.db.batch(statements);
    }

    return chunks.length;
  }

  async getNextBatch(batchSize: number = 10): Promise<QueueItem[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM processing_queue
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT ?
      `)
      .bind(batchSize)
      .all();

    return result.results as QueueItem[];
  }

  async markProcessing(chunkIds: string[]): Promise<void> {
    for (const id of chunkIds) {
      await this.db
        .prepare(`
          UPDATE processing_queue
          SET status = 'processing'
          WHERE chunk_id = ?
        `)
        .bind(id)
        .run();
    }
  }

  async markCompleted(chunkId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.db
      .prepare(`
        UPDATE processing_queue
        SET status = 'completed', processed_at = ?
        WHERE chunk_id = ?
      `)
      .bind(timestamp, chunkId)
      .run();
  }

  async markFailed(chunkId: string, errorMessage: string): Promise<void> {
    await this.db
      .prepare(`
        UPDATE processing_queue
        SET status = 'failed',
            retry_count = retry_count + 1,
            error_message = ?
        WHERE chunk_id = ?
      `)
      .bind(errorMessage, chunkId)
      .run();
  }

  async retryFailed(): Promise<void> {
    await this.db
      .prepare(`
        UPDATE processing_queue
        SET status = 'pending',
            error_message = NULL
        WHERE status = 'failed' AND retry_count < 3
      `)
      .run();
  }

  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const result = await this.db
      .prepare(`
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          COUNT(*) as total
        FROM processing_queue
      `)
      .first();

    return result as any;
  }

  async clearCompleted(): Promise<void> {
    await this.db
      .prepare(`DELETE FROM processing_queue WHERE status = 'completed'`)
      .run();
  }

  async clearAll(): Promise<void> {
    await this.db
      .prepare(`DELETE FROM processing_queue`)
      .run();
  }
}
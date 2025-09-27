-- Processing queue for chunks
CREATE TABLE IF NOT EXISTS processing_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_id TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_metadata TEXT NOT NULL,  -- JSON string
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_chunk_id ON processing_queue(chunk_id);
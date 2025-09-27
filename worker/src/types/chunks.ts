import { StatuteMetadata, JudicialMetadata } from './metadata';

export interface StatuteChunk {
  id: string;
  text: string;
  metadata: StatuteMetadata;
}

export interface DecisionChunk {
  id: string;
  text: string;
  metadata: JudicialMetadata;
}

export type LegalChunk = StatuteChunk | DecisionChunk;

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}
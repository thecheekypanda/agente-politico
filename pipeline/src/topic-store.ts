import type { SupabaseClient } from '@supabase/supabase-js';
import type { Topic } from './topics.js';

export interface UntaggedIniciativa {
  id: number;
  titulo: string;
  tipo_desc: string;
  epigrafe: string | null;
}

export interface TopicStore {
  findUntagged(): Promise<UntaggedIniciativa[]>;
  saveTopic(id: number, topic: Topic): Promise<void>;
}

// Comfortably covers a full legislature backfill in one run; after the
// first run this only ever selects the day's newly ingested initiatives.
const SELECT_LIMIT = 2000;

export class SupabaseTopicStore implements TopicStore {
  constructor(private readonly client: SupabaseClient) {}

  async findUntagged(): Promise<UntaggedIniciativa[]> {
    const { data, error } = await this.client
      .from('iniciativas')
      .select('id, titulo, tipo_desc, epigrafe')
      .is('topic', null)
      .limit(SELECT_LIMIT);
    if (error) {
      throw new Error(`Failed to read untagged iniciativas: ${error.message}`);
    }
    return data ?? [];
  }

  async saveTopic(id: number, topic: Topic): Promise<void> {
    const { error } = await this.client.from('iniciativas').update({ topic }).eq('id', id);
    if (error) {
      throw new Error(`Failed to save topic for iniciativa ${id}: ${error.message}`);
    }
  }
}

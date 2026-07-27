import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedPage } from './pdf-extractor.js';
import type { PartyProgramSource } from './party-programs.js';

export interface ChunkSearchResult {
  pageNumber: number;
  content: string;
  rank: number;
}

export interface ProgramChunksStore {
  /** Upserts the party_programs row (keyed on label) and returns its id. */
  upsertProgram(source: PartyProgramSource): Promise<number>;
  /** Upserts pages keyed on (programId, pageNumber) — re-running never duplicates. */
  upsertChunks(programId: number, pages: ExtractedPage[]): Promise<void>;
  /** Ranked full-text search within one party's program. Empty if the label is unknown. */
  searchChunks(label: string, query: string, limit?: number): Promise<ChunkSearchResult[]>;
}

const UPSERT_BATCH_SIZE = 500;
const DEFAULT_SEARCH_LIMIT = 5;

export class SupabaseProgramChunksStore implements ProgramChunksStore {
  constructor(private readonly client: SupabaseClient) {}

  async upsertProgram(source: PartyProgramSource): Promise<number> {
    const { data, error } = await this.client
      .from('party_programs')
      .upsert(
        {
          label: source.label,
          party_name: source.partyName,
          ar_siglas: source.arSiglas,
          source_url: source.sourceUrl,
          election_cycle: source.electionCycle,
          ingested_at: new Date().toISOString(),
        },
        { onConflict: 'label' },
      )
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(
        `Failed to upsert party_programs row for ${source.label}: ${error?.message}`,
      );
    }
    return data.id as number;
  }

  async upsertChunks(programId: number, pages: ExtractedPage[]): Promise<void> {
    const rows = pages.map((page) => ({
      program_id: programId,
      page_number: page.pageNumber,
      content: page.content,
    }));

    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
      const { error } = await this.client
        .from('program_chunks')
        .upsert(batch, { onConflict: 'program_id,page_number' });
      if (error) {
        throw new Error(
          `Failed to upsert program_chunks for program ${programId} (batch starting at ${i}): ${error.message}`,
        );
      }
    }
  }

  async searchChunks(
    label: string,
    query: string,
    limit = DEFAULT_SEARCH_LIMIT,
  ): Promise<ChunkSearchResult[]> {
    const { data: program, error: programError } = await this.client
      .from('party_programs')
      .select('id')
      .eq('label', label)
      .maybeSingle();
    if (programError) {
      throw new Error(`Failed to look up party_programs for ${label}: ${programError.message}`);
    }
    if (!program) {
      return [];
    }

    const { data, error } = await this.client.rpc('search_program_chunks', {
      p_program_id: program.id,
      p_query: query,
      p_limit: limit,
    });
    if (error) {
      throw new Error(`Failed to search program_chunks for ${label}: ${error.message}`);
    }

    const rows = (data ?? []) as { page_number: number; content: string; rank: number }[];
    return rows.map((row) => ({
      pageNumber: row.page_number,
      content: row.content,
      rank: row.rank,
    }));
  }
}

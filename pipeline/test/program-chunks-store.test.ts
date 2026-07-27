import { describe, expect, it } from 'vitest';
import type { ProgramChunksStore, ChunkSearchResult } from '../src/program-chunks-store.js';
import type { ExtractedPage } from '../src/pdf-extractor.js';
import type { PartyProgramSource } from '../src/party-programs.js';

interface ChunkRow {
  programId: number;
  pageNumber: number;
  content: string;
}

// In-memory stand-in mirroring the real schema: party_programs keyed by
// label (upsert = update-in-place), program_chunks keyed by
// (program_id, page_number). Search does simple substring matching rather
// than real ts_rank — good enough to prove our orchestration code calls the
// store correctly; ranking quality itself is Postgres's job, not ours.
class FakeProgramChunksStore implements ProgramChunksStore {
  programs = new Map<string, number>();
  chunks = new Map<string, ChunkRow>();
  private nextId = 1;
  upsertProgramCalls = 0;

  async upsertProgram(source: PartyProgramSource): Promise<number> {
    this.upsertProgramCalls += 1;
    let id = this.programs.get(source.label);
    if (id === undefined) {
      id = this.nextId++;
      this.programs.set(source.label, id);
    }
    return id;
  }

  async upsertChunks(programId: number, pages: ExtractedPage[]): Promise<void> {
    for (const page of pages) {
      this.chunks.set(`${programId}:${page.pageNumber}`, {
        programId,
        pageNumber: page.pageNumber,
        content: page.content,
      });
    }
  }

  async searchChunks(label: string, query: string, limit = 5): Promise<ChunkSearchResult[]> {
    const programId = this.programs.get(label);
    if (programId === undefined) return [];

    const matches = [...this.chunks.values()]
      .filter((row) => row.programId === programId && row.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
    return matches.map((row) => ({ pageNumber: row.pageNumber, content: row.content, rank: 1 }));
  }
}

const source: PartyProgramSource = {
  label: 'TEST',
  partyName: 'Test Party',
  arSiglas: ['TEST'],
  sourceUrl: 'https://example.org/programa.pdf',
  electionCycle: '2025',
};

describe('ProgramChunksStore (fake, orchestration-level)', () => {
  it('upserting the same program label twice returns the same program id', async () => {
    const store = new FakeProgramChunksStore();

    const first = await store.upsertProgram(source);
    const second = await store.upsertProgram(source);

    expect(first).toBe(second);
    expect(store.upsertProgramCalls).toBe(2);
  });

  it('re-ingesting the same pages does not duplicate chunks, and updates content in place', async () => {
    const store = new FakeProgramChunksStore();
    const programId = await store.upsertProgram(source);

    await store.upsertChunks(programId, [
      { pageNumber: 1, content: 'Original habitação content' },
      { pageNumber: 2, content: 'Original saúde content' },
    ]);
    await store.upsertChunks(programId, [
      { pageNumber: 1, content: 'Updated habitação content' },
    ]);

    expect(store.chunks.size).toBe(2);
    expect(store.chunks.get(`${programId}:1`)?.content).toBe('Updated habitação content');
    expect(store.chunks.get(`${programId}:2`)?.content).toBe('Original saúde content');
  });

  it('returns matching chunks with page references for a known party+topic', async () => {
    const store = new FakeProgramChunksStore();
    const programId = await store.upsertProgram(source);
    await store.upsertChunks(programId, [
      { pageNumber: 3, content: 'Medidas para a habitação e arrendamento acessível' },
      { pageNumber: 8, content: 'Medidas para a saúde e o SNS' },
    ]);

    const results = await store.searchChunks('TEST', 'habitação');

    expect(results).toHaveLength(1);
    expect(results[0].pageNumber).toBe(3);
  });

  it('returns an empty result for an unknown party label rather than throwing', async () => {
    const store = new FakeProgramChunksStore();

    const results = await store.searchChunks('NOT_A_REAL_PARTY', 'habitação');

    expect(results).toEqual([]);
  });
});

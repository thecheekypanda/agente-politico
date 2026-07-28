import { describe, expect, it } from 'vitest';
import { getProgramPosition } from '../src/program-retrieval.js';
import type { ChunkSearchResult, ProgramChunksStore } from '../src/program-chunks-store.js';
import type { ExtractedPage } from '../src/pdf-extractor.js';
import type { PartyProgramSource } from '../src/party-programs.js';

// A store stub whose searchChunks result is set directly per test, so the
// threshold logic in getProgramPosition can be tested without depending on
// real ts_rank scoring or the fake substring-matcher used elsewhere.
class StubStore implements ProgramChunksStore {
  constructor(private readonly results: ChunkSearchResult[]) {}

  async upsertProgram(_source: PartyProgramSource): Promise<number> {
    throw new Error('not used in these tests');
  }

  async upsertChunks(_programId: number, _pages: ExtractedPage[]): Promise<void> {
    throw new Error('not used in these tests');
  }

  async searchChunks(): Promise<ChunkSearchResult[]> {
    return this.results;
  }
}

describe('getProgramPosition', () => {
  it('returns not addressed (no_match) for a deliberately off-topic query — never a fabricated match', async () => {
    // Mirrors the real behaviour: websearch_to_tsquery finds zero shared
    // lexemes for a genuinely unrelated topic, so the store returns nothing.
    const store = new StubStore([]);

    const result = await getProgramPosition(store, 'PS', 'campeonato de futebol da segunda divisão');

    expect(result).toEqual({
      addressed: false,
      label: 'PS',
      topic: 'campeonato de futebol da segunda divisão',
      reason: 'no_match',
    });
  });

  it('returns not addressed (low_confidence) when the best match falls below the threshold', async () => {
    const store = new StubStore([{ pageNumber: 12, content: 'incidental mention', rank: 0.002 }]);

    const result = await getProgramPosition(store, 'PS', 'habitação', { minRank: 0.01 });

    expect(result).toEqual({
      addressed: false,
      label: 'PS',
      topic: 'habitação',
      reason: 'low_confidence',
    });
  });

  it('returns addressed with the matching chunks when confidence clears the threshold', async () => {
    const chunks: ChunkSearchResult[] = [
      { pageNumber: 5, content: 'Medidas para a habitação e arrendamento acessível', rank: 0.4 },
    ];
    const store = new StubStore(chunks);

    const result = await getProgramPosition(store, 'PS', 'habitação', { minRank: 0.01 });

    expect(result).toEqual({ addressed: true, label: 'PS', topic: 'habitação', chunks });
  });
});

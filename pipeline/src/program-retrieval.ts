import type { ChunkSearchResult, ProgramChunksStore } from './program-chunks-store.js';

// ts_rank scores are small, corpus- and query-dependent floats with no
// fixed upper bound — there's no universally "correct" number here. This
// default is a conservative placeholder and needs calibrating against the
// real ingested corpus (backlog 2.1) before Phase 3 relies on it; callers
// can override via options.minRank in the meantime.
const DEFAULT_MIN_CONFIDENT_RANK = 0.01;
const DEFAULT_LIMIT = 5;

export type ProgramPositionResult =
  | { addressed: true; label: string; topic: string; chunks: ChunkSearchResult[] }
  | { addressed: false; label: string; topic: string; reason: 'no_match' | 'low_confidence' };

export interface GetProgramPositionOptions {
  limit?: number;
  minRank?: number;
}

// The "program does not address this" default (backlog 2.2). Two distinct
// reasons collapse to the same addressed: false result:
//  - no_match: websearch_to_tsquery found zero shared lexemes at all — the
//    deterministic case (an off-topic query genuinely won't match).
//  - low_confidence: something matched, but the top result's rank falls
//    below the threshold — a weak/coincidental match, not a real position.
// Never returns a guessed match just because *something* was retrieved.
export async function getProgramPosition(
  store: ProgramChunksStore,
  label: string,
  topic: string,
  options: GetProgramPositionOptions = {},
): Promise<ProgramPositionResult> {
  const { limit = DEFAULT_LIMIT, minRank = DEFAULT_MIN_CONFIDENT_RANK } = options;

  const chunks = await store.searchChunks(label, topic, limit);
  if (chunks.length === 0) {
    return { addressed: false, label, topic, reason: 'no_match' };
  }
  if (chunks[0].rank < minRank) {
    return { addressed: false, label, topic, reason: 'low_confidence' };
  }
  return { addressed: true, label, topic, chunks };
}

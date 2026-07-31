// Direct port of pipeline/src/initiative-classification.ts's derivePosition
// (kept as a separate copy deliberately — the web app has no dependency on
// the pipeline package, same pattern review.ts uses for VERDICT_LABELS).
// Keep the two in sync if the derivation rule ever changes.
export type VotePosition = 'favor' | 'contra' | 'abstencao' | 'ausencia' | 'nao_registado';

export interface VotacaoRow {
  votacao_id: string;
  data: string | null;
  resultado: string;
  unanime: boolean;
  descricao: string | null;
  a_favor: string[];
  contra: string[];
  abstencao: string[];
  ausencias: string[];
}

// Unanimous votes leave a_favor/contra/abstencao/ausencias all empty —
// `unanime` itself is the authoritative source signal for "everyone
// agreed", not an inference on top of it (see the pipeline original for
// the verification note behind this).
export function derivePartyVotePosition(voto: VotacaoRow, sigla: string): VotePosition {
  if (voto.unanime) {
    return 'favor';
  }

  const memberships = [
    voto.a_favor.includes(sigla) && 'favor',
    voto.contra.includes(sigla) && 'contra',
    voto.abstencao.includes(sigla) && 'abstencao',
    voto.ausencias.includes(sigla) && 'ausencia',
  ].filter((value): value is VotePosition => value !== false);

  if (memberships.length > 1) {
    throw new Error(
      `Vote ${voto.votacao_id}: sigla "${sigla}" appears in more than one position group (${memberships.join(', ')}) — malformed source data.`,
    );
  }

  return memberships[0] ?? 'nao_registado';
}

export function rowToVotacao(row: Record<string, unknown>): VotacaoRow {
  return {
    votacao_id: row.votacao_id as string,
    data: (row.data as string | null) ?? null,
    resultado: row.resultado as string,
    unanime: row.unanime as boolean,
    descricao: (row.descricao as string | null) ?? null,
    a_favor: (row.a_favor as string[]) ?? [],
    contra: (row.contra as string[]) ?? [],
    abstencao: (row.abstencao as string[]) ?? [],
    ausencias: (row.ausencias as string[]) ?? [],
  };
}

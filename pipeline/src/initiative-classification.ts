import type { IniciativaRow } from './iniciativas-store.js';
import type { VotacaoRow } from './votacoes-store.js';

export type VotePosition = 'favor' | 'contra' | 'abstencao' | 'ausencia' | 'nao_registado';

export interface InitiativeType {
  code: string;
  label: string;
}

export interface PartyVoteEventPosition {
  votacaoId: string;
  data: string | null;
  descricao: string | null;
  resultado: string;
  position: VotePosition;
}

// Direct passthrough — exists so callers have one canonical, tested
// definition of "initiative type" instead of reaching into raw DB fields
// ad hoc, guarding against future accidental reinterpretation.
export function classifyInitiativeType(
  iniciativa: Pick<IniciativaRow, 'tipo' | 'tipo_desc'>,
): InitiativeType {
  return { code: iniciativa.tipo, label: iniciativa.tipo_desc };
}

type VoteRecord = Pick<
  VotacaoRow,
  | 'votacao_id'
  | 'data'
  | 'descricao'
  | 'resultado'
  | 'unanime'
  | 'a_favor'
  | 'contra'
  | 'abstencao'
  | 'ausencias'
>;

// Unanimous votes leave a_favor/contra/abstencao/ausencias all empty
// (verified against live data: 291/291 sampled XVII-legislature unanimous
// votes, all resultado Aprovado) — `unanime` itself is the authoritative
// source signal for "everyone agreed", not an inference on top of it.
function derivePosition(voto: VoteRecord, sigla: string): VotePosition {
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

export function classifyPartyVotePositions(
  votos: VoteRecord[],
  sigla: string,
): PartyVoteEventPosition[] {
  return votos.map((voto) => ({
    votacaoId: voto.votacao_id,
    data: voto.data,
    descricao: voto.descricao,
    resultado: voto.resultado,
    position: derivePosition(voto, sigla),
  }));
}

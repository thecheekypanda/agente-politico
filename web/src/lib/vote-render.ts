import { derivePartyVotePosition, type VotacaoRow } from './votes';
import { findGlossaryTerm } from './glossary';
import { formatDate } from './format';

export const VOTE_POSITION_NAMES: Record<string, string> = {
  favor: 'A Favor',
  contra: 'Contra',
  abstencao: 'Abstenção',
  ausencia: 'Ausência',
  nao_registado: 'Não registado',
};

// Wherever a piece of controlled-vocabulary text (an initiative type, a
// vote description) exactly matches a glossary term, link it to the
// glossary instead of rendering plain text — journey 3 in
// docs/o-que-fizeram-strategy.md. Exact match only, never a substring scan
// (see web/src/lib/glossary.ts).
export function appendMaybeGlossaryLink(parent: HTMLElement, text: string) {
  const entry = findGlossaryTerm(text);
  if (!entry) {
    parent.appendChild(document.createTextNode(text));
    return;
  }
  const link = document.createElement('a');
  link.href = `/glossario#${entry.slug}`;
  link.textContent = text;
  parent.appendChild(link);
}

export function renderVoteResult(votos: VotacaoRow[], arSiglas: string[]): HTMLElement {
  const container = document.createElement('div');
  if (votos.length === 0) {
    // Still show every party explicitly as "não registado" — a blank
    // sentence doesn't tell a reader which parties exist and simply
    // haven't voted yet, vs. a party being missing from the data entirely.
    const notice = document.createElement('p');
    notice.className = 'vote-notice';
    notice.textContent = 'Sem votação registada para esta iniciativa — estado atual de cada partido:';
    container.appendChild(notice);

    const placeholderList = document.createElement('ul');
    placeholderList.className = 'party-vote-placeholder';
    for (const sigla of arSiglas) {
      const li = document.createElement('li');
      li.textContent = `${sigla}: ${VOTE_POSITION_NAMES.nao_registado}`;
      placeholderList.appendChild(li);
    }
    container.appendChild(placeholderList);
    return container;
  }

  const list = document.createElement('ul');
  for (const voto of votos) {
    const li = document.createElement('li');
    const dataStr = voto.data ? formatDate(voto.data) : 'data desconhecida';
    // One line per AR sigla — a coalition (e.g. AD = PSD + CDS-PP) never
    // gets a single merged position; if the two groups voted differently,
    // both show up separately, exactly as recorded.
    const positions = arSiglas
      .map((sigla) => `${sigla}: ${VOTE_POSITION_NAMES[derivePartyVotePosition(voto, sigla)]}`)
      .join(' · ');
    li.appendChild(document.createTextNode(`${dataStr} — ${voto.resultado} (`));
    if (voto.descricao) {
      appendMaybeGlossaryLink(li, voto.descricao);
    } else {
      li.appendChild(document.createTextNode('sem descrição'));
    }
    li.appendChild(document.createTextNode(`) — ${positions}`));
    list.appendChild(li);
  }
  container.appendChild(list);
  return container;
}

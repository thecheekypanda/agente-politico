import type { FaseRow } from './fases';
import { formatDate } from './format';

function renderFasesList(ordered: FaseRow[]): HTMLElement {
  const list = document.createElement('ol');
  list.className = 'timeline-list';
  for (const fase of ordered) {
    const li = document.createElement('li');

    const line = document.createElement('p');
    line.textContent = (fase.data ? `${formatDate(fase.data)} — ` : '') + fase.evento;
    li.appendChild(line);

    if (fase.obs) {
      const obs = document.createElement('p');
      obs.className = 'timeline-note';
      obs.textContent = fase.obs;
      li.appendChild(obs);
    }

    // A committee-level detail nested inside some phases (date + reason a
    // parecer wasn't issued in time, e.g. a "por arrastamento"
    // postponement) — distinct from the plain `obs` note above.
    if (fase.parecer_nao_emitido_motivo) {
      const parecer = document.createElement('p');
      parecer.className = 'timeline-note';
      parecer.textContent =
        'Comissão não emitiu parecer a tempo' +
        (fase.parecer_nao_emitido_data ? ` (${formatDate(fase.parecer_nao_emitido_data)})` : '') +
        `: ${fase.parecer_nao_emitido_motivo}`;
      li.appendChild(parecer);
    }

    list.appendChild(li);
  }
  return list;
}

// Always shows a one-line current-status summary (the latest phase) so a
// reader gets the gist without expanding anything — same "always show the
// at-a-glance fact" principle as renderVoteResult — with the full ordered
// history behind a "Ver tramitação completa" toggle, matching the
// per-verdict "Ver detalhe" disclosure pattern used elsewhere.
export function renderFasesTimeline(fases: FaseRow[]): HTMLElement {
  const container = document.createElement('div');

  if (fases.length === 0) {
    const notice = document.createElement('p');
    notice.className = 'vote-notice';
    notice.textContent = 'Sem tramitação registada para esta iniciativa.';
    container.appendChild(notice);
    return container;
  }

  const ordered = [...fases].sort((a, b) => a.ctl_index - b.ctl_index);
  const latest = ordered[ordered.length - 1];

  const summary = document.createElement('p');
  summary.className = 'timeline-current';
  summary.textContent =
    `Estado atual da tramitação: ${latest.evento}` + (latest.data ? ` (${formatDate(latest.data)})` : '');
  container.appendChild(summary);

  const expandedLabel = 'Esconder tramitação completa';
  const collapsedLabel = `Ver tramitação completa (${ordered.length} fases)`;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'button-link';
  toggle.textContent = collapsedLabel;
  toggle.setAttribute('aria-expanded', 'false');
  container.appendChild(toggle);

  let listEl: HTMLElement | null = null;
  toggle.addEventListener('click', () => {
    if (listEl) {
      listEl.hidden = !listEl.hidden;
      toggle.setAttribute('aria-expanded', String(!listEl.hidden));
      toggle.textContent = listEl.hidden ? collapsedLabel : expandedLabel;
      return;
    }
    listEl = renderFasesList(ordered);
    container.appendChild(listEl);
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = expandedLabel;
  });

  return container;
}

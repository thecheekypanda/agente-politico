import { describe, expect, it } from 'vitest';
import { canonicalUrlFor, fetchIniciativaFases, verifyCanonicalUrl } from '../src/parlamento-client.js';

function htmlResponse(body: string, ok = true, status = 200): Response {
  return { ok, status, text: async () => body } as Response;
}

describe('canonicalUrlFor', () => {
  it('builds the DetalheIniciativa URL from the openAR id', () => {
    expect(canonicalUrlFor(357094)).toBe(
      'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=357094',
    );
  });
});

describe('verifyCanonicalUrl', () => {
  const iniciativa = { id: 357094, titulo: 'Recomenda ao Governo a preservação do património' };

  it('returns the URL when the titulo appears verbatim on the page', async () => {
    const fetchImpl = async () =>
      htmlResponse(`<html><body><h1>Recomenda ao Governo a preservação do património</h1></body></html>`);

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBe(
      'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=357094',
    );
  });

  it('returns null when the page does not contain the titulo', async () => {
    const fetchImpl = async () => htmlResponse('<html><body>Something unrelated</body></html>');

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBeNull();
  });

  it('returns null on a non-ok response instead of guessing', async () => {
    const fetchImpl = async () => htmlResponse('Not Found', false, 404);

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBeNull();
  });

  it('matches titulo containing "&" against a page that HTML-escapes it as &amp;', async () => {
    const amp = { id: 1, titulo: 'Comércio & Indústria' };
    const fetchImpl = async () => htmlResponse('<h1>Comércio &amp; Indústria</h1>');

    const result = await verifyCanonicalUrl(amp, { fetchImpl });

    expect(result).not.toBeNull();
  });

  it('returns null instead of throwing on a network error', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed');
    };

    const result = await verifyCanonicalUrl(iniciativa, { fetchImpl });

    expect(result).toBeNull();
  });
});

describe('fetchIniciativaFases', () => {
  // Shapes mirror the real rptFases repeater markup confirmed live against
  // two DetalheIniciativa pages (2026-10-29) — only the parts the regexes
  // key off (id suffixes, class names) need to be exact.
  const prefix = 'ctl00_ctl51_g_951a642c_ced8_43d8_af6a_57edb1db8006_ctl00';

  function phaseSpan(ctl: string, data: string, evento: string): string {
    return (
      `<span id="${prefix}_rptFases_${ctl}_lblData" class="TextoRegular">${data}</span>` +
      `<span id="${prefix}_rptFases_${ctl}_lblEvento" class="TextoRegular-Titulo">${evento}</span>`
    );
  }

  it('parses an ordered list of phases from a still-pending initiative', async () => {
    const html =
      '<html><body>' +
      phaseSpan('ctl00', '2026-03-31', 'Entrada') +
      phaseSpan('ctl01', '2026-04-15', 'Admissão') +
      phaseSpan('ctl02', '2026-04-16', 'Anúncio') +
      '</body></html>';
    const fetchImpl = async () =>
      ({ ok: true, status: 200, text: async () => html }) as Response;

    const fases = await fetchIniciativaFases(356479, { fetchImpl });

    expect(fases).toEqual([
      {
        ctlIndex: 0,
        data: '2026-03-31',
        evento: 'Entrada',
        obs: null,
        parecerNaoEmitidoData: null,
        parecerNaoEmitidoMotivo: null,
      },
      {
        ctlIndex: 1,
        data: '2026-04-15',
        evento: 'Admissão',
        obs: null,
        parecerNaoEmitidoData: null,
        parecerNaoEmitidoMotivo: null,
      },
      {
        ctlIndex: 2,
        data: '2026-04-16',
        evento: 'Anúncio',
        obs: null,
        parecerNaoEmitidoData: null,
        parecerNaoEmitidoMotivo: null,
      },
    ]);
  });

  it('extracts the plain obs note on a phase, stripping the bold "Obs:" label', async () => {
    const html =
      '<html><body>' +
      phaseSpan('ctl00', '2025-12-29', 'Entrada') +
      `<span id="${prefix}_rptFases_ctl01_lblData" class="TextoRegular">2026-01-06</span>` +
      `<span id="${prefix}_rptFases_ctl01_lblEvento" class="TextoRegular-Titulo">Baixa comissão distribuição inicial generalidade</span>` +
      `<span id="${prefix}_rptFases_ctl01_lblObs" class="TextoRegular"><b>Obs:</b> Conexão à 11.ª Comissão</span>` +
      '</body></html>';
    const fetchImpl = async () =>
      ({ ok: true, status: 200, text: async () => html }) as Response;

    const fases = await fetchIniciativaFases(315892, { fetchImpl });

    expect(fases?.[1].obs).toBe('Conexão à 11.ª Comissão');
  });

  it('extracts the nested committee parecer-not-issued detail on a phase', async () => {
    const html =
      '<html><body>' +
      phaseSpan('ctl00', '2025-12-29', 'Entrada') +
      phaseSpan('ctl02', '2026-01-06', 'Baixa comissão distribuição inicial generalidade') +
      `<span id="${prefix}_rptFases_ctl02_IniciativaFase_Detalhe_PLC1_ucActividadeComissao_lblDataNaoParecer" class="TextoTramB">2026-01-07</span>` +
      `<span id="${prefix}_rptFases_ctl02_IniciativaFase_Detalhe_PLC1_ucActividadeComissao_lblMotivoNaoParecer" class="TextoTramB">Impossibilidade de emissão de relatório em tempo, por pedido de agendamento por arrastamento, da discussão na generalidade para a reunião plenária de 7/1</span>` +
      '</body></html>';
    const fetchImpl = async () =>
      ({ ok: true, status: 200, text: async () => html }) as Response;

    const fases = await fetchIniciativaFases(315892, { fetchImpl });
    const baixaComissao = fases?.find((f) => f.ctlIndex === 2);

    expect(baixaComissao?.parecerNaoEmitidoData).toBe('2026-01-07');
    expect(baixaComissao?.parecerNaoEmitidoMotivo).toBe(
      'Impossibilidade de emissão de relatório em tempo, por pedido de agendamento por arrastamento, da discussão na generalidade para a reunião plenária de 7/1',
    );
  });

  it('throws when the page loads fine but no phases parse — a structural mismatch, not silently empty', async () => {
    const fetchImpl = async () =>
      ({ ok: true, status: 200, text: async () => '<html><body>unrelated page</body></html>' }) as Response;

    await expect(fetchIniciativaFases(1, { fetchImpl })).rejects.toThrow(/structure may have changed/);
  });

  it('returns null on a non-ok response instead of throwing', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, text: async () => '' }) as Response;

    const result = await fetchIniciativaFases(1, { fetchImpl });

    expect(result).toBeNull();
  });

  it('returns null instead of throwing on a network error', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed');
    };

    const result = await fetchIniciativaFases(1, { fetchImpl });

    expect(result).toBeNull();
  });
});

const BASE_URL = 'https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx';

export function canonicalUrlFor(id: number): string {
  return `${BASE_URL}?BID=${id}`;
}

export interface CanonicalCheckInput {
  id: number;
  titulo: string;
}

export interface VerifyCanonicalUrlOptions {
  fetchImpl?: typeof fetch;
}

// Cross-checks openAR's data against parlamento.pt's own official page
// rather than just trusting that openAR's `id` lines up with AR's internal
// ID (even though openAR's own docs name the field "IniId", suggesting it
// does). Verified empirically across 28 real samples spanning every
// initiative type and 18 distinct status values (2026-07-27): the page is
// server-rendered ASP.NET WebForms (not a JS SPA), and the exact `titulo`
// string always appears verbatim regardless of initiative status — pending,
// concluded, withdrawn, etc. A prior attempt at matching on the
// numero/legislatura heading failed for concluded initiatives, where the
// page's header switches to showing the resulting Lei number instead.
//
// Returns the verified URL, or null if the request fails outright, the page
// 404s, or the title doesn't match — never a guessed URL. `&amp;` is
// unescaped before comparison since that's the one HTML entity plausible in
// a formal legal title.
//
// Network errors are swallowed to null rather than thrown: this runs once
// per pending iniciativa (up to ~2000 on a first backfill), and a lone
// transient connection blip (observed in practice against this exact host)
// shouldn't abort a whole batch and lose everything already resolved.
// resolveCanonicalUrls' 0%-resolved canary is what catches a *systemic*
// failure instead.
export async function verifyCanonicalUrl(
  iniciativa: CanonicalCheckInput,
  options: VerifyCanonicalUrlOptions = {},
): Promise<string | null> {
  const { fetchImpl = fetch } = options;
  const url = canonicalUrlFor(iniciativa.id);

  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }

  const html = (await response.text()).replace(/&amp;/g, '&');
  return html.includes(iniciativa.titulo) ? url : null;
}

export interface IniciativaFase {
  ctlIndex: number;
  data: string | null;
  evento: string;
  obs: string | null;
  parecerNaoEmitidoData: string | null;
  parecerNaoEmitidoMotivo: string | null;
}

export interface FetchIniciativaFasesOptions {
  fetchImpl?: typeof fetch;
}

const FASE_DATA_RE = /rptFases_ctl(\d+)_lblData" class="TextoRegular">([^<]*)</g;
const FASE_EVENTO_RE = /rptFases_ctl(\d+)_lblEvento" class="TextoRegular-Titulo">([^<]*)</g;
const FASE_OBS_RE = /rptFases_ctl(\d+)_lblObs" class="TextoRegular">(?:<b>[^<]*<\/b>\s*)?([^<]*)</g;
// The committee-detail sub-control's id segment ("PLC1" in both samples
// checked) is matched as a wildcard rather than hardcoded, since it likely
// varies by initiative type (tipo) and hasn't been verified against one
// other than "J" (Projeto de Lei).
const FASE_PARECER_DATA_RE =
  /rptFases_ctl(\d+)_IniciativaFase_Detalhe_[A-Za-z0-9]+_ucActividadeComissao_lblDataNaoParecer" class="TextoTramB">([^<]*)</g;
const FASE_PARECER_MOTIVO_RE =
  /rptFases_ctl(\d+)_IniciativaFase_Detalhe_[A-Za-z0-9]+_ucActividadeComissao_lblMotivoNaoParecer" class="TextoTramB">([^<]*)</g;

function collectByCtlIndex(html: string, re: RegExp): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of html.matchAll(re)) {
    result.set(match[1], match[2].trim());
  }
  return result;
}

// A phase's lblData span can be present but empty — observed live on
// iniciativa 377242 (2026-10-29), likely a scheduled-but-not-yet-dated
// future phase. `.trim()` above turns that into `''`, which is not a valid
// Postgres `date` and must not reach the DB as one; treat it the same as
// "absent" (null) rather than storing it as a garbage empty date.
function emptyToNull(value: string | undefined): string | null {
  return value ? value : null;
}

// Parses the `rptFases` repeater on a DetalheIniciativa page into an
// ordered procedural timeline (Entrada, Admissão, Anúncio, Votação, ...),
// plus an optional committee-parecer detail nested inside some phases.
// Verified against two real pages (2026-10-29): a still-pending iniciativa
// (5 phases ending mid-process) and an older one stalled in committee (4
// phases, with the nested parecer-not-issued detail — including a
// "por arrastamento" postponement reason — on its "Baixa comissão" phase).
//
// Throws if the page fetched fine (200 OK) but zero phases parsed at all —
// matching this project's halt-on-structural-mismatch policy for scrapers
// (CLAUDE.md's DRE-ingestion rule) rather than silently storing nothing.
// Returns null only on a transient failure (network error, non-200) — the
// caller should skip and retry later, same as verifyCanonicalUrl.
export async function fetchIniciativaFases(
  id: number,
  options: FetchIniciativaFasesOptions = {},
): Promise<IniciativaFase[] | null> {
  const { fetchImpl = fetch } = options;
  const url = canonicalUrlFor(id);

  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const dates = collectByCtlIndex(html, FASE_DATA_RE);
  const eventos = collectByCtlIndex(html, FASE_EVENTO_RE);
  const obsByCtl = collectByCtlIndex(html, FASE_OBS_RE);
  const parecerDatas = collectByCtlIndex(html, FASE_PARECER_DATA_RE);
  const parecerMotivos = collectByCtlIndex(html, FASE_PARECER_MOTIVO_RE);

  const ctlIndices = [...eventos.keys()].sort((a, b) => Number(a) - Number(b));
  if (ctlIndices.length === 0) {
    throw new Error(
      `No rptFases phases found on ${url} despite a 200 OK response — parlamento.pt's page structure may have changed.`,
    );
  }

  return ctlIndices.map((ctl) => ({
    ctlIndex: Number(ctl),
    data: emptyToNull(dates.get(ctl)),
    evento: eventos.get(ctl) as string,
    obs: emptyToNull(obsByCtl.get(ctl)),
    parecerNaoEmitidoData: emptyToNull(parecerDatas.get(ctl)),
    parecerNaoEmitidoMotivo: emptyToNull(parecerMotivos.get(ctl)),
  }));
}

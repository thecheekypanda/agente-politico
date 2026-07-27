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

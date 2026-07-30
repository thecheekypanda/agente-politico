import type { z } from 'zod';
import { IniciativaSchema, PaginatedIniciativasSchema, type Iniciativa } from './schemas/iniciativa.js';
import { PaginatedVotacoesSchema, type Votacao } from './schemas/votacao.js';
import { sleep } from './sleep.js';

const BASE_URL = 'https://api.openar.pt/v1';
const DEFAULT_PAGE_LIMIT = 200; // openAR's documented maximum for `limit`

// openAR enforces a real rate limit (confirmed live: X-RateLimit-Limit: 100,
// with a Retry-After header on 429s) — a single ingestion run's combined
// iniciativas + votacoes pagination plus backfill lookups can trip it
// (observed in production, 2026-07-30). Every openAR request goes through
// this so a rate limit is a transient retry, not a hard failure — honoring
// the server's own Retry-After rather than guessing a delay. Gives up after
// a bounded number of attempts rather than retrying forever if openAR is
// genuinely down.
const MAX_RATE_LIMIT_RETRIES = 3;
const FALLBACK_RETRY_DELAY_MS = 2000;

async function fetchOpenAR(fetchImpl: typeof fetch, input: string | URL): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetchImpl(input, { headers: { Accept: 'application/json' } });
    if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
      return response;
    }

    const retryAfterSeconds = Number(response.headers.get('Retry-After'));
    const waitMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : FALLBACK_RETRY_DELAY_MS * 2 ** attempt;

    console.warn(
      `openAR rate limit hit (429) for ${input} — retrying in ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`,
    );
    await sleep(waitMs);
  }
}

export interface FetchPaginatedOptions {
  legislatura?: string;
  fetchImpl?: typeof fetch;
  /** Overridable only for tests — production always uses DEFAULT_PAGE_LIMIT. */
  pageLimit?: number;
  /**
   * Set true only when a genuinely empty result is expected (e.g. a
   * brand-new legislature with nothing filed yet). Defaults to false: an
   * established legislature like the one this project tracks should never
   * legitimately have zero iniciativas/votacoes, so an empty payload is
   * treated as a likely outage rather than silently "succeeding" at
   * ingesting nothing (backlog 1.4).
   */
  allowEmpty?: boolean;
}

interface PaginatedShape<TItem> {
  data: TItem[];
  total: number;
}

async function fetchAllPaginated<TItem>(
  path: string,
  schema: z.ZodType<PaginatedShape<TItem>>,
  options: FetchPaginatedOptions,
): Promise<TItem[]> {
  const {
    legislatura,
    fetchImpl = fetch,
    pageLimit = DEFAULT_PAGE_LIMIT,
    allowEmpty = false,
  } = options;
  const all: TItem[] = [];
  let page = 1;

  for (;;) {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(pageLimit));
    // Oldest-first: openAR's default (newest-first) means a brand-new
    // filing gets inserted at the very front, shifting every page we
    // haven't fetched yet — during a multi-page walk against an actively
    // updating legislature that silently skips records (observed in
    // production, 2026-07-28). Ascending order means new filings append
    // past whatever we've already paginated through instead.
    url.searchParams.set('sort', 'asc');
    if (legislatura) url.searchParams.set('legislatura', legislatura);

    const response = await fetchOpenAR(fetchImpl, url);
    if (!response.ok) {
      throw new Error(
        `openAR ${path} request failed: ${response.status} ${response.statusText} (page ${page})`,
      );
    }

    const body: unknown = await response.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new Error(
        `openAR ${path} response did not match the expected schema (page ${page}): ${parsed.error.message}`,
      );
    }

    if (page === 1 && parsed.data.total === 0 && !allowEmpty) {
      throw new Error(
        `openAR ${path} returned an empty payload (total: 0) — treating this as a likely ` +
          'outage or misconfiguration rather than silently ingesting nothing. Pass ' +
          '{ allowEmpty: true } if zero results are genuinely expected here.',
      );
    }

    all.push(...parsed.data.data);

    const gotFullPage = parsed.data.data.length === pageLimit;
    const moreRemaining = all.length < parsed.data.total;
    if (!gotFullPage || !moreRemaining) {
      break;
    }
    page += 1;
  }

  return all;
}

export type FetchIniciativasOptions = FetchPaginatedOptions;

export async function fetchAllIniciativas(
  options: FetchIniciativasOptions = {},
): Promise<Iniciativa[]> {
  return fetchAllPaginated('/iniciativas', PaginatedIniciativasSchema, options);
}

export type FetchVotacoesOptions = FetchPaginatedOptions;

export async function fetchAllVotacoes(options: FetchVotacoesOptions = {}): Promise<Votacao[]> {
  return fetchAllPaginated('/votacoes', PaginatedVotacoesSchema, options);
}

export interface FetchIniciativaByIdOptions {
  fetchImpl?: typeof fetch;
}

// Single-record lookup, used to backfill an iniciativa a votacao references
// that a paginated /iniciativas fetch missed (the sort:asc mitigation above
// reduces this but can't eliminate it — a vote fetched moments after
// iniciativas can still reference something filed in between). The detail
// endpoint returns more fields than the list endpoint (autores, eventos,
// etc.) but is a verified superset of everything IniciativaSchema needs
// (confirmed against live data, 2026-07-28) — extra fields are ignored by
// Zod's default non-strict parsing.
export async function fetchIniciativaById(
  id: number,
  options: FetchIniciativaByIdOptions = {},
): Promise<Iniciativa | null> {
  const { fetchImpl = fetch } = options;
  const response = await fetchOpenAR(fetchImpl, `${BASE_URL}/iniciativas/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`openAR /iniciativas/${id} request failed: ${response.status} ${response.statusText}`);
  }

  const body: unknown = await response.json();
  const parsed = IniciativaSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`openAR /iniciativas/${id} response did not match the expected schema: ${parsed.error.message}`);
  }
  return parsed.data;
}

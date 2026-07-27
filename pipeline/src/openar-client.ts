import type { z } from 'zod';
import { PaginatedIniciativasSchema, type Iniciativa } from './schemas/iniciativa.js';
import { PaginatedVotacoesSchema, type Votacao } from './schemas/votacao.js';

const BASE_URL = 'https://api.openar.pt/v1';
const DEFAULT_PAGE_LIMIT = 200; // openAR's documented maximum for `limit`

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
    if (legislatura) url.searchParams.set('legislatura', legislatura);

    const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
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

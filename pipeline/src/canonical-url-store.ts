import type { SupabaseClient } from '@supabase/supabase-js';
import { type VerifyCanonicalUrlOptions, verifyCanonicalUrl } from './parlamento-client.js';
import { sleep } from './sleep.js';

export interface UnresolvedIniciativa {
  id: number;
  titulo: string;
}

export interface CanonicalUrlStore {
  findUnresolved(): Promise<UnresolvedIniciativa[]>;
  markResolved(id: number, url: string): Promise<void>;
}

// Comfortably covers a full legislature backfill (~2000 iniciativas) in one
// run; after the first run this only ever selects the day's new records.
const SELECT_LIMIT = 2000;

export class SupabaseCanonicalUrlStore implements CanonicalUrlStore {
  constructor(private readonly client: SupabaseClient) {}

  async findUnresolved(): Promise<UnresolvedIniciativa[]> {
    const { data, error } = await this.client
      .from('iniciativas')
      .select('id, titulo')
      .is('canonical_url', null)
      .limit(SELECT_LIMIT);
    if (error) {
      throw new Error(`Failed to read unresolved iniciativas: ${error.message}`);
    }
    return data ?? [];
  }

  async markResolved(id: number, url: string): Promise<void> {
    const { error } = await this.client
      .from('iniciativas')
      .update({ canonical_url: url })
      .eq('id', id);
    if (error) {
      throw new Error(`Failed to store canonical_url for iniciativa ${id}: ${error.message}`);
    }
  }
}

export interface ResolveCanonicalUrlsOptions {
  fetchImpl?: VerifyCanonicalUrlOptions['fetchImpl'];
  /** Delay between requests, in ms — a courtesy to parlamento.pt's server. */
  delayMs?: number;
}

export interface ResolveCanonicalUrlsResult {
  attempted: number;
  resolved: number;
  unresolved: number;
}

export async function resolveCanonicalUrls(
  store: CanonicalUrlStore,
  options: ResolveCanonicalUrlsOptions = {},
): Promise<ResolveCanonicalUrlsResult> {
  const { fetchImpl, delayMs = 0 } = options;
  const pending = await store.findUnresolved();

  let resolved = 0;
  for (const iniciativa of pending) {
    const url = await verifyCanonicalUrl(iniciativa, { fetchImpl });
    if (url) {
      await store.markResolved(iniciativa.id, url);
      resolved += 1;
    } else {
      console.warn(`Could not verify canonical URL for iniciativa ${iniciativa.id}`);
    }
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // Every individual failure is expected occasionally (title drift, a
  // transient 404) and is left unresolved rather than guessed at. But if
  // *none* of a non-empty batch verified, that's much more likely a sign
  // parlamento.pt is down or the page structure changed — halt loudly
  // instead of quietly leaving every citation unresolved.
  if (pending.length > 0 && resolved === 0) {
    throw new Error(
      `Failed to verify a canonical URL for any of ${pending.length} iniciativas — ` +
        "parlamento.pt may be unreachable or its page structure may have changed.",
    );
  }

  return { attempted: pending.length, resolved, unresolved: pending.length - resolved };
}

import { createClient } from '@supabase/supabase-js';
import { resolveCanonicalUrls, SupabaseCanonicalUrlStore } from './canonical-url-store.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See GETTING_STARTED.md for setup.',
  );
}

const client = createClient(supabaseUrl, supabaseKey);
const store = new SupabaseCanonicalUrlStore(client);

// 150ms between requests — a courtesy to parlamento.pt's server, not a rate
// limit they've published. A full ~2000-row backfill takes a few minutes.
const result = await resolveCanonicalUrls(store, { delayMs: 150 });
console.log(
  `Canonical URL resolution: ${result.resolved}/${result.attempted} resolved` +
    (result.unresolved > 0 ? ` (${result.unresolved} left unresolved, will retry next run)` : ''),
);

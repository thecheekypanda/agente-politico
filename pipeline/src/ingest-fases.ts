import { createClient } from '@supabase/supabase-js';
import { SupabaseFasesStore, ingestFases } from './fases-store.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See GETTING_STARTED.md for setup.',
  );
}

const client = createClient(supabaseUrl, supabaseKey);
const store = new SupabaseFasesStore(client);

// 150ms between requests — same courtesy delay as resolve-canonical-urls.ts
// against the same host.
const result = await ingestFases(store, { delayMs: 150 });
console.log(
  `Procedural timeline scrape: ${result.succeeded}/${result.attempted} active iniciativas scraped` +
    (result.failed > 0 ? ` (${result.failed} failed, will retry next run)` : ''),
);

import { createClient } from '@supabase/supabase-js';
import { ingestIniciativas, SupabaseIniciativasStore } from './iniciativas-store.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See GETTING_STARTED.md for setup.',
  );
}

const client = createClient(supabaseUrl, supabaseKey);
const store = new SupabaseIniciativasStore(client);

const result = await ingestIniciativas(store, { legislatura: process.env.LEGISLATURA });
console.log(`Ingested ${result.fetched} iniciativas.`);

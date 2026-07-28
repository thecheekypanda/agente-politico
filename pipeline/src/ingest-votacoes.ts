import { createClient } from '@supabase/supabase-js';
import { SupabaseIniciativasStore } from './iniciativas-store.js';
import { ingestVotacoes, SupabaseVotacoesStore } from './votacoes-store.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See GETTING_STARTED.md for setup.',
  );
}

const client = createClient(supabaseUrl, supabaseKey);
const votacoesStore = new SupabaseVotacoesStore(client);
const iniciativasStore = new SupabaseIniciativasStore(client);

const result = await ingestVotacoes(votacoesStore, iniciativasStore, {
  legislatura: process.env.LEGISLATURA,
});
console.log(`Ingested ${result.fetched} votacoes.`);

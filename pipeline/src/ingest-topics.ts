import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SupabaseTopicStore } from './topic-store.js';
import { tagTopics, type AnthropicBatchClient } from './topic-tagger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See GETTING_STARTED.md for setup.',
  );
}
if (!anthropicApiKey) {
  throw new Error('ANTHROPIC_API_KEY must be set. See GETTING_STARTED.md for setup.');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const store = new SupabaseTopicStore(supabase);

const anthropic = new Anthropic({ apiKey: anthropicApiKey });
const client: AnthropicBatchClient = {
  create: (requests) => anthropic.messages.batches.create({ requests }),
  retrieve: (id) => anthropic.messages.batches.retrieve(id),
  results: (id) => anthropic.messages.batches.results(id),
};

const result = await tagTopics(store, client);
console.log(
  `Topic tagging: ${result.tagged}/${result.attempted} tagged` +
    (result.untagged > 0 ? ` (${result.untagged} left untagged, will retry next run)` : ''),
);

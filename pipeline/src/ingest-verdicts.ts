import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SupabaseProgramChunksStore } from './program-chunks-store.js';
import type { AnthropicBatchClient } from './topic-tagger.js';
import { draftVerdicts } from './verdict-drafter.js';
import { SupabaseVerdictStore } from './verdict-store.js';

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
const verdictStore = new SupabaseVerdictStore(supabase);
const chunksStore = new SupabaseProgramChunksStore(supabase);

const anthropic = new Anthropic({ apiKey: anthropicApiKey });
const client: AnthropicBatchClient = {
  create: (requests) => anthropic.messages.batches.create({ requests }),
  retrieve: (id) => anthropic.messages.batches.retrieve(id),
  results: (id) => anthropic.messages.batches.results(id),
};

const result = await draftVerdicts(verdictStore, chunksStore, client);
console.log(
  `Verdict drafting: ${result.drafted} drafted, ${result.notAddressed} not addressed, ` +
    `${result.undrafted} left undrafted (will retry next run), out of ${result.attempted} pending pairs.`,
);

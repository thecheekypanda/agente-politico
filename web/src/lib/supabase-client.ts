import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set. See GETTING_STARTED.md for setup. ' +
      'Use the anon key here, never the service-role key — this code runs in the browser.',
  );
}

// The anon key only ever grants what RLS allows (see
// supabase/migrations/20260801000000_verdict_reviews.sql) — safe to ship
// to the browser by design, unlike the pipeline's service-role key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

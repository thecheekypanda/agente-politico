import { createClient } from '@supabase/supabase-js';
import { extractPagesFromPdf } from './pdf-extractor.js';
import { PARTY_PROGRAM_SOURCES } from './party-programs.js';
import { SupabaseProgramChunksStore } from './program-chunks-store.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See GETTING_STARTED.md for setup.',
  );
}

const client = createClient(supabaseUrl, supabaseKey);
const store = new SupabaseProgramChunksStore(client);

for (const source of PARTY_PROGRAM_SOURCES) {
  const response = await fetch(source.sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${source.label} program from ${source.sourceUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const pages = await extractPagesFromPdf(buffer);
  if (pages.length === 0) {
    throw new Error(
      `Extracted zero usable pages from ${source.label}'s program (${source.sourceUrl}) — the PDF may be image-only or the source may have changed.`,
    );
  }

  const programId = await store.upsertProgram(source);
  await store.upsertChunks(programId, pages);
  console.log(`${source.label}: ingested ${pages.length} pages from ${source.sourceUrl}`);
}

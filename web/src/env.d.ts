/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  // Optional — Cloudflare Web Analytics site token. Unset by default, in
  // which case Analytics.astro renders nothing (no tracking at all until
  // an operator deliberately configures this).
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

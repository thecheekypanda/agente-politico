import { defineConfig } from 'astro/config';

// Static output — Cloudflare Pages serves the build directly, no adapter needed.
export default defineConfig({
  output: 'static',
});

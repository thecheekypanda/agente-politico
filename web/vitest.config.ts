import { defineConfig } from 'vitest/config';

// Without this, vitest's default glob also matches test/a11y.spec.ts —
// that file belongs exclusively to Playwright's own runner (test:a11y),
// never vitest's.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});

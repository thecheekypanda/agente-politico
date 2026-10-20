import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Sandboxes that pre-provide a Chromium binary (see the project's dev
// environment notes) put it at this fixed path, which may be a different
// revision than whatever @playwright/test's package.json expects — hence
// checking for the file directly rather than trusting version alignment.
// A normal CI runner won't have this path at all and falls back to
// Playwright's default resolution after its own `playwright install` step.
const PRE_PROVIDED_CHROMIUM = '/opt/pw-browsers/chromium';
const executablePath = existsSync(PRE_PROVIDED_CHROMIUM) ? PRE_PROVIDED_CHROMIUM : undefined;

export default defineConfig({
  testDir: './test',
  testMatch: /a11y\.spec\.ts/,
  fullyParallel: true,
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4321',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
});

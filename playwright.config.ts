import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: process.env.TKG_TEST_URL || 'http://127.0.0.1:5173',
    browserName: 'chromium',
    launchOptions: process.env.TKG_CHROMIUM_PATH ? { executablePath: process.env.TKG_CHROMIUM_PATH } : {},
    trace: 'retain-on-failure',
  },
  webServer: process.env.TKG_TEST_URL ? undefined : {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
});

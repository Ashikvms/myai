import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: './node_modules/.bin/next dev -p 3001',
    port: 3001,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3001',
  },
});

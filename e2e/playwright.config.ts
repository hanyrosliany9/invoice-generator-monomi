import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.e2e' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Simplified for Docker-first approach
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2, // Optimized worker count
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['line']
  ],
  outputDir: 'test-results',
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No global setup/teardown for simplified Docker-first approach
  webServer: undefined, // Services managed by Docker
});
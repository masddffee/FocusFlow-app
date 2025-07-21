import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './.',
  fullyParallel: false, // Run tests sequentially for this comprehensive flow
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for comprehensive flow testing
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  outputDir: 'test-results/artifacts',

  use: {
    baseURL: 'http://localhost:8082',
    trace: 'on', // Always collect traces
    screenshot: 'on', // Always take screenshots
    video: 'on', // Always record video
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium-comprehensive',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Enable detailed logging
        launchOptions: {
          args: ['--enable-logging', '--v=1']
        }
      },
    },
  ],

  webServer: [
    {
      command: 'cd /Users/wetom/Desktop/FocusFlow/focusflow-backend && npm run dev',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd /Users/wetom/Desktop/FocusFlow && npm start',
      port: 8082,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    }
  ],
});
const { defineConfig } = require('@playwright/test');

const servedOrigin = 'http://127.0.0.1:4173';

module.exports = defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    timezoneId: 'UTC',
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium-file'
    },
    {
      name: 'chromium-served',
      use: {
        baseURL: servedOrigin
      }
    }
  ],
  webServer: {
    command: 'node support/static-server.js',
    url: servedOrigin + '/',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000
  }
});

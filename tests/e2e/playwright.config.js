const { defineConfig } = require('@playwright/test');

const servedOrigin = 'http://127.0.0.1:4173';
const firefoxUse = {
  browserName: 'firefox',
  baseURL: servedOrigin
};

if (process.platform === 'win32') {
  // Restricted Windows sessions can block Firefox's sandboxed content subprocess.
  // This affects only the synthetic local test browser; Linux CI keeps its sandbox.
  firefoxUse.launchOptions = {
    env: Object.assign({}, process.env, {
      MOZ_DISABLE_CONTENT_SANDBOX: '1'
    })
  };
}

module.exports = defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  globalSetup: require.resolve('./support/global-setup'),
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
    },
    {
      name: 'firefox-served',
      use: firefoxUse
    },
    {
      name: 'webkit-served',
      use: {
        browserName: 'webkit',
        baseURL: servedOrigin
      }
    }
  ]
});

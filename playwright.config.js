import { defineConfig } from '@playwright/test';

const edgeExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH || null;

const webServerCommand = process.platform === 'win32'
  ? 'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 41733 --strictPort'
  : 'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 41733 --strictPort';

const launchOptions = {
  args: [
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
  ],
};

if (edgeExecutable) {
  launchOptions.executablePath = edgeExecutable;
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:41733',
    colorScheme: 'dark',
    viewport: { width: 1440, height: 960 },
    ignoreHTTPSErrors: true,
    launchOptions,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: {
    command: webServerCommand,
    url: 'http://127.0.0.1:41733',
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: 'smoke',
      outputDir: 'artifacts/e2e-smoke',
      testIgnore: /release-capture\.spec\.js/,
    },
    {
      name: 'release-capture',
      outputDir: 'artifacts/release-videos',
      testMatch: /release-capture\.spec\.js/,
      timeout: 300000,
      use: {
        colorScheme: 'dark',
        viewport: { width: 1600, height: 1000 },
        screenshot: 'off',
        trace: 'off',
        video: {
          mode: 'on',
          size: { width: 1600, height: 1000 },
        },
      },
    },
  ],
});

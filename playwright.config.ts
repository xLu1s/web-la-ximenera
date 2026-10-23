import { defineConfig, devices } from '@playwright/test';
import { appEnv, T } from './tests/helpers/env';

const env = appEnv();
export default defineConfig({
  testDir: 'tests/e2e',
  // Un solo worker: las pruebas cambian horarios/contenido de la base de datos local compartida.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${T.appPort}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node tests/mocks/resend-mock.mjs',
      url: `http://127.0.0.1:${T.resendMockPort}/health`,
      reuseExistingServer: false,
      env: { RESEND_MOCK_PORT: String(T.resendMockPort) },
    },
    {
      command: `npm run build:node && node dist/server/entry.mjs`,
      url: `http://localhost:${T.appPort}/privacidad`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { ...env, ASTRO_ADAPTER: 'node', HOST: '127.0.0.1', PORT: String(T.appPort) },
    },
  ],
});

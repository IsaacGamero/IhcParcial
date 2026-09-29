import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/justicia-cercana/',
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    locale: 'es-PE',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/justicia-cercana/',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});

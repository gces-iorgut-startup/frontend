import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

const baseURL = (process.env.PROD_BASE_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '')

export default defineConfig({
  testDir: './e2e-smoke',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-smoke-report' }],
  ],
  use: {
    baseURL,
    headless: process.env.HEADLESS !== 'false',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

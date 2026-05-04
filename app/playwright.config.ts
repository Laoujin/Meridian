import { defineConfig, devices } from '@playwright/test';

// Demo views the gift on her Samsung Galaxy. Run all tests in that device's
// viewport — desktop framing assumptions break in portrait.
// Swap to another preset (e.g. 'Galaxy A55', 'Galaxy S9+') if needed.
const TARGET_DEVICE = 'Galaxy S24';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    // Map is a WebGL <canvas>, which DOM snapshots don't capture — without
    // video, UI mode shows a black map. `trace: 'on'` + `video: 'on'` give
    // a real recording you can scrub in the UI panel.
    screenshot: 'on',
    trace: 'on',
    video: 'on',
    ...devices[TARGET_DEVICE],
  },
  webServer: {
    command: 'bun run dev',
    port: 5173,
    reuseExistingServer: true,
  },
  projects: [
    { name: TARGET_DEVICE, use: { ...devices[TARGET_DEVICE] } },
  ],
});

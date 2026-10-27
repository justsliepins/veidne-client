import { defineConfig, devices } from '@playwright/test';

// Permanent E2E suite for the PDF export flow (grows with Batches 3-5).
//
// Two dev servers are started:
//  - :5173 with the feature ON (mode development loads .env.development, so
//    VITE_CONVERT_API_URL is set). 5173 is in Proteus's CORS allowlist.
//  - :5181 with the feature OFF (mode darklaunch loads no .env.development, so
//    the variable is absent) for the dark-launch test. It makes no Proteus calls.
//
// Proteus itself is managed out of band (docker compose in a local Proteus
// checkout; pdf-unreachable.spec.ts finds it through PROTEUS_DIR):
// delay mode for the observable live-flow specs, real mode for the @real
// output specs. Run real specs with `--grep @real` after switching Proteus.
const FEATURE_ON_URL = 'http://localhost:5173';
const DARK_LAUNCH_URL = 'http://localhost:5181';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts',
  fullyParallel: false,
  workers: 1,
  // Edge-state specs share one delay-mode Proteus and are sensitive to cold
  // starts and slot timing; a retry absorbs the occasional first-run flake.
  retries: process.env.CI ? 2 : 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: FEATURE_ON_URL,
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: FEATURE_ON_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --mode darklaunch --port 5181 --strictPort',
      url: DARK_LAUNCH_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  metadata: { darkLaunchUrl: DARK_LAUNCH_URL },
});

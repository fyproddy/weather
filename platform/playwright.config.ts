import { defineConfig, devices } from "@playwright/test";

const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgresql://growth:growth@localhost:5432/growth_e2e";
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/mock-anthropic.mjs",
      url: "http://localhost:3199/health",
      reuseExistingServer: false,
    },
    {
      command: `node scripts/migrate.mjs --reset && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: E2E_DB,
        SETUP_CODE: "test-setup-code",
        ANTHROPIC_API_KEY: "test-key",
        ANTHROPIC_BASE_URL: "http://localhost:3199",
      },
      timeout: 60_000,
    },
  ],
});

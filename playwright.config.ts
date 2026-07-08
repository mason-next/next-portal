import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // global-setup logs in and pre-warms Turbopack for all routes used in tests.
  globalSetup: require.resolve("./tests/global-setup"),
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  // Allow 2 minutes per test — enough headroom for any remaining Turbopack work.
  timeout: 120000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 20000,
    navigationTimeout: 60000,
    // Reuse the login session saved by global-setup so tests don't need to log in.
    storageState: "tests/auth.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

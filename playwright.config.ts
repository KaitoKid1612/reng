import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3217", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --port 3217",
    url: "http://127.0.0.1:3217",
    reuseExistingServer: false,
    env: {
      LESSON_SOURCE: "local",
      SITE_URL: "http://127.0.0.1:3217",
      SUPABASE_URL: "",
      SUPABASE_SECRET_KEY: "",
      SUPABASE_PUBLISHABLE_KEY: "",
    },
    timeout: 120000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

import { execFileSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

const PORT = 3218;

// Reads keys of the local stack started with `npx supabase start`; never a hosted project.
function loadLocalSupabase() {
  if (!process.env.E2E_SUPABASE_URL) {
    const output = execFileSync("npx", ["supabase", "status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const status: Record<string, string> = JSON.parse(output.slice(output.indexOf("{")));
    process.env.E2E_SUPABASE_URL = status.API_URL;
    process.env.E2E_SUPABASE_PUBLISHABLE_KEY = status.PUBLISHABLE_KEY;
    process.env.E2E_SUPABASE_SECRET_KEY = status.SECRET_KEY;
    process.env.E2E_MAILPIT_URL = status.MAILPIT_URL ?? status.INBUCKET_URL;
  }
  const url = process.env.E2E_SUPABASE_URL ?? "";
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("Supabase E2E tests only run against a local stack.");
  }
  return {
    url,
    publishableKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "",
    secretKey: process.env.E2E_SUPABASE_SECRET_KEY ?? "",
  };
}

const supabase = loadLocalSupabase();

export default defineConfig({
  testDir: "./e2e-supabase",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  globalSetup: "./e2e-supabase/global-setup.ts",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    env: {
      LESSON_SOURCE: "supabase",
      SUPABASE_URL: supabase.url,
      SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      SUPABASE_SECRET_KEY: supabase.secretKey,
    },
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

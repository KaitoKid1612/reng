import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

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

// Fresh per run; workers inherit them from the main process environment.
process.env.E2E_CRON_SECRET ??= randomBytes(16).toString("hex");
process.env.E2E_EMAIL_LINK_SECRET ??= randomBytes(16).toString("hex");
process.env.E2E_WEBHOOK_SECRET ??= `whsec_${randomBytes(24).toString("base64")}`;

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
      // Explicit, so a developer's .env.local cannot point email links at another port.
      SITE_URL: `http://127.0.0.1:${PORT}`,
      SUPABASE_URL: supabase.url,
      SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      SUPABASE_SECRET_KEY: supabase.secretKey,
      CRON_SECRET: process.env.E2E_CRON_SECRET,
      EMAIL_LINK_SECRET: process.env.E2E_EMAIL_LINK_SECRET,
      RESEND_WEBHOOK_SECRET: process.env.E2E_WEBHOOK_SECRET,
      EMAIL_PROVIDER: "mailpit",
      MAILPIT_URL: process.env.E2E_MAILPIT_URL ?? "",
      EMAIL_FROM: "Reng <nhacbai@reng.local>",
    },
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

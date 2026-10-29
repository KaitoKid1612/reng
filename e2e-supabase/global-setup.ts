import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

// Resets the local teacher used by the flows and publishes the sample lessons it owns.
export default function globalSetup() {
  const password = `t-${randomBytes(9).toString("base64url")}`;
  execFileSync("node", ["--import", "tsx", "scripts/seed-local.ts", "--password", password], {
    stdio: "inherit",
    env: {
      ...process.env,
      SUPABASE_URL: process.env.E2E_SUPABASE_URL,
      SUPABASE_SECRET_KEY: process.env.E2E_SUPABASE_SECRET_KEY,
    },
  });
  process.env.E2E_TEACHER_EMAIL = "teacher@reng.local";
  process.env.E2E_TEACHER_PASSWORD = password;
  process.env.E2E_RUN_ID = Date.now().toString(36);
}

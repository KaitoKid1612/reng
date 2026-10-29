import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

// Development only: makes an existing local account a platform admin. Cloud projects grant
// admins with the SQL in docs/poc-setup.md so the action is deliberate and audited there.
async function main() {
  const { values } = parseArgs({ options: { email: { type: "string" } } });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY from `npx supabase status -o env`.");
  }
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("admin:grant only writes to a Supabase stack running on this machine.");
  }
  if (!values.email) {
    throw new Error("Provide --email of an account that has already signed up.");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    throw new Error("Unable to list local users. Check that the local stack is running.");
  }
  const user = data.users.find((item) => item.email === values.email);
  if (!user) {
    throw new Error(`No local account uses ${values.email}. Sign up first.`);
  }
  const { error: grantError } = await client
    .from("platform_admins")
    .upsert({ user_id: user.id, note: "Granted by admin:grant" }, { onConflict: "user_id" });
  if (grantError) {
    throw new Error("Unable to grant admin. Apply migration 202610290005 first.");
  }
  console.log(`${values.email} is now a platform admin on the local stack.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to grant admin.");
  process.exit(1);
});

import "server-only";

import { createClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/server/supabase";

// An account made with email and password lists "email" among its sign-in providers; one made
// with Google alone has no password to confirm yet.
export function hasPasswordSignIn(appMetadata: { providers?: unknown }) {
  return Array.isArray(appMetadata.providers) && appMetadata.providers.includes("email");
}

export async function accountHasPassword(userId: string) {
  const { data, error } = await createServiceClient().auth.admin.getUserById(userId);
  return !error && data.user !== null && hasPasswordSignIn(data.user.app_metadata);
}

/**
 * Whether the password is the account's current one: true, false, or null when Supabase could not
 * tell (rate limit, outage). It signs in with a client of its own, so the browser's session is
 * untouched, and ends the session that check opened at once.
 */
export async function isCurrentPassword(email: string, password: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !email) {
    return null;
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return error.code === "invalid_credentials" ? false : null;
  }
  await client.auth.signOut({ scope: "local" });
  return data.session !== null;
}

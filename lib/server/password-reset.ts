import "server-only";

import { isRecentEmailLinkSession } from "@/lib/auth-sessions";

import type { SupabaseClient } from "@supabase/supabase-js";

// getClaims verifies the session token before its sign-in method is trusted.
export async function canSetNewPassword(client: SupabaseClient) {
  const { data, error } = await client.auth.getClaims();
  return !error && data !== null && isRecentEmailLinkSession(data.claims.amr, new Date());
}

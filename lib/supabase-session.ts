import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { CookieOptionsWithName } from "@supabase/ssr";

export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function isAuthConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY);
}

export async function createSessionClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try {
          entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session before render.
        }
      },
    },
  });
}

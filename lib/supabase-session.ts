import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function isTeacherAuthConfigured() {
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
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

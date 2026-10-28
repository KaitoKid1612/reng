import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase-session";

import type { NextRequest } from "next/server";

// Refreshes an expiring Supabase session before rendering, because Server Components cannot
// write cookies. Without Supabase configuration every request passes through unchanged.
export async function proxy(request: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const client = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries, headers) => {
        entries.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([header, value]) => response.headers.set(header, value));
      },
    },
  });
  await client.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|audio/|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|woff2?)$).*)",
  ],
};

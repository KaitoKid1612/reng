import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth-paths";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { createSessionClient } from "@/lib/supabase-session";

import type { NextRequest } from "next/server";

// Email links carry a token hash so confirmation also works on a different device/browser.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request.headers, request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const failure = NextResponse.redirect(new URL("/sign-in?error=link", origin), 303);
  if (!tokenHash || (type !== "email" && type !== "recovery")) {
    return failure;
  }
  const client = await createSessionClient();
  if (!client) {
    return failure;
  }
  const { error } = await client.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return failure;
  }
  const destination =
    type === "recovery"
      ? "/reset-password"
      : safeNextPath(url.searchParams.get("next"), "/classes");
  return NextResponse.redirect(new URL(destination, origin), 303);
}

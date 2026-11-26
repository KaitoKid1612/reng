import { NextResponse } from "next/server";

import { safeNextPath, signInErrorPath } from "@/lib/auth-paths";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { createSessionClient } from "@/lib/supabase-session";

import type { NextRequest } from "next/server";

// The hosted email templates (production has no custom sender yet) link through Supabase, which
// comes back with a one-time code instead of a token hash. The code only works in the browser that
// asked for the email, which is where a reset is usually opened.
async function exchangeEmailCode(code: string, url: URL, origin: string, failure: NextResponse) {
  const client = await createSessionClient();
  const exchange = client ? await client.auth.exchangeCodeForSession(code) : null;
  if (!exchange || exchange.error) {
    return failure;
  }
  // A reset asks for "/reset-password" as next; a confirmation names the page to return to.
  const destination = safeNextPath(url.searchParams.get("next"), "/classes");
  return NextResponse.redirect(new URL(destination, origin), 303);
}

// Email links carry a token hash so confirmation also works on a different device/browser.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request.headers, request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const failure = NextResponse.redirect(new URL(signInErrorPath("link", ""), origin), 303);
  const code = url.searchParams.get("code");
  if (!tokenHash && code) {
    return exchangeEmailCode(code, url, origin, failure);
  }
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

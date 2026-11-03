import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultHomePath, safeNextPath, signInErrorPath } from "@/lib/auth-paths";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { createServiceClient, isGoogleAuthEnabled, selectOptional } from "@/lib/server/supabase";
import { createSessionClient } from "@/lib/supabase-session";

import type { NextRequest } from "next/server";

// Google sign-in comes back here with a one-time code, which becomes the session on this origin.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request.headers, request.url);
  const nextPath = safeNextPath(url.searchParams.get("next"), "");
  const code = url.searchParams.get("code");
  if (!code) {
    // Supabase passes Google's refusal on as ?error=access_denied when the person cancels.
    const reason =
      url.searchParams.get("error") === "access_denied" ? "google-cancelled" : "google";
    return NextResponse.redirect(new URL(signInErrorPath(reason, nextPath), origin), 303);
  }
  const client = isGoogleAuthEnabled() ? await createSessionClient() : null;
  const exchange = client ? await client.auth.exchangeCodeForSession(code) : null;
  if (!exchange?.data.user || exchange.error) {
    return NextResponse.redirect(new URL(signInErrorPath("google", nextPath), origin), 303);
  }
  // A first Google sign-in creates a learner profile; teachers keep their own home page.
  const profile = await selectOptional(
    createServiceClient()
      .from("profiles")
      .select("role")
      .eq("id", exchange.data.user.id)
      .maybeSingle(),
    z.object({ role: z.enum(["student", "teacher"]) }),
  );
  const destination = nextPath || defaultHomePath(profile?.role ?? "student");
  return NextResponse.redirect(new URL(destination, origin), 303);
}

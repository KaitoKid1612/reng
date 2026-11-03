import { NextResponse } from "next/server";

import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { unsubscribeAll } from "@/lib/server/notifications";
import { getRequestOrigin } from "@/lib/server/request-origin";

interface UnsubscribeRouteContext {
  params: Promise<{ token: string }>;
}

// A mail app or person opening the header link with GET sees the confirmation page. Only POST
// unsubscribes, so a link scanner that follows links cannot turn anyone's email off.
export async function GET(request: Request, { params }: UnsubscribeRouteContext) {
  const { token } = await params;
  const origin = getRequestOrigin(request.headers, request.url);
  return NextResponse.redirect(new URL(`/unsubscribe/${encodeURIComponent(token)}`, origin), 303);
}

// RFC 8058 one-click POST from mail providers, or the confirmation form on /unsubscribe.
// The signed token is the authorization, so no session or same-origin check applies.
export async function POST(request: Request, { params }: UnsubscribeRouteContext) {
  const { token } = await params;
  const secret = process.env.EMAIL_LINK_SECRET;
  const userId = secret ? verifyUnsubscribeToken(token, secret) : null;
  if (!userId) {
    return NextResponse.json({ code: "invalid_link" }, { status: 404 });
  }
  await unsubscribeAll(userId);
  const body = await request.text();
  if (body.includes("List-Unsubscribe=One-Click")) {
    return new NextResponse("Unsubscribed", { status: 200 });
  }
  const origin = getRequestOrigin(request.headers, request.url);
  return NextResponse.redirect(new URL(`/unsubscribe/${token}?done=1`, origin), 303);
}

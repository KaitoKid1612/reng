import { NextResponse } from "next/server";

import { createSessionClient } from "@/lib/supabase-session";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const client = await createSessionClient();
  await client?.auth.signOut();
  return NextResponse.redirect(new URL("/lessons", request.url), 303);
}

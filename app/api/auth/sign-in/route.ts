import { NextResponse } from "next/server";

import { createSessionClient } from "@/lib/supabase-session";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const client = await createSessionClient();
  if (!client) {
    return NextResponse.json({ error: "Sign-in is unavailable." }, { status: 503 });
  }
  const form = await request.formData();
  const email = form.get("email");
  const password = form.get("password");
  const failure = () => NextResponse.redirect(new URL("/teach/sign-in?error=1", request.url), 303);
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !email.includes("@") ||
    typeof password !== "string" ||
    !password ||
    password.length > 128
  ) {
    return failure();
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return failure();
  }
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") {
    await client.auth.signOut();
    return failure();
  }
  return NextResponse.redirect(new URL("/lessons", request.url), 303);
}

import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/server/cron-auth";
import { runDailyPractice } from "@/lib/server/daily-practice";
import { isClassroomConfigured } from "@/lib/server/supabase";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Scheduled each morning in vercel.json (UTC); does not need email to be configured.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isClassroomConfigured()) {
    return NextResponse.json({ code: "not_configured" }, { status: 503, headers: NO_STORE });
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    return NextResponse.json(await runDailyPractice(new Date()), { headers: NO_STORE });
  } catch (error) {
    console.error("Daily practice job failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ code: "job_failed" }, { status: 500, headers: NO_STORE });
  }
}

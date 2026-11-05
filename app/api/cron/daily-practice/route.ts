import { NextResponse } from "next/server";

import { submitExpiredAttempts } from "@/lib/server/assignments";
import { isCronAuthorized } from "@/lib/server/cron-auth";
import { runDailyPractice } from "@/lib/server/daily-practice";
import { describeServiceFailure, isClassroomConfigured } from "@/lib/server/supabase";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Daily sets come first; handing in expired attempts gets what is left of the minute.
export const maxDuration = 60;

// Runs after the daily sets and fails on its own: an error here (for example before migration
// 20261105012503 is applied) must not cost a class its daily practice.
async function handInExpiredAttempts() {
  try {
    return await submitExpiredAttempts();
  } catch (error) {
    console.error("Expired attempts job failed", describeServiceFailure(error));
    return { code: "job_failed" };
  }
}

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
    const daily = await runDailyPractice(new Date());
    const expiredAttempts = await handInExpiredAttempts();
    return NextResponse.json({ ...daily, expiredAttempts }, { headers: NO_STORE });
  } catch (error) {
    console.error("Daily practice job failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ code: "job_failed" }, { status: 500, headers: NO_STORE });
  }
}

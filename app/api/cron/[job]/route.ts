import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { isNotificationJob } from "@/lib/notifications/schedule";
import { deliverPendingEmails, isEmailConfigured, planEmails } from "@/lib/server/notifications";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { isClassroomConfigured } from "@/lib/server/supabase";

interface CronRouteContext {
  params: Promise<{ job: string }>;
}

const NO_STORE = { "Cache-Control": "private, no-store" };

function isAuthorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Scheduled by vercel.json in UTC; also callable locally with the same bearer secret.
export async function GET(request: Request, { params }: CronRouteContext) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isClassroomConfigured() || !isEmailConfigured()) {
    return NextResponse.json({ code: "not_configured" }, { status: 503, headers: NO_STORE });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const { job } = await params;
  if (!isNotificationJob(job)) {
    return NextResponse.json({ code: "not_found" }, { status: 404, headers: NO_STORE });
  }
  const now = new Date();
  const origin = (process.env.SITE_URL || getRequestOrigin(request.headers, request.url)).replace(
    /\/$/,
    "",
  );
  try {
    const planned = await planEmails(job, now);
    const delivered = await deliverPendingEmails(now, origin);
    return NextResponse.json({ planned, ...delivered }, { headers: NO_STORE });
  } catch (error) {
    console.error("Notification job failed", job, error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ code: "job_failed" }, { status: 500, headers: NO_STORE });
  }
}

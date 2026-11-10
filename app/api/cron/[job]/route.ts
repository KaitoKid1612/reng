import { NextResponse } from "next/server";

import { isNotificationJob } from "@/lib/notifications/schedule";
import { isCronAuthorized } from "@/lib/server/cron-auth";
import { deliverPendingEmails, isEmailConfigured, planEmails } from "@/lib/server/notifications";
import { isPushConfigured, sendPushReminders } from "@/lib/server/push";
import { getRequestOrigin } from "@/lib/server/request-origin";
import { isClassroomConfigured } from "@/lib/server/supabase";

interface CronRouteContext {
  params: Promise<{ job: string }>;
}

const NO_STORE = { "Cache-Control": "private, no-store" };

// Delivery stops sending after EMAIL_RUN_BUDGET_MS, which leaves room for planning and replies.
export const maxDuration = 60;

// Scheduled by vercel.json in UTC; also callable locally with the same bearer secret. The evening
// reminder also goes out as a browser notification, so that job runs without email too.
export async function GET(request: Request, { params }: CronRouteContext) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isClassroomConfigured()) {
    return NextResponse.json({ code: "not_configured" }, { status: 503, headers: NO_STORE });
  }
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const { job } = await params;
  if (!isNotificationJob(job)) {
    return NextResponse.json({ code: "not_found" }, { status: 404, headers: NO_STORE });
  }
  const sendsPush = job === "student-reminders" && isPushConfigured();
  const sendsEmail = isEmailConfigured();
  if (!sendsPush && !sendsEmail) {
    return NextResponse.json({ code: "not_configured" }, { status: 503, headers: NO_STORE });
  }
  const now = new Date();
  const origin = (process.env.SITE_URL || getRequestOrigin(request.headers, request.url)).replace(
    /\/$/,
    "",
  );
  try {
    // Notifications first: they are quick, and email delivery then uses the time that is left.
    const push = sendsPush ? await sendPushReminders(now) : null;
    if (!sendsEmail) {
      return NextResponse.json({ push }, { headers: NO_STORE });
    }
    const planned = await planEmails(job, now);
    const delivered = await deliverPendingEmails(now, origin);
    return NextResponse.json({ push, planned, ...delivered }, { headers: NO_STORE });
  } catch (error) {
    console.error("Notification job failed", job, error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ code: "job_failed" }, { status: 500, headers: NO_STORE });
  }
}

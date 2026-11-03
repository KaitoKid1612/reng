import { shiftStudyDay, studyDayStart, toStudyDay } from "@/lib/study-days";

export const EMAIL_TYPES = ["daily_reminder", "weekly_summary", "teacher_digest"] as const;
export const NOTIFICATION_JOBS = {
  "student-reminders": "daily_reminder",
  "weekly-summary": "weekly_summary",
  "teacher-digest": "teacher_digest",
} as const;
export const MAX_EMAIL_ATTEMPTS = 3;
export const EMAIL_LEASE_SECONDS = 300;
export const EMAIL_BATCH_SIZE = 50;
// Resend allows 2 requests a second by default; sending a little slower keeps clear of 429s.
export const EMAIL_SEND_INTERVAL_MS = 600;
// A cron run claims and sends batches until this much time has passed, inside the route's
// 60-second limit; whatever is left waits for the next run.
export const EMAIL_RUN_BUDGET_MS = 45_000;

const RETRY_DELAYS_MINUTES = [15, 60];

export type EmailType = (typeof EMAIL_TYPES)[number];
export type NotificationJob = keyof typeof NOTIFICATION_JOBS;

export function isNotificationJob(value: string): value is NotificationJob {
  return value in NOTIFICATION_JOBS;
}

// One job per person, type and Vietnam calendar day; reruns reuse it instead of resending.
export function emailIdempotencyKey(type: EmailType, userId: string, forDate: string) {
  return `${type}:${userId}:${forDate}`;
}

export function emailDateOf(now: Date) {
  return toStudyDay(now);
}

export function nextRetryAt(attempts: number, now: Date) {
  const minutes = RETRY_DELAYS_MINUTES[Math.min(attempts - 1, RETRY_DELAYS_MINUTES.length - 1)];
  return new Date(now.getTime() + minutes * 60_000);
}

// due_only reminders cover unsubmitted work due before tomorrow ends, in Vietnam time. "The next
// 24 hours" left a gap whenever the once-a-day cron started late one day and on time the next;
// calendar days leave none.
export function isDueSoon(dueAt: string | null, now: Date) {
  if (!dueAt) {
    return false;
  }
  const due = Date.parse(dueAt);
  return due > now.getTime() && due < studyDayStart(shiftStudyDay(toStudyDay(now), 2));
}

// A job left from an earlier day is stale: last night's reminder or yesterday's digest would say
// the wrong thing. The weekly summary may still go out the next morning.
const EMAIL_GRACE_DAYS: Record<EmailType, number> = {
  daily_reminder: 0,
  teacher_digest: 0,
  weekly_summary: 1,
};

export function isEmailJobExpired(type: EmailType, forDate: string, now: Date) {
  return shiftStudyDay(forDate, EMAIL_GRACE_DAYS[type]) < toStudyDay(now);
}

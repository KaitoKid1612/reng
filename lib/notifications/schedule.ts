import { toStudyDay } from "@/lib/study-days";

export const EMAIL_TYPES = ["daily_reminder", "weekly_summary", "teacher_digest"] as const;
export const NOTIFICATION_JOBS = {
  "student-reminders": "daily_reminder",
  "weekly-summary": "weekly_summary",
  "teacher-digest": "teacher_digest",
} as const;
export const MAX_EMAIL_ATTEMPTS = 3;
export const EMAIL_LEASE_SECONDS = 300;
export const EMAIL_BATCH_SIZE = 50;

const RETRY_DELAYS_MINUTES = [15, 60];
const DAY_MS = 24 * 60 * 60 * 1000;

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

// due_only reminders cover unsubmitted work whose deadline falls within the next 24 hours.
export function isDueSoon(dueAt: string | null, now: Date) {
  if (!dueAt) {
    return false;
  }
  const remaining = Date.parse(dueAt) - now.getTime();
  return remaining > 0 && remaining <= DAY_MS;
}

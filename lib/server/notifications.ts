import "server-only";

import { z } from "zod";

import { FEEDBACK_POLICIES, isFeedbackAvailable } from "@/lib/assignment";
import { toPercent } from "@/lib/grading/grade";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";
import { toStudyWords } from "@/lib/study-words";
import {
  EMAIL_BATCH_SIZE,
  EMAIL_LEASE_SECONDS,
  EMAIL_TYPES,
  emailDateOf,
  emailIdempotencyKey,
  isDueSoon,
  MAX_EMAIL_ATTEMPTS,
  nextRetryAt,
  NOTIFICATION_JOBS,
} from "@/lib/notifications/schedule";
import {
  renderDailyReminder,
  renderTeacherDigest,
  renderWeeklySummary,
} from "@/lib/notifications/templates";
import { createUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { listClassLessons, listStudentClasses, listTeacherClasses } from "@/lib/server/classes";
import { getEmailProvider } from "@/lib/server/email-provider";
import { getLearnerAgenda, getStudyActivity } from "@/lib/server/learner";
import { getClassReport } from "@/lib/server/reports";
import {
  callRpc,
  createServiceClient,
  runMutation,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";
import { countStudyStreak } from "@/lib/study-days";

import type { EmailType, NotificationJob } from "@/lib/notifications/schedule";
import type { DigestClass, EmailContent, WeekStats } from "@/lib/notifications/templates";
import type { OutgoingEmail, SendOutcome } from "@/lib/server/email-provider";

const timestamp = z.iso.datetime({ offset: true });
const DAY_MS = 24 * 60 * 60 * 1000;

export const REMINDER_FREQUENCIES = ["daily", "due_only", "off"] as const;
export type ReminderFrequency = (typeof REMINDER_FREQUENCIES)[number];

const preferenceRowSchema = z.object({
  user_id: z.uuid(),
  reminder_frequency: z.enum(REMINDER_FREQUENCIES),
  weekly_enabled: z.boolean(),
  teacher_digest_enabled: z.boolean(),
  consented_at: timestamp.nullable(),
  delivery_paused_at: timestamp.nullable(),
  delivery_pause_reason: z.enum(["bounced", "complained"]).nullable(),
});

type PreferenceRow = z.infer<typeof preferenceRowSchema>;

const PREFERENCE_COLUMNS =
  "user_id, reminder_frequency, weekly_enabled, teacher_digest_enabled, consented_at, delivery_paused_at, delivery_pause_reason";

export interface NotificationPreferences {
  reminderFrequency: ReminderFrequency;
  weeklyEnabled: boolean;
  teacherDigestEnabled: boolean;
  pauseReason: "bounced" | "complained" | null;
}

async function loadPreferenceRow(userId: string) {
  return selectOptional(
    createServiceClient()
      .from("notification_preferences")
      .select(PREFERENCE_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle(),
    preferenceRowSchema,
  );
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await loadPreferenceRow(userId);
  return {
    reminderFrequency: row?.reminder_frequency ?? "off",
    weeklyEnabled: row?.weekly_enabled ?? false,
    teacherDigestEnabled: row?.teacher_digest_enabled ?? false,
    pauseReason: row?.delivery_pause_reason ?? null,
  };
}

async function cancelUnsentJobs(userId: string, types: readonly EmailType[] = EMAIL_TYPES) {
  await runMutation(
    createServiceClient()
      .from("email_log")
      .update({ status: "cancelled", lease_until: null, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("status", ["pending", "failed"])
      .in("email_type", [...types]),
  );
}

function enabledTypes(
  row: Pick<PreferenceRow, "reminder_frequency" | "weekly_enabled" | "teacher_digest_enabled">,
) {
  return EMAIL_TYPES.filter((type) => {
    if (type === "daily_reminder") {
      return row.reminder_frequency !== "off";
    }
    return type === "weekly_summary" ? row.weekly_enabled : row.teacher_digest_enabled;
  });
}

// Opt-in only. Saving also clears a bounce pause: the person has just confirmed the address.
export async function saveNotificationPreferences(
  userId: string,
  role: "student" | "teacher",
  input: Omit<NotificationPreferences, "pauseReason">,
) {
  const next = {
    reminder_frequency: input.reminderFrequency,
    weekly_enabled: input.weeklyEnabled,
    teacher_digest_enabled: role === "teacher" && input.teacherDigestEnabled,
  };
  const isEnabled = enabledTypes(next).length > 0;
  const current = await loadPreferenceRow(userId);
  const now = new Date().toISOString();
  await runMutation(
    createServiceClient()
      .from("notification_preferences")
      .upsert(
        {
          user_id: userId,
          ...next,
          consented_at: isEnabled ? (current?.consented_at ?? now) : null,
          delivery_paused_at: null,
          delivery_pause_reason: null,
          updated_at: now,
        },
        { onConflict: "user_id" },
      ),
  );
  const disabled = EMAIL_TYPES.filter((type) => !enabledTypes(next).includes(type));
  if (disabled.length) {
    await cancelUnsentJobs(userId, disabled);
  }
}

export async function unsubscribeAll(userId: string) {
  await runMutation(
    createServiceClient().from("notification_preferences").upsert(
      {
        user_id: userId,
        reminder_frequency: "off",
        weekly_enabled: false,
        teacher_digest_enabled: false,
        consented_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    ),
  );
  await cancelUnsentJobs(userId);
}

async function pauseDelivery(userId: string, reason: "bounced" | "complained") {
  await runMutation(
    createServiceClient().from("notification_preferences").upsert(
      {
        user_id: userId,
        delivery_paused_at: new Date().toISOString(),
        delivery_pause_reason: reason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    ),
  );
  await cancelUnsentJobs(userId);
}

export async function handleEmailEvent(type: string, providerMessageId: string, now: Date) {
  const service = createServiceClient();
  if (type === "email.opened") {
    await runMutation(
      service
        .from("email_log")
        .update({ opened_at: now.toISOString(), updated_at: now.toISOString() })
        .eq("provider_message_id", providerMessageId)
        .is("opened_at", null),
    );
    return;
  }
  if (type !== "email.bounced" && type !== "email.complained") {
    return;
  }
  const row = await selectOptional(
    service
      .from("email_log")
      .select("user_id")
      .eq("provider_message_id", providerMessageId)
      .limit(1)
      .maybeSingle(),
    z.object({ user_id: z.uuid() }),
  );
  if (row) {
    await pauseDelivery(row.user_id, type === "email.bounced" ? "bounced" : "complained");
  }
}

const recipientSchema = z.object({
  user_id: z.uuid(),
  email: z.string(),
  full_name: z.string(),
  role: z.enum(["student", "teacher"]),
});

type Recipient = z.infer<typeof recipientSchema>;

async function loadRecipients(userIds: readonly string[]) {
  if (!userIds.length) {
    return new Map<string, Recipient>();
  }
  const rows = await callRpc(
    "email_recipients",
    { p_user_ids: [...new Set(userIds)] },
    z.array(recipientSchema),
  );
  return new Map(rows.map((row) => [row.user_id, row]));
}

interface ReminderWork {
  dueCards: number;
  assignments: { title: string; dueAt: string | null }[];
}

// "Nothing to say, send nothing": the same check runs when planning and right before sending.
async function describeReminderWork(
  userId: string,
  frequency: ReminderFrequency,
  now: Date,
): Promise<ReminderWork | null> {
  if (frequency === "off") {
    return null;
  }
  const agenda = await getLearnerAgenda(userId, now);
  const open = agenda.openAssignments.map((item) => ({
    title: item.assignment.title,
    dueAt: item.assignment.dueAt,
  }));
  if (frequency === "due_only") {
    const dueSoon = open.filter((item) => isDueSoon(item.dueAt, now));
    return dueSoon.length ? { dueCards: 0, assignments: dueSoon.slice(0, 3) } : null;
  }
  return agenda.dueCardCount > 0 || open.length
    ? { dueCards: agenda.dueCardCount, assignments: open.slice(0, 3) }
    : null;
}

async function pickWordOfDay(userId: string, now: Date) {
  const classes = await listStudentClasses(userId);
  const lessons = (await Promise.all(classes.map((item) => listClassLessons(item.id))))
    .flat()
    .filter((lesson) => Date.parse(lesson.availableAt) <= now.getTime());
  const day = Math.floor(now.getTime() / DAY_MS);
  const lesson = lessons[day % Math.max(lessons.length, 1)];
  if (!lesson) {
    return null;
  }
  const version = await loadAccessibleLessonVersion(lesson.lessonId, lesson.versionId, userId);
  const vocab = version ? toStudyWords(version) : [];
  return vocab.length ? vocab[day % vocab.length] : null;
}

const submissionStatSchema = z.object({
  assignment_id: z.uuid(),
  score: z.number().int(),
  max_score: z.number().int(),
  submitted_at: timestamp,
});

async function describeWeeks(userId: string, now: Date) {
  const service = createServiceClient();
  const start = new Date(now.getTime() - 14 * DAY_MS).toISOString();
  const weekStart = now.getTime() - 7 * DAY_MS;
  const [reviews, submissions] = await Promise.all([
    selectRows(
      service
        .from("review_events")
        .select("reviewed_at")
        .eq("user_id", userId)
        .gte("reviewed_at", start),
      z.object({ reviewed_at: timestamp }),
    ),
    selectRows(
      service
        .from("submissions")
        .select("assignment_id, score, max_score, submitted_at")
        .eq("user_id", userId)
        .eq("status", "submitted")
        .gte("submitted_at", start),
      submissionStatSchema,
    ),
  ]);
  if (!reviews.length && !submissions.length) {
    return null;
  }
  const assignmentIds = [...new Set(submissions.map((row) => row.assignment_id))];
  const rules = assignmentIds.length
    ? await selectRows(
        service.from("assignments").select("id, feedback_policy, due_at").in("id", assignmentIds),
        z.object({
          id: z.uuid(),
          feedback_policy: z.enum(FEEDBACK_POLICIES),
          due_at: timestamp.nullable(),
        }),
      )
    : [];
  function summarize(isThisWeek: boolean): WeekStats {
    const inWeek = (instant: string) => Date.parse(instant) >= weekStart === isThisWeek;
    // Test scores stay out of email until the assignment's feedback time.
    const visible = submissions.filter((row) => {
      const rule = rules.find((item) => item.id === row.assignment_id);
      return (
        inWeek(row.submitted_at) &&
        rule !== undefined &&
        isFeedbackAvailable(
          { feedbackPolicy: rule.feedback_policy, dueAt: rule.due_at },
          row.submitted_at,
          now,
        )
      );
    });
    return {
      reviews: reviews.filter((row) => inWeek(row.reviewed_at)).length,
      submissions: submissions.filter((row) => inWeek(row.submitted_at)).length,
      averagePercent: visible.length
        ? visible.reduce((total, row) => total + toPercent(row.score, row.max_score), 0) /
          visible.length
        : null,
    };
  }
  return { thisWeek: summarize(true), lastWeek: summarize(false) };
}

const ATTENTION = new Set(["abandoned", "failing", "weak_listening"]);

async function describeDigest(teacherId: string, now: Date, origin: string) {
  const classes = (await listTeacherClasses(teacherId)).filter((item) => item.active);
  const since = new Date(now.getTime() - DAY_MS).toISOString();
  const entries = await Promise.all(
    classes.map(async (item): Promise<DigestClass | null> => {
      const report = await getClassReport(teacherId, item.id, now);
      const ids = report.assignments.map((assignment) => assignment.id);
      const recent = ids.length
        ? await selectRows(
            createServiceClient()
              .from("submissions")
              .select("id")
              .in("assignment_id", ids)
              .eq("status", "submitted")
              .gte("submitted_at", since),
            z.object({ id: z.uuid() }),
          )
        : [];
      const entry: DigestClass = {
        name: item.name,
        url: `${origin}/teach/classes/${item.id}`,
        newSubmissions: recent.length,
        attention: report.reports
          .filter((row) => ATTENTION.has(row.label))
          .map((row) => row.member.fullName || row.member.email),
        hardQuestions: report.questionStats
          .flatMap((stat) => stat.questions)
          .slice(0, 3)
          .map((question) => ({
            prompt: question.prompt,
            wrong: question.wrong_count,
            total: question.total_count,
          })),
      };
      return entry.newSubmissions || entry.attention.length || entry.hardQuestions.length
        ? entry
        : null;
    }),
  );
  const active = entries.filter((entry): entry is DigestClass => entry !== null);
  return active.length ? active : null;
}

function isTypeEnabled(row: PreferenceRow | null, type: EmailType) {
  return row !== null && row.delivery_paused_at === null && enabledTypes(row).includes(type);
}

interface ComposeContext {
  now: Date;
  origin: string;
  secret: string;
}

async function composeContent(
  type: EmailType,
  recipient: Recipient,
  preferences: PreferenceRow,
  links: { settingsUrl: string; unsubscribeUrl: string },
  context: ComposeContext,
): Promise<EmailContent | null> {
  const { now, origin } = context;
  if (type === "teacher_digest") {
    if (recipient.role !== "teacher") {
      return null;
    }
    const classes = await describeDigest(recipient.user_id, now, origin);
    return classes
      ? renderTeacherDigest({
          ...links,
          reason: "Bạn nhận thư này vì đã bật tóm tắt lớp buổi sáng trên Reng.",
          name: recipient.full_name,
          classes,
        })
      : null;
  }
  if (type === "weekly_summary") {
    const weeks = await describeWeeks(recipient.user_id, now);
    return weeks
      ? renderWeeklySummary({
          ...links,
          ...weeks,
          reason: "Bạn nhận thư này vì đã bật tổng kết tuần trên Reng.",
          name: recipient.full_name,
          progressUrl: `${origin}/progress`,
        })
      : null;
  }
  const work = await describeReminderWork(recipient.user_id, preferences.reminder_frequency, now);
  if (!work) {
    return null;
  }
  const [activity, word] = await Promise.all([
    getStudyActivity(recipient.user_id),
    pickWordOfDay(recipient.user_id, now),
  ]);
  return renderDailyReminder({
    ...links,
    ...work,
    reason: "Bạn nhận thư này vì đã bật nhắc học trên Reng.",
    name: recipient.full_name,
    streak: countStudyStreak(activity, now),
    word,
    reviewUrl: `${origin}/review`,
    assignmentsUrl: `${origin}/classes`,
  });
}

async function composeEmail(
  job: { user_id: string; email_type: EmailType; idempotency_key: string },
  recipient: Recipient | undefined,
  context: ComposeContext,
): Promise<OutgoingEmail | null> {
  if (!recipient?.email) {
    return null;
  }
  const preferences = await loadPreferenceRow(job.user_id);
  if (!preferences || !isTypeEnabled(preferences, job.email_type)) {
    return null;
  }
  const token = createUnsubscribeToken(job.user_id, context.secret);
  const links = {
    settingsUrl: `${context.origin}/settings/notifications`,
    unsubscribeUrl: `${context.origin}/unsubscribe/${token}`,
  };
  const content = await composeContent(job.email_type, recipient, preferences, links, context);
  return content
    ? {
        to: recipient.email,
        ...content,
        idempotencyKey: job.idempotency_key,
        oneClickUnsubscribeUrl: `${context.origin}/api/unsubscribe/${token}`,
      }
    : null;
}

export async function planEmails(job: NotificationJob, now: Date) {
  const type = NOTIFICATION_JOBS[job];
  const service = createServiceClient();
  let query = service
    .from("notification_preferences")
    .select(PREFERENCE_COLUMNS)
    .is("delivery_paused_at", null);
  if (type === "daily_reminder") {
    query = query.in("reminder_frequency", ["daily", "due_only"]);
  } else {
    query = query.eq(type === "weekly_summary" ? "weekly_enabled" : "teacher_digest_enabled", true);
  }
  const preferences = await selectRows(query, preferenceRowSchema);
  const recipients = await loadRecipients(preferences.map((row) => row.user_id));
  const forDate = emailDateOf(now);
  const rows: Record<string, unknown>[] = [];
  for (const preference of preferences) {
    const recipient = recipients.get(preference.user_id);
    if (!recipient || (type === "teacher_digest" && recipient.role !== "teacher")) {
      continue;
    }
    let hasWork = false;
    if (type === "daily_reminder") {
      hasWork =
        (await describeReminderWork(preference.user_id, preference.reminder_frequency, now)) !==
        null;
    } else if (type === "weekly_summary") {
      hasWork = (await describeWeeks(preference.user_id, now)) !== null;
    } else {
      hasWork = (await describeDigest(preference.user_id, now, "")) !== null;
    }
    if (hasWork) {
      rows.push({
        user_id: preference.user_id,
        email_type: type,
        for_date: forDate,
        idempotency_key: emailIdempotencyKey(type, preference.user_id, forDate),
      });
    }
  }
  if (rows.length) {
    // Existing jobs for the same person/type/day are kept as they are.
    await runMutation(
      service.from("email_log").upsert(rows, {
        onConflict: "user_id,email_type,for_date",
        ignoreDuplicates: true,
      }),
    );
  }
  return rows.length;
}

const claimedJobSchema = z.object({
  user_id: z.uuid(),
  email_type: z.enum(EMAIL_TYPES),
  for_date: z.string(),
  idempotency_key: z.string(),
  attempts: z.number().int(),
});

type ClaimedJob = z.infer<typeof claimedJobSchema>;

// Every update is conditioned on the lease this worker holds, so a slower worker whose
// lease expired cannot overwrite the result of the worker that took the job over.
function updateClaimedJob(job: ClaimedJob, values: Record<string, unknown>) {
  return runMutation(
    createServiceClient()
      .from("email_log")
      .update({ ...values, lease_until: null, updated_at: new Date().toISOString() })
      .eq("user_id", job.user_id)
      .eq("email_type", job.email_type)
      .eq("for_date", job.for_date)
      .eq("status", "sending")
      .eq("attempts", job.attempts),
  );
}

async function recordOutcome(job: ClaimedJob, outcome: SendOutcome, now: Date) {
  if (outcome.status === "sent") {
    await updateClaimedJob(job, {
      status: "sent",
      provider_message_id: outcome.providerMessageId,
      sent_at: now.toISOString(),
      last_error: null,
    });
    return;
  }
  await updateClaimedJob(job, {
    status: "failed",
    last_error: outcome.error.slice(0, 300),
    // Rejected requests will not succeed on retry; they wait for manual handling.
    attempts: outcome.status === "rejected" ? MAX_EMAIL_ATTEMPTS : job.attempts,
    next_attempt_at: nextRetryAt(job.attempts, now).toISOString(),
  });
}

export async function deliverPendingEmails(now: Date, origin: string) {
  const provider = getEmailProvider();
  const secret = process.env.EMAIL_LINK_SECRET;
  if (!provider || !secret) {
    throw new ServiceError("email_not_configured");
  }
  const jobs = await callRpc(
    "claim_email_jobs",
    {
      p_limit: EMAIL_BATCH_SIZE,
      p_lease_seconds: EMAIL_LEASE_SECONDS,
      p_max_attempts: MAX_EMAIL_ATTEMPTS,
    },
    z.array(claimedJobSchema),
  );
  const recipients = await loadRecipients(jobs.map((job) => job.user_id));
  const counts = { sent: 0, cancelled: 0, failed: 0 };
  for (const job of jobs) {
    let email: OutgoingEmail | null;
    try {
      email = await composeEmail(job, recipients.get(job.user_id), { now, origin, secret });
    } catch {
      await recordOutcome(job, { status: "retry", error: "compose_failed" }, now);
      counts.failed += 1;
      continue;
    }
    if (!email) {
      await updateClaimedJob(job, { status: "cancelled" });
      counts.cancelled += 1;
      continue;
    }
    const outcome = await provider.send(email);
    await recordOutcome(job, outcome, now);
    counts[outcome.status === "sent" ? "sent" : "failed"] += 1;
  }
  return counts;
}

export function isEmailConfigured() {
  return getEmailProvider() !== null && Boolean(process.env.EMAIL_LINK_SECRET);
}

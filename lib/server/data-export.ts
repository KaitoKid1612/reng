import "server-only";

import { z } from "zod";

import { parseSnapshotQuestion } from "@/lib/assignment";
import { canExportResults, exportAttempt } from "@/lib/data-export";
import {
  createServiceClient,
  selectEveryPage,
  selectEveryPageIn,
  selectOptional,
  selectRowsIn,
  ServiceError,
} from "@/lib/server/supabase";

import type { AssignableQuestion, FeedbackPolicy } from "@/lib/assignment";
import type { ExportAnswerRow } from "@/lib/data-export";
import type { Account } from "@/lib/server/account";

// Rows pass through as read: the columns are chosen per table below, never "*", so internal
// fields (an admin's note, a device's push keys, scheduler state) stay out of the file.
const anyRow = z.record(z.string(), z.unknown());

const ABOUT =
  "Dữ liệu Reng lưu về tài khoản của bạn. Bài kiểm tra chưa tới giờ giáo viên công bố kết quả chỉ có thời điểm làm và nộp; tải lại sau giờ đó để có câu trả lời và điểm. Bài học, slide và câu hỏi do giáo viên soạn không thuộc tệp này, trừ đề của những câu bạn đã làm. Chính sách quyền riêng tư: /privacy.";

function ownRows(
  table: string,
  columns: string,
  column: string,
  userId: string,
  order: readonly string[],
) {
  return selectEveryPage((from, to) => {
    let query = createServiceClient().from(table).select(columns).eq(column, userId);
    for (const key of order) {
      query = query.order(key);
    }
    return query.range(from, to);
  }, anyRow);
}

function rowsIn<Schema extends z.ZodType>(
  table: string,
  columns: string,
  column: string,
  values: readonly string[],
  schema: Schema,
) {
  return selectRowsIn(
    values,
    (chunk) => createServiceClient().from(table).select(columns).in(column, chunk),
    schema,
  );
}

const submissionSchema = z.object({
  id: z.uuid(),
  assignment_id: z.uuid(),
  attempt_no: z.number().int(),
  status: z.enum(["in_progress", "submitted"]),
  score: z.number().nullable(),
  max_score: z.number().nullable(),
  passed: z.boolean().nullable(),
  is_late: z.boolean().nullable(),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
});

const assignmentSchema = z.object({
  id: z.uuid(),
  class_id: z.uuid(),
  title: z.string(),
  mode: z.string(),
  feedback_policy: z.enum(["after_submit", "after_due"]),
  due_at: z.string().nullable(),
});

const named = z.object({ id: z.string(), name: z.string() });

async function readSignIn(userId: string) {
  const { data, error } = await createServiceClient().auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new ServiceError("auth_error");
  }
  const providers = data.user.app_metadata.providers;
  return {
    created_at: data.user.created_at,
    last_sign_in_at: data.user.last_sign_in_at ?? null,
    sign_in_methods: Array.isArray(providers) ? providers : [],
  };
}

// Questions of the given assignments, read in chunks rather than one request per assignment: a
// learner with months of daily practice has hundreds of them.
async function loadQuestions(assignmentIds: readonly string[]) {
  const rows = await selectEveryPageIn(
    assignmentIds,
    (chunk, from, to) =>
      createServiceClient()
        .from("assignment_items")
        .select("assignment_id, question_id, position, question_snapshot")
        .in("assignment_id", chunk)
        .order("assignment_id")
        .order("position")
        .range(from, to),
    z.object({
      assignment_id: z.uuid(),
      question_id: z.string(),
      position: z.number().int(),
      question_snapshot: z.unknown(),
    }),
  );
  const questions = new Map<string, AssignableQuestion[]>();
  for (const row of rows) {
    const list = questions.get(row.assignment_id) ?? [];
    list.push(parseSnapshotQuestion(row.question_snapshot));
    questions.set(row.assignment_id, list);
  }
  return questions;
}

async function loadAnswers(submissionIds: readonly string[]) {
  const rows = await selectEveryPageIn(
    submissionIds,
    (chunk, from, to) =>
      createServiceClient()
        .from("answers")
        .select("submission_id, question_id, raw, is_correct, points_earned")
        .in("submission_id", chunk)
        .order("submission_id")
        .order("question_id")
        .range(from, to),
    z.object({
      submission_id: z.uuid(),
      question_id: z.string(),
      raw: z.unknown(),
      is_correct: z.boolean().nullable(),
      points_earned: z.number().nullable(),
    }),
  );
  const answers = new Map<string, ExportAnswerRow[]>();
  for (const { submission_id: submissionId, ...row } of rows) {
    answers.set(submissionId, [...(answers.get(submissionId) ?? []), row]);
  }
  return answers;
}

/**
 * Everything Reng keeps about one person, as a JSON-ready object for "Tải dữ liệu của tôi". Only
 * rows tied to this person are read; other people appear only by the name already shown to them
 * (their class's teacher, the owner of a lesson shared with them).
 */
export async function buildDataExport(account: Account, now: Date) {
  const userId = account.id;
  const [
    signIn,
    profile,
    teaching,
    enrollments,
    submissions,
    reading,
    cards,
    reviews,
    attendance,
    imported,
    reminders,
    devices,
    pushSent,
    emailSent,
    joinAttempts,
    shares,
    ownedLessons,
    ownedClasses,
    actions,
  ] = await Promise.all([
    readSignIn(userId),
    selectOptional(
      createServiceClient()
        .from("profiles")
        .select("full_name, role, created_at")
        .eq("id", userId)
        .maybeSingle(),
      anyRow,
    ),
    selectOptional(
      createServiceClient()
        .from("teacher_accounts")
        .select("status, requested_at, accepted_terms_at, activated_at, access_until")
        .eq("user_id", userId)
        .maybeSingle(),
      anyRow,
    ),
    ownRows("enrollments", "class_id, joined_at, left_at", "user_id", userId, ["joined_at"]),
    selectEveryPage(
      (from, to) =>
        createServiceClient()
          .from("submissions")
          .select(
            "id, assignment_id, attempt_no, status, score, max_score, passed, is_late, started_at, submitted_at",
          )
          .eq("user_id", userId)
          .order("started_at")
          .order("id")
          .range(from, to),
      submissionSchema,
    ),
    ownRows(
      "lesson_progress",
      "lesson_id, lesson_version_id, last_slide_id, read_completed_at, updated_at",
      "user_id",
      userId,
      ["lesson_id"],
    ),
    ownRows(
      "srs_cards",
      "item_type, source_id, item_id, due, correct_streak, resolved_at, created_at",
      "user_id",
      userId,
      ["item_type", "source_id", "item_id"],
    ),
    ownRows(
      "review_events",
      "item_type, source_id, item_id, rating, is_correct, reviewed_at",
      "user_id",
      userId,
      ["reviewed_at", "id"],
    ),
    ownRows("class_session_attendance", "session_id, is_present, marked_at", "user_id", userId, [
      "session_id",
    ]),
    ownRows(
      "learning_history_archives",
      "course, learner_name, learner_email, session_count, answer_count, payload, imported_at",
      "learner_id",
      userId,
      ["imported_at", "id"],
    ),
    selectOptional(
      createServiceClient()
        .from("notification_preferences")
        .select(
          "reminder_frequency, weekly_enabled, teacher_digest_enabled, push_enabled, consented_at, updated_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      anyRow,
    ),
    // The device's push address and keys are secrets of that browser, not information about you.
    ownRows("push_subscriptions", "user_agent, created_at, last_sent_at", "user_id", userId, [
      "created_at",
      "id",
    ]),
    ownRows("push_log", "kind, for_date, sent_count", "user_id", userId, ["for_date", "kind"]),
    ownRows("email_log", "email_type, for_date, status, sent_at, opened_at", "user_id", userId, [
      "for_date",
      "email_type",
    ]),
    ownRows("join_attempts", "succeeded, attempted_at", "user_id", userId, ["attempted_at", "id"]),
    ownRows(
      "lesson_shares",
      "owner_id, version_id, permission, granted_at, revoked_at",
      "recipient_id",
      userId,
      ["granted_at", "id"],
    ),
    ownRows(
      "lessons",
      "id, title, visibility, created_at, updated_at, archived_at",
      "owner_id",
      userId,
      ["created_at", "id"],
    ),
    ownRows("classes", "id, name, subject, self_study, active, created_at", "teacher_id", userId, [
      "created_at",
      "id",
    ]),
    ownRows("audit_events", "action, created_at", "actor_id", userId, ["created_at", "id"]),
  ]);

  const assignments = await rowsIn(
    "assignments",
    "id, class_id, title, mode, feedback_policy, due_at",
    "id",
    [...new Set(submissions.map((row) => row.assignment_id))],
    assignmentSchema,
  );
  const assignmentById = new Map(assignments.map((row) => [row.id, row]));
  const shown = submissions.filter((row) => {
    const assignment = assignmentById.get(row.assignment_id);
    return (
      assignment !== undefined &&
      canExportResults(
        { feedbackPolicy: assignment.feedback_policy, dueAt: assignment.due_at },
        { status: row.status, submittedAt: row.submitted_at },
        now,
      )
    );
  });
  const sessionIds = attendance.map((row) => String(row.session_id));
  const ownedClassIds = ownedClasses.map((row) => String(row.id));
  const [questions, answers, sessions, teachingLog, versions] = await Promise.all([
    loadQuestions([...new Set(shown.map((row) => row.assignment_id))]),
    loadAnswers(shown.map((row) => row.id)),
    rowsIn(
      "class_sessions",
      "id, class_id, taught_on",
      "id",
      sessionIds,
      z.object({ id: z.uuid(), class_id: z.uuid(), taught_on: z.string() }),
    ),
    selectEveryPageIn(
      ownedClassIds,
      (chunk, from, to) =>
        createServiceClient()
          .from("class_sessions")
          .select("class_id, taught_on, lesson_id, slide_reached, notes")
          .in("class_id", chunk)
          .order("taught_on")
          .order("id")
          .range(from, to),
      anyRow,
    ),
    rowsIn(
      "lesson_versions",
      "id, title",
      "id",
      [
        ...new Set([
          ...reading.map((row) => String(row.lesson_version_id)),
          ...shares.map((row) => String(row.version_id)),
        ]),
      ],
      z.object({ id: z.uuid(), title: z.string() }),
    ),
  ]);

  const classIds = new Set([
    ...enrollments.map((row) => String(row.class_id)),
    ...assignments.map((row) => row.class_id),
    ...sessions.map((row) => row.class_id),
  ]);
  const classes = await rowsIn(
    "classes",
    "id, name, teacher_id",
    "id",
    [...classIds],
    z.object({ id: z.uuid(), name: z.string(), teacher_id: z.uuid() }),
  );
  const people = await rowsIn(
    "profiles",
    "id, name:full_name",
    "id",
    [
      ...new Set([
        ...classes.map((row) => row.teacher_id),
        ...shares.map((row) => String(row.owner_id)),
      ]),
    ],
    named,
  );
  const className = new Map(classes.map((row) => [row.id, row.name]));
  const teacherOf = new Map(classes.map((row) => [row.id, row.teacher_id]));
  const personName = new Map(people.map((row) => [row.id, row.name]));
  const versionTitle = new Map(versions.map((row) => [row.id, row.title]));
  const sessionById = new Map(sessions.map((row) => [row.id, row]));
  const ownedClassName = new Map(ownedClasses.map((row) => [String(row.id), String(row.name)]));

  return {
    about: ABOUT,
    exported_at: now.toISOString(),
    account: {
      id: userId,
      email: account.email,
      full_name: profile?.full_name ?? account.fullName,
      role: profile?.role ?? account.role,
      ...signIn,
    },
    teaching_request: teaching,
    classes: enrollments.map((row) => {
      const id = String(row.class_id);
      return {
        class: className.get(id) ?? null,
        teacher: personName.get(teacherOf.get(id) ?? "") ?? null,
        joined_at: row.joined_at,
        left_at: row.left_at,
      };
    }),
    attempts: submissions.flatMap((row) => {
      const assignment = assignmentById.get(row.assignment_id);
      if (!assignment) {
        return [];
      }
      const feedbackPolicy: FeedbackPolicy = assignment.feedback_policy;
      return [
        exportAttempt(
          {
            assignment: {
              title: assignment.title,
              mode: assignment.mode,
              feedbackPolicy,
              dueAt: assignment.due_at,
            },
            className: className.get(assignment.class_id) ?? "",
            attempt: {
              attemptNo: row.attempt_no,
              status: row.status,
              startedAt: row.started_at,
              submittedAt: row.submitted_at,
              isLate: row.is_late,
              score: row.score,
              maxScore: row.max_score,
              passed: row.passed,
            },
            questions: questions.get(row.assignment_id) ?? null,
            answers: answers.get(row.id) ?? null,
          },
          now,
        ),
      ];
    }),
    lesson_progress: reading.map((row) => ({
      lesson: versionTitle.get(String(row.lesson_version_id)) ?? row.lesson_id,
      last_slide: row.last_slide_id,
      read_completed_at: row.read_completed_at,
      updated_at: row.updated_at,
    })),
    review_cards: cards,
    review_history: reviews,
    attendance: attendance.map((row) => {
      const session = sessionById.get(String(row.session_id));
      return {
        class: session ? (className.get(session.class_id) ?? null) : null,
        taught_on: session?.taught_on ?? null,
        is_present: row.is_present,
        marked_at: row.marked_at,
      };
    }),
    imported_history: imported,
    reminders: {
      settings: reminders,
      devices,
      browser_notifications_sent: pushSent,
      emails_sent: emailSent,
    },
    class_code_attempts: joinAttempts,
    lessons_shared_with_you: shares.map((row) => ({
      lesson: versionTitle.get(String(row.version_id)) ?? null,
      shared_by: personName.get(String(row.owner_id)) ?? null,
      permission: row.permission,
      granted_at: row.granted_at,
      revoked_at: row.revoked_at,
    })),
    teaching: {
      lessons: ownedLessons,
      classes: ownedClasses,
      class_log: teachingLog.map(({ class_id: classId, ...row }) => ({
        class: ownedClassName.get(String(classId)) ?? null,
        ...row,
      })),
    },
    account_actions: actions,
  };
}

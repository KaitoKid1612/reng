import "server-only";

import { z } from "zod";

import {
  ASSIGNMENT_MODES,
  assignmentSettingsSchema,
  describeCorrectAnswer,
  describeRawAnswer,
  EMPTY_DRAFT,
  FEEDBACK_POLICIES,
  isAssignableQuestion,
  isFeedbackAvailable,
  isListeningQuestion,
  parseAssignableQuestion,
  parseAttemptDraft,
  toAttemptItems,
  toQuestionView,
  toStoredRawAnswer,
  toTestQuestions,
} from "@/lib/assignment";
import { gradeAttempt } from "@/lib/grading/grade";
import { parseDatabaseVersion } from "@/lib/lesson-repository";
import { getTeacherClass, requireMembership } from "@/lib/server/classes";
import {
  callRpc,
  createServiceClient,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";
import { createSchedulerState, SCHEDULER_VERSION } from "@/lib/srs";

import type {
  AssignableQuestion,
  AssignmentMode,
  AttemptDraft,
  AttemptItem,
  FeedbackPolicy,
  QuestionView,
  TestQuestionInput,
} from "@/lib/assignment";

const timestamp = z.iso.datetime({ offset: true });

const assignmentRowSchema = z.object({
  id: z.uuid(),
  class_id: z.uuid(),
  lesson_id: z.string(),
  lesson_version_id: z.uuid(),
  title: z.string(),
  mode: z.enum(ASSIGNMENT_MODES),
  status: z.enum(["draft", "published", "closed"]),
  due_at: timestamp.nullable(),
  allow_late: z.boolean(),
  pass_score: z.number().int(),
  max_attempts: z.number().int(),
  feedback_policy: z.enum(FEEDBACK_POLICIES),
  published_at: timestamp.nullable(),
});

const ASSIGNMENT_COLUMNS =
  "id, class_id, lesson_id, lesson_version_id, title, mode, status, due_at, allow_late, pass_score, max_attempts, feedback_policy, published_at";

const submissionRowSchema = z.object({
  id: z.uuid(),
  assignment_id: z.uuid(),
  user_id: z.uuid(),
  attempt_no: z.number().int(),
  status: z.enum(["in_progress", "submitted"]),
  draft_answers: z.unknown(),
  draft_revision: z.number().int(),
  score: z.number().int().nullable(),
  max_score: z.number().int().nullable(),
  passed: z.boolean().nullable(),
  is_late: z.boolean().nullable(),
  started_at: timestamp,
  last_saved_at: timestamp,
  submitted_at: timestamp.nullable(),
});

const SUBMISSION_COLUMNS =
  "id, assignment_id, user_id, attempt_no, status, draft_answers, draft_revision, score, max_score, passed, is_late, started_at, last_saved_at, submitted_at";

export interface Assignment {
  id: string;
  classId: string;
  lessonId: string;
  lessonVersionId: string;
  title: string;
  mode: AssignmentMode;
  status: "published" | "closed";
  dueAt: string | null;
  allowLate: boolean;
  passScore: number;
  maxAttempts: number;
  feedbackPolicy: FeedbackPolicy;
  publishedAt: string;
}

export interface Attempt {
  id: string;
  attemptNo: number;
  status: "in_progress" | "submitted";
  revision: number;
  rawDraft: unknown;
  score: number | null;
  maxScore: number | null;
  passed: boolean | null;
  isLate: boolean | null;
  startedAt: string;
  savedAt: string;
  submittedAt: string | null;
}

function toAssignment(row: z.infer<typeof assignmentRowSchema>): Assignment {
  if (row.status === "draft" || !row.published_at) {
    throw new ServiceError("not_found");
  }
  return {
    id: row.id,
    classId: row.class_id,
    lessonId: row.lesson_id,
    lessonVersionId: row.lesson_version_id,
    title: row.title,
    mode: row.mode,
    status: row.status,
    dueAt: row.due_at,
    allowLate: row.allow_late,
    passScore: row.pass_score,
    maxAttempts: row.max_attempts,
    feedbackPolicy: row.feedback_policy,
    publishedAt: row.published_at,
  };
}

function toAttempt(row: z.infer<typeof submissionRowSchema>): Attempt {
  return {
    id: row.id,
    attemptNo: row.attempt_no,
    status: row.status,
    revision: row.draft_revision,
    rawDraft: row.draft_answers,
    score: row.score,
    maxScore: row.max_score,
    passed: row.passed,
    isLate: row.is_late,
    startedAt: row.started_at,
    savedAt: row.last_saved_at,
    submittedAt: row.submitted_at,
  };
}

export async function loadAssignment(assignmentId: string) {
  if (!z.uuid().safeParse(assignmentId).success) {
    throw new ServiceError("not_found");
  }
  const row = await selectOptional(
    createServiceClient()
      .from("assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("id", assignmentId)
      .neq("status", "draft")
      .maybeSingle(),
    assignmentRowSchema,
  );
  if (!row) {
    throw new ServiceError("not_found");
  }
  return toAssignment(row);
}

export async function listClassAssignments(classIds: readonly string[]) {
  if (!classIds.length) {
    return [];
  }
  const rows = await selectRows(
    createServiceClient()
      .from("assignments")
      .select(ASSIGNMENT_COLUMNS)
      .in("class_id", [...classIds])
      .neq("status", "draft")
      .order("published_at", { ascending: false }),
    assignmentRowSchema,
  );
  return rows.map(toAssignment);
}

export async function loadAssignmentItems(assignmentId: string): Promise<AssignableQuestion[]> {
  const rows = await selectRows(
    createServiceClient()
      .from("assignment_items")
      .select("question_id, position, question_snapshot")
      .eq("assignment_id", assignmentId)
      .order("position"),
    z.object({
      question_id: z.string(),
      position: z.number().int(),
      question_snapshot: z.unknown(),
    }),
  );
  return rows.map((row) => parseAssignableQuestion(row.question_snapshot));
}

export async function listUserAttempts(userId: string, assignmentIds: readonly string[]) {
  if (!assignmentIds.length) {
    return [];
  }
  const rows = await selectRows(
    createServiceClient()
      .from("submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("user_id", userId)
      .in("assignment_id", [...assignmentIds])
      .order("attempt_no"),
    submissionRowSchema,
  );
  return rows.map((row) => ({ assignmentId: row.assignment_id, ...toAttempt(row) }));
}

async function loadVersion(versionId: string) {
  const row = await selectOptional(
    createServiceClient().from("lesson_versions").select("*").eq("id", versionId).maybeSingle(),
    z.record(z.string(), z.unknown()),
  );
  if (!row) {
    throw new ServiceError("not_found");
  }
  return parseDatabaseVersion(row);
}

async function loadPinnedVersionId(classId: string, lessonId: string) {
  const row = await selectOptional(
    createServiceClient()
      .from("class_lessons")
      .select("lesson_version_id, available_at")
      .eq("class_id", classId)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
    z.object({ lesson_version_id: z.uuid(), available_at: timestamp }),
  );
  if (!row) {
    throw new ServiceError("lesson_not_in_class");
  }
  return row;
}

// Practice questions that can be assigned from the version currently pinned for the class.
export async function listAssignablePracticeQuestions(classId: string, lessonId: string) {
  const pinned = await loadPinnedVersionId(classId, lessonId);
  const version = await loadVersion(pinned.lesson_version_id);
  return version.content.questions.filter(isAssignableQuestion);
}

export interface PublishAssignmentInput {
  classId: string;
  lessonId: string;
  settings: unknown;
  practiceQuestionIds: string[];
  testQuestions: TestQuestionInput[];
}

export async function publishAssignment(teacherId: string, input: PublishAssignmentInput) {
  const classRow = await getTeacherClass(teacherId, input.classId);
  const settings = assignmentSettingsSchema.parse(input.settings);
  let practiceQuestionIds: string[] = [];
  let testQuestions: AssignableQuestion[] | null = null;
  if (settings.mode === "practice") {
    const available = await listAssignablePracticeQuestions(input.classId, input.lessonId);
    practiceQuestionIds = [...new Set(input.practiceQuestionIds)];
    if (
      !practiceQuestionIds.length ||
      practiceQuestionIds.some((id) => !available.some((question) => question.id === id))
    ) {
      throw new ServiceError("invalid_items");
    }
  } else {
    testQuestions = toTestQuestions(input.testQuestions, classRow.language_tag);
    if (!testQuestions.length) {
      throw new ServiceError("invalid_items");
    }
  }
  return callRpc(
    "publish_assignment",
    {
      p_teacher_id: teacherId,
      p_class_id: input.classId,
      p_lesson_id: input.lessonId,
      p_title: settings.title,
      p_mode: settings.mode,
      p_due_at: settings.dueAt,
      p_allow_late: settings.allowLate,
      p_pass_score: settings.passScore,
      p_max_attempts: settings.maxAttempts,
      p_feedback_policy: settings.feedbackPolicy,
      p_practice_question_ids: practiceQuestionIds,
      p_test_questions: testQuestions,
    },
    z.uuid(),
  );
}

export async function countOpenAttempts(assignmentId: string) {
  const rows = await selectRows(
    createServiceClient()
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("status", "in_progress"),
    z.object({ id: z.uuid() }),
  );
  return rows.length;
}

export async function closeAssignment(teacherId: string, assignmentId: string) {
  await callRpc(
    "close_assignment",
    { p_teacher_id: teacherId, p_assignment_id: assignmentId },
    z.unknown(),
  );
}

export interface OpenAttemptView {
  submissionId: string;
  attemptNo: number;
  revision: number;
  savedAt: string;
  draft: AttemptDraft;
  items: AttemptItem[];
}

export interface StudentAssignmentView {
  assignment: Assignment;
  className: string;
  lessonTitle: string;
  availableAt: string;
  isClassActive: boolean;
  attempts: Attempt[];
  openAttempt: OpenAttemptView | null;
  questionCount: number;
  totalPoints: number;
}

function parseStoredDraft(items: readonly AssignableQuestion[], value: unknown) {
  try {
    return parseAttemptDraft(items.map(toQuestionView), value);
  } catch {
    return EMPTY_DRAFT;
  }
}

export async function getStudentAssignment(
  userId: string,
  assignmentId: string,
): Promise<StudentAssignmentView> {
  const assignment = await loadAssignment(assignmentId);
  const { classRow } = await requireMembership(userId, assignment.classId);
  const [pinned, version, attempts, items] = await Promise.all([
    loadPinnedVersionId(assignment.classId, assignment.lessonId),
    loadVersion(assignment.lessonVersionId),
    listUserAttempts(userId, [assignment.id]),
    loadAssignmentItems(assignment.id),
  ]);
  const open = attempts.find((attempt) => attempt.status === "in_progress");
  return {
    assignment,
    className: classRow.name,
    lessonTitle: version.title,
    availableAt: pinned.available_at,
    isClassActive: classRow.active,
    attempts,
    openAttempt: open
      ? {
          submissionId: open.id,
          attemptNo: open.attemptNo,
          revision: open.revision,
          savedAt: open.savedAt,
          draft: parseStoredDraft(items, open.rawDraft),
          items: toAttemptItems(items, assignment.mode),
        }
      : null,
    questionCount: items.length,
    totalPoints: items.reduce((total, item) => total + item.points, 0),
  };
}

const startResultSchema = z
  .array(
    z.object({
      status: z.enum([
        "started",
        "resumed",
        "not_found",
        "not_available",
        "closed",
        "past_due",
        "no_attempts_left",
      ]),
      submission_id: z.uuid().nullable(),
    }),
  )
  .length(1)
  .transform((rows) => rows[0]);

export async function startAttempt(userId: string, assignmentId: string) {
  if (!z.uuid().safeParse(assignmentId).success) {
    return { status: "not_found" as const, submission_id: null };
  }
  return callRpc(
    "start_attempt",
    { p_user_id: userId, p_assignment_id: assignmentId },
    startResultSchema,
  );
}

async function loadOwnedSubmission(userId: string, submissionId: string) {
  if (!z.uuid().safeParse(submissionId).success) {
    throw new ServiceError("not_found");
  }
  const row = await selectOptional(
    createServiceClient()
      .from("submissions")
      .select(SUBMISSION_COLUMNS)
      .eq("id", submissionId)
      .eq("user_id", userId)
      .maybeSingle(),
    submissionRowSchema,
  );
  if (!row) {
    throw new ServiceError("not_found");
  }
  return row;
}

function parseIncomingDraft(items: readonly AssignableQuestion[], value: unknown) {
  try {
    return parseAttemptDraft(items.map(toQuestionView), value);
  } catch {
    throw new ServiceError("invalid_draft");
  }
}

const saveResultSchema = z
  .array(
    z.object({
      status: z.enum(["saved", "conflict", "submitted", "closed", "past_due", "not_found"]),
      revision: z.number().int().nullable(),
      saved_at: timestamp.nullable(),
    }),
  )
  .length(1)
  .transform((rows) => rows[0]);

export async function saveAttemptDraft(
  userId: string,
  submissionId: string,
  revision: number,
  rawDraft: unknown,
) {
  const submission = await loadOwnedSubmission(userId, submissionId);
  const items = await loadAssignmentItems(submission.assignment_id);
  const draft = parseIncomingDraft(items, rawDraft);
  const result = await callRpc(
    "save_attempt_draft",
    {
      p_user_id: userId,
      p_submission_id: submissionId,
      p_expected_revision: revision,
      p_draft: draft,
    },
    saveResultSchema,
  );
  if (result.status !== "conflict") {
    return { ...result, draft: null };
  }
  const current = await loadOwnedSubmission(userId, submissionId);
  return { ...result, draft: parseStoredDraft(items, current.draft_answers) };
}

const submitResultSchema = z
  .array(
    z.object({
      status: z.enum([
        "submitted",
        "already_submitted",
        "conflict",
        "closed",
        "past_due",
        "not_found",
        "invalid_results",
      ]),
    }),
  )
  .length(1)
  .transform((rows) => rows[0]);

export async function submitAttempt(
  userId: string,
  submissionId: string,
  revision: number,
  rawDraft: unknown,
) {
  const submission = await loadOwnedSubmission(userId, submissionId);
  if (submission.status === "submitted") {
    return { status: "already_submitted" as const, assignmentId: submission.assignment_id };
  }
  const items = await loadAssignmentItems(submission.assignment_id);
  const draft = parseIncomingDraft(items, rawDraft);
  // Scores are always recomputed on the server from raw answers and the immutable snapshot.
  const grade = gradeAttempt(items, draft.answers);
  const result = await callRpc(
    "submit_attempt",
    {
      p_user_id: userId,
      p_submission_id: submissionId,
      p_expected_revision: revision,
      p_draft: draft,
      p_results: grade.results.map((item) => ({
        question_id: item.questionId,
        raw: item.raw,
        is_correct: item.isCorrect,
        points_earned: item.pointsEarned,
        listen_count: draft.listens[item.questionId] ?? 0,
      })),
      p_score: grade.score,
      p_max_score: grade.maxScore,
      p_mistake_state: createSchedulerState(new Date()),
      p_scheduler_version: SCHEDULER_VERSION,
    },
    submitResultSchema,
  );
  if (result.status === "invalid_results") {
    throw new ServiceError("invalid_results");
  }
  return { status: result.status, assignmentId: submission.assignment_id };
}

export interface ResultItem {
  view: QuestionView;
  answerText: string;
  correctText: string;
  isCorrect: boolean;
  pointsEarned: number;
  explain: string;
  // Listening questions only; null for other types.
  transcript: string | null;
  listenCount: number | null;
}

const answerRowSchema = z.object({
  question_id: z.string(),
  raw: z.unknown(),
  is_correct: z.boolean(),
  points_earned: z.number().int(),
  listen_count: z.number().int(),
});

// Shared by the learner results page (after the feedback gate) and the teacher view.
export async function loadAttemptResultItems(submissionId: string, assignmentId: string) {
  const [items, answers] = await Promise.all([
    loadAssignmentItems(assignmentId),
    selectRows(
      createServiceClient()
        .from("answers")
        .select("question_id, raw, is_correct, points_earned, listen_count")
        .eq("submission_id", submissionId),
      answerRowSchema,
    ),
  ]);
  return items.map((question): ResultItem => {
    const answer = answers.find((item) => item.question_id === question.id);
    return {
      view: toQuestionView(question),
      answerText: describeRawAnswer(question, toStoredRawAnswer(answer?.raw)),
      correctText: describeCorrectAnswer(question),
      isCorrect: answer?.is_correct ?? false,
      pointsEarned: answer?.points_earned ?? 0,
      explain: question.explain,
      transcript: isListeningQuestion(question) ? question.transcript : null,
      listenCount: isListeningQuestion(question) ? (answer?.listen_count ?? 0) : null,
    };
  });
}

export interface StudentResultsView {
  assignment: Assignment;
  className: string;
  attempt: Attempt | null;
  attemptsUsed: number;
  hasOpenAttempt: boolean;
  isFeedbackAvailable: boolean;
  items: ResultItem[];
}

export async function getStudentResults(
  userId: string,
  assignmentId: string,
  now: Date,
): Promise<StudentResultsView> {
  const assignment = await loadAssignment(assignmentId);
  const { classRow } = await requireMembership(userId, assignment.classId);
  const attempts = await listUserAttempts(userId, [assignment.id]);
  const submitted = attempts
    .filter((attempt) => attempt.status === "submitted")
    .sort((first, second) => second.attemptNo - first.attemptNo);
  const latest = submitted[0] ?? null;
  const canShow = isFeedbackAvailable(assignment, latest?.submittedAt ?? null, now);
  // Before the feedback time only the submission receipt is returned.
  const receipt = latest && {
    ...latest,
    rawDraft: null,
    score: canShow ? latest.score : null,
    maxScore: canShow ? latest.maxScore : null,
    passed: canShow ? latest.passed : null,
  };
  return {
    assignment,
    className: classRow.name,
    attempt: receipt,
    attemptsUsed: attempts.length,
    hasOpenAttempt: attempts.some((attempt) => attempt.status === "in_progress"),
    isFeedbackAvailable: canShow,
    // Nothing graded leaves the server before the feedback time.
    items: latest && canShow ? await loadAttemptResultItems(latest.id, assignment.id) : [],
  };
}

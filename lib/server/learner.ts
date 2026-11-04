import "server-only";

import { z } from "zod";

import {
  compareDueUrgency,
  FEEDBACK_POLICIES,
  getDeadlineState,
  isFeedbackAvailable,
} from "@/lib/assignment";
import { toPercent } from "@/lib/grading/grade";
import { questionKind, summarizeQuestionKinds } from "@/lib/question-kinds";
import { listClassAssignments, listUserAttempts } from "@/lib/server/assignments";
import {
  findListeningVersionIds,
  listClassLessons,
  listStudentClasses,
  requireMembership,
} from "@/lib/server/classes";
import { listDailyAssignmentIds } from "@/lib/server/daily-history";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";
import { listDueCards, MAX_SESSION_CARDS } from "@/lib/server/reviews";
import {
  createServiceClient,
  runMutation,
  selectOptional,
  selectEveryPage,
  selectRows,
  selectRowsIn,
  ServiceError,
} from "@/lib/server/supabase";
import { countStudyStreak, isStreakSettled } from "@/lib/study-days";

import type { Assignment, Attempt } from "@/lib/server/assignments";
import type { ClassLesson } from "@/lib/server/classes";

const timestamp = z.iso.datetime({ offset: true });

export type AssignmentStatus =
  "not_available" | "not_started" | "in_progress" | "submitted" | "past_due" | "closed";

export interface LearnerAssignment {
  assignment: Assignment;
  status: AssignmentStatus;
  attemptsUsed: number;
  // Only present once feedback may be shown.
  latestPercent: number | null;
  latestPassed: boolean | null;
  submittedAt: string | null;
}

function describeLearnerAssignment(
  assignment: Assignment,
  attempts: readonly Attempt[],
  lesson: ClassLesson | undefined,
  now: Date,
): LearnerAssignment {
  const submitted = attempts
    .filter((attempt) => attempt.status === "submitted")
    .sort((first, second) => second.attemptNo - first.attemptNo);
  const latest = submitted[0];
  const canShow = latest ? isFeedbackAvailable(assignment, latest.submittedAt, now) : false;
  const isPastDue = getDeadlineState(assignment.dueAt, assignment.allowLate, now) === "past_due";
  let status: AssignmentStatus = "not_started";
  // A closed or past-due assignment can no longer be saved or submitted, even mid-attempt.
  if (assignment.status === "closed" || isPastDue) {
    if (latest) {
      status = "submitted";
    } else {
      status = assignment.status === "closed" ? "closed" : "past_due";
    }
  } else if (attempts.some((attempt) => attempt.status === "in_progress")) {
    status = "in_progress";
  } else if (latest) {
    status = "submitted";
  } else if (!lesson || Date.parse(lesson.availableAt) > now.getTime()) {
    status = "not_available";
  }
  return {
    assignment,
    status,
    attemptsUsed: attempts.length,
    latestPercent:
      canShow && latest && latest.score !== null && latest.maxScore
        ? toPercent(latest.score, latest.maxScore)
        : null,
    latestPassed: canShow ? (latest?.passed ?? null) : null,
    submittedAt: latest?.submittedAt ?? null,
  };
}

export async function getStudentClassView(userId: string, classId: string, now: Date) {
  const { classRow } = await requireMembership(userId, classId);
  const [lessons, assignments] = await Promise.all([
    listClassLessons(classId),
    listClassAssignments([classId]),
  ]);
  const openLessons = lessons.filter((lesson) => Date.parse(lesson.availableAt) <= now.getTime());
  const [attempts, dailyAssignmentIds, listeningVersionIds] = await Promise.all([
    listUserAttempts(
      userId,
      assignments.map((assignment) => assignment.id),
    ),
    listDailyAssignmentIds(assignments.map((assignment) => assignment.id)),
    findListeningVersionIds(openLessons.map((lesson) => lesson.versionId)),
  ]);
  return {
    classRow,
    dailyAssignmentIds,
    // Listening practice on the lesson's own page needs no assignment and keeps no score.
    lessons: openLessons.map((lesson) => ({
      ...lesson,
      hasListening: listeningVersionIds.has(lesson.versionId),
    })),
    upcomingLessonCount: lessons.filter((lesson) => Date.parse(lesson.availableAt) > now.getTime())
      .length,
    assignments: assignments.map((assignment) =>
      describeLearnerAssignment(
        assignment,
        attempts.filter((attempt) => attempt.assignmentId === assignment.id),
        lessons.find((lesson) => lesson.lessonId === assignment.lessonId),
        now,
      ),
    ),
  };
}

async function listLearnerAssignments(userId: string, now: Date) {
  const classes = await listStudentClasses(userId);
  const assignments = await listClassAssignments(classes.map((item) => item.id));
  const [attempts, lessonsByClass] = await Promise.all([
    listUserAttempts(
      userId,
      assignments.map((assignment) => assignment.id),
    ),
    Promise.all(classes.map(async (item) => [item.id, await listClassLessons(item.id)] as const)),
  ]);
  const lessons = new Map(lessonsByClass);
  return {
    classes,
    lessons,
    assignments: assignments.map((assignment) =>
      describeLearnerAssignment(
        assignment,
        attempts.filter((attempt) => attempt.assignmentId === assignment.id),
        lessons.get(assignment.classId)?.find((lesson) => lesson.lessonId === assignment.lessonId),
        now,
      ),
    ),
  };
}

// Lessons the learner marked as read, in any version: a teacher updating a lesson does not make
// it new again.
async function listReadLessonIds(userId: string, lessonIds: readonly string[]) {
  const rows = await selectRowsIn(
    lessonIds,
    (chunk) =>
      createServiceClient()
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", userId)
        .not("read_completed_at", "is", null)
        .in("lesson_id", chunk),
    z.object({ lesson_id: z.string() }),
  );
  return new Set(rows.map((row) => row.lesson_id));
}

function isOpenWork(item: LearnerAssignment) {
  return item.status === "not_started" || item.status === "in_progress";
}

export async function getLearnerAgenda(userId: string, now: Date) {
  const [{ classes, assignments, lessons }, dueCards] = await Promise.all([
    listLearnerAssignments(userId, now),
    // One card past a session tells "50" apart from a longer backlog.
    listDueCards(userId, now, MAX_SESSION_CARDS + 1),
  ]);
  const openLessons = classes.flatMap((item) =>
    (lessons.get(item.id) ?? [])
      .filter((lesson) => Date.parse(lesson.availableAt) <= now.getTime())
      .map((lesson) => ({ ...lesson, classId: item.id })),
  );
  const openAssignments = assignments
    .filter(isOpenWork)
    .sort((first, second) =>
      compareDueUrgency(first.assignment.dueAt, second.assignment.dueAt, now),
    );
  const [readLessonIds, dailyAssignmentIds] = await Promise.all([
    listReadLessonIds(
      userId,
      openLessons.map((lesson) => lesson.lessonId),
    ),
    listDailyAssignmentIds(openAssignments.map((item) => item.assignment.id)),
  ]);
  return {
    classes,
    openLessons,
    readLessonIds,
    dailyAssignmentIds,
    dueCardCount: Math.min(dueCards.length, MAX_SESSION_CARDS),
    dueMistakeCount: dueCards.slice(0, MAX_SESSION_CARDS).filter((card) => card.kind === "mistake")
      .length,
    hasMoreDueCards: dueCards.length > MAX_SESSION_CARDS,
    openAssignments,
  };
}

// Many reviews a day used to fill a fixed window of events and cut long streaks short. Reviews
// are now read a page at a time until the streak's first missing day lies inside what was read.
const ACTIVITY_PAGE_SIZE = 1000;
const MAX_ACTIVITY_PAGES = 10;

export async function getStudyActivity(userId: string, now: Date = new Date()) {
  const service = createServiceClient();
  // Submissions come one or two a day, so the newest 400 cover more than a year.
  const submissions = await selectRows(
    service
      .from("submissions")
      .select("submitted_at")
      .eq("user_id", userId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(400),
    z.object({ submitted_at: timestamp }),
  );
  const activity = submissions.map((row) => row.submitted_at);
  for (let page = 0; page < MAX_ACTIVITY_PAGES; page += 1) {
    const reviews = await selectRows(
      service
        .from("review_events")
        .select("reviewed_at")
        .eq("user_id", userId)
        .order("reviewed_at", { ascending: false })
        .range(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE - 1),
      z.object({ reviewed_at: timestamp }),
    );
    activity.push(...reviews.map((row) => row.reviewed_at));
    const oldest = reviews.at(-1)?.reviewed_at;
    if (reviews.length < ACTIVITY_PAGE_SIZE || !oldest || isStreakSettled(activity, oldest, now)) {
      break;
    }
  }
  return activity;
}

export async function getProgressSummary(userId: string, now: Date) {
  const service = createServiceClient();
  const [{ classes, assignments }, activity, reading, cards] = await Promise.all([
    listLearnerAssignments(userId, now),
    getStudyActivity(userId, now),
    selectRows(
      service
        .from("lesson_progress")
        .select("lesson_id, lesson_version_id, read_completed_at")
        .eq("user_id", userId)
        .not("read_completed_at", "is", null)
        .order("read_completed_at", { ascending: false }),
      z.object({
        lesson_id: z.string(),
        lesson_version_id: z.uuid(),
        read_completed_at: timestamp,
      }),
    ),
    selectRows(
      service.from("srs_cards").select("item_type, due, resolved_at").eq("user_id", userId),
      z.object({ item_type: z.string(), due: timestamp, resolved_at: timestamp.nullable() }),
    ),
  ]);
  const titles = reading.length
    ? await selectRows(
        service
          .from("lesson_versions")
          .select("id, title")
          .in(
            "id",
            reading.map((row) => row.lesson_version_id),
          ),
        z.object({ id: z.uuid(), title: z.string() }),
      )
    : [];
  const scored = assignments.filter((item) => item.latestPercent !== null);
  const vocabCards = cards.filter((card) => card.item_type === "vocab");
  const mistakes = cards.filter((card) => card.item_type === "mistake");
  return {
    classes,
    streak: countStudyStreak(activity, now),
    reading: reading.map((row) => ({
      lessonId: row.lesson_id,
      title: titles.find((title) => title.id === row.lesson_version_id)?.title ?? row.lesson_id,
      completedAt: row.read_completed_at,
    })),
    assignments,
    averagePercent: scored.length
      ? scored.reduce((total, item) => total + (item.latestPercent ?? 0), 0) / scored.length
      : null,
    vocab: {
      total: vocabCards.length,
      due: vocabCards.filter((card) => Date.parse(card.due) <= now.getTime()).length,
    },
    mistakes: {
      open: mistakes.filter((card) => !card.resolved_at).length,
      resolved: mistakes.filter((card) => card.resolved_at).length,
    },
  };
}

export async function getLessonProgress(userId: string, lessonId: string) {
  return selectOptional(
    createServiceClient()
      .from("lesson_progress")
      .select("lesson_version_id, read_completed_at")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle(),
    z.object({ lesson_version_id: z.uuid(), read_completed_at: timestamp.nullable() }),
  );
}

// Reading completion is an explicit learner action, never inferred from opening a page.
export async function markLessonRead(userId: string, lessonId: string, versionId: string) {
  if (!z.uuid().safeParse(versionId).success) {
    throw new ServiceError("not_found");
  }
  const service = createServiceClient();
  const version = await loadAccessibleLessonVersion(lessonId, versionId, userId);
  if (!version) {
    throw new ServiceError("not_found");
  }
  const now = new Date().toISOString();
  await runMutation(
    service.from("lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        lesson_version_id: versionId,
        read_completed_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,lesson_id" },
    ),
  );
}

// The newest submitted attempts are enough to show a learner's weak spots.
const KIND_SUBMISSIONS = 100;
const KIND_BATCH = 10;

function inBatches(values: readonly string[]) {
  const batches: string[][] = [];
  for (let start = 0; start < values.length; start += KIND_BATCH) {
    batches.push(values.slice(start, start + KIND_BATCH));
  }
  return batches;
}

// Share of right answers per kind of question. Only attempts whose results the learner may
// already see count, so a test never shows right or wrong before its feedback time.
export async function getQuestionKindStats(userId: string, now: Date) {
  const service = createServiceClient();
  const submissions = await selectRows(
    service
      .from("submissions")
      .select("id, assignment_id, submitted_at")
      .eq("user_id", userId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(KIND_SUBMISSIONS),
    z.object({ id: z.uuid(), assignment_id: z.uuid(), submitted_at: timestamp }),
  );
  if (!submissions.length) {
    return [];
  }
  const rules = await selectRowsIn(
    submissions.map((row) => row.assignment_id),
    (chunk) => service.from("assignments").select("id, feedback_policy, due_at").in("id", chunk),
    z.object({
      id: z.uuid(),
      feedback_policy: z.enum(FEEDBACK_POLICIES),
      due_at: timestamp.nullable(),
    }),
  );
  const ruleOf = new Map(rules.map((rule) => [rule.id, rule]));
  const visible = submissions.filter((row) => {
    const rule = ruleOf.get(row.assignment_id);
    return (
      rule !== undefined &&
      isFeedbackAvailable(
        { feedbackPolicy: rule.feedback_policy, dueAt: rule.due_at },
        row.submitted_at,
        now,
      )
    );
  });
  if (!visible.length) {
    return [];
  }
  const answerSchema = z.object({
    submission_id: z.uuid(),
    question_id: z.string(),
    is_correct: z.boolean(),
  });
  const itemSchema = z.object({
    assignment_id: z.uuid(),
    question_id: z.string(),
    type: z.string(),
    passage: z.string().nullable(),
  });
  const [answerPages, itemPages] = await Promise.all([
    Promise.all(
      inBatches(visible.map((row) => row.id)).map((batch) =>
        selectEveryPage(
          (from, to) =>
            service
              .from("answers")
              .select("submission_id, question_id, is_correct")
              .in("submission_id", batch)
              .order("submission_id")
              .order("question_id")
              .range(from, to),
          answerSchema,
        ),
      ),
    ),
    Promise.all(
      inBatches([...new Set(visible.map((row) => row.assignment_id))]).map((batch) =>
        selectEveryPage(
          (from, to) =>
            service
              .from("assignment_items")
              .select(
                "assignment_id, question_id, type:question_snapshot->>type, passage:question_snapshot->>passage",
              )
              .in("assignment_id", batch)
              .order("assignment_id")
              .order("question_id")
              .range(from, to),
          itemSchema,
        ),
      ),
    ),
  ]);
  const assignmentOf = new Map(visible.map((row) => [row.id, row.assignment_id]));
  const kindOf = new Map(
    itemPages
      .flat()
      .map((item) => [
        `${item.assignment_id}:${item.question_id}`,
        questionKind(item.type, Boolean(item.passage)),
      ]),
  );
  return summarizeQuestionKinds(
    answerPages.flat().flatMap((answer) => {
      const kind = kindOf.get(`${assignmentOf.get(answer.submission_id)}:${answer.question_id}`);
      return kind ? [{ kind, isCorrect: answer.is_correct }] : [];
    }),
  );
}

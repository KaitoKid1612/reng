import "server-only";

import { z } from "zod";

import { compareDueUrgency, getDeadlineState, isFeedbackAvailable } from "@/lib/assignment";
import { toPercent } from "@/lib/grading/grade";
import { listClassAssignments, listUserAttempts } from "@/lib/server/assignments";
import { listClassLessons, listStudentClasses, requireMembership } from "@/lib/server/classes";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";
import { listDueCards, MAX_SESSION_CARDS } from "@/lib/server/reviews";
import {
  createServiceClient,
  runMutation,
  selectOptional,
  selectRows,
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
  const attempts = await listUserAttempts(
    userId,
    assignments.map((assignment) => assignment.id),
  );
  return {
    classRow,
    lessons: lessons.filter((lesson) => Date.parse(lesson.availableAt) <= now.getTime()),
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

function isOpenWork(item: LearnerAssignment) {
  return item.status === "not_started" || item.status === "in_progress";
}

export async function getLearnerAgenda(userId: string, now: Date) {
  const [{ classes, assignments }, dueCards] = await Promise.all([
    listLearnerAssignments(userId, now),
    // One card past a session tells "50" apart from a longer backlog.
    listDueCards(userId, now, MAX_SESSION_CARDS + 1),
  ]);
  return {
    classes,
    dueCardCount: Math.min(dueCards.length, MAX_SESSION_CARDS),
    hasMoreDueCards: dueCards.length > MAX_SESSION_CARDS,
    openAssignments: assignments
      .filter(isOpenWork)
      .sort((first, second) =>
        compareDueUrgency(first.assignment.dueAt, second.assignment.dueAt, now),
      ),
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

import "server-only";

import { z } from "zod";

import { isFeedbackAvailable } from "@/lib/assignment";
import { buildDailyDays } from "@/lib/daily-history";
import { toPercent } from "@/lib/grading/grade";
import { listAssignmentsByIds, listUserAttempts } from "@/lib/server/assignments";
import { requireMembership } from "@/lib/server/classes";
import {
  createServiceClient,
  selectEveryPage,
  selectOptional,
  selectRows,
  selectRowsIn,
} from "@/lib/server/supabase";
import { toStudyDay } from "@/lib/study-days";

import type { DailyResult, DailyRun } from "@/lib/daily-history";
import type { Assignment, Attempt } from "@/lib/server/assignments";

// One row per Vietnam day the class received a daily set, oldest first. A class gains a row a
// day, so the table is read a page at a time.
export async function listDailyRuns(classId: string): Promise<DailyRun[]> {
  const rows = await selectEveryPage(
    (from, to) =>
      createServiceClient()
        .from("daily_practice_runs")
        .select("practice_date, assignment_id")
        .eq("class_id", classId)
        .order("practice_date")
        .range(from, to),
    z.object({ practice_date: z.iso.date(), assignment_id: z.uuid() }),
  );
  return rows.map((row) => ({ date: row.practice_date, assignmentId: row.assignment_id }));
}

// Assignments the class's daily practice created, one per Vietnam day.
export async function listDailyAssignmentIds(assignmentIds: readonly string[]) {
  const rows = await selectRowsIn(
    assignmentIds,
    (chunk) =>
      createServiceClient()
        .from("daily_practice_runs")
        .select("assignment_id")
        .in("assignment_id", chunk),
    z.object({ assignment_id: z.uuid() }),
  );
  return new Set(rows.map((row) => row.assignment_id));
}

// The day a daily set belongs to, or null for an assignment the teacher gave by hand. Only a
// date is returned, so it may be read alongside the caller's own access check.
export async function findDailyRunDate(assignmentId: string) {
  if (!z.uuid().safeParse(assignmentId).success) {
    return null;
  }
  const row = await selectOptional(
    createServiceClient()
      .from("daily_practice_runs")
      .select("practice_date")
      .eq("assignment_id", assignmentId)
      .maybeSingle(),
    z.object({ practice_date: z.iso.date() }),
  );
  return row?.practice_date ?? null;
}

// Whether the class ever received a daily set, so its history page has something to show.
export async function hasDailyRuns(classId: string) {
  const rows = await selectRows(
    createServiceClient()
      .from("daily_practice_runs")
      .select("practice_date")
      .eq("class_id", classId)
      .limit(1),
    z.object({ practice_date: z.iso.date() }),
  );
  return rows.length > 0;
}

function latestSubmitted(attempts: readonly Attempt[]) {
  return attempts
    .filter((attempt) => attempt.status === "submitted")
    .reduce<Attempt | null>(
      (latest, attempt) => (!latest || attempt.attemptNo > latest.attemptNo ? attempt : latest),
      null,
    );
}

// The learner sees a day's score only once its feedback may be shown, as on the results page.
function describeLearnerDay(
  assignment: Assignment,
  attempts: readonly Attempt[],
  now: Date,
): DailyResult {
  const latest = latestSubmitted(attempts);
  const canShow = latest ? isFeedbackAvailable(assignment, latest.submittedAt, now) : false;
  return {
    title: assignment.title,
    percent:
      canShow && latest && latest.score !== null && latest.maxScore
        ? toPercent(latest.score, latest.maxScore)
        : null,
    submitted: latest !== null,
    attemptCount: attempts.length,
  };
}

export async function getLearnerDailyHistory(userId: string, classId: string, now: Date) {
  const { classRow, joinedAt } = await requireMembership(userId, classId);
  const runs = await listDailyRuns(classId);
  const assignmentIds = runs.map((run) => run.assignmentId);
  const [assignments, attempts] = await Promise.all([
    listAssignmentsByIds(assignmentIds),
    listUserAttempts(userId, assignmentIds),
  ]);
  const attemptsOf = Map.groupBy(attempts, (attempt) => attempt.assignmentId);
  const results = new Map(
    assignments.map((assignment) => [
      assignment.id,
      describeLearnerDay(assignment, attemptsOf.get(assignment.id) ?? [], now),
    ]),
  );
  const today = toStudyDay(now);
  return {
    classRow,
    today,
    days: buildDailyDays(runs, results, toStudyDay(joinedAt), today),
  };
}

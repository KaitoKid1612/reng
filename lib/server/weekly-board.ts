import "server-only";

import { z } from "zod";

import { FEEDBACK_POLICIES, hasFeedbackTimeArrived } from "@/lib/assignment";
import { countsAsLearner, getTeacherClass } from "@/lib/server/classes";
import {
  createServiceClient,
  runMutation,
  selectEveryPageIn,
  selectOptional,
  selectRows,
  selectRowsIn,
} from "@/lib/server/supabase";
import { boardWeek, daysLeftInWeek, rankBoard, visibleBoardRows } from "@/lib/weekly-board";

import type { BoardWeek } from "@/lib/weekly-board";

const timestamp = z.iso.datetime({ offset: true });

export interface BoardEntry {
  rank: number;
  name: string;
  points: number;
  activeDays: number;
  isViewer: boolean;
  // Only the viewer sees their own row when they chose to stay off the board.
  isHidden: boolean;
}

export interface WeeklyBoard {
  teacherId: string;
  teacherName: string;
  week: BoardWeek;
  daysLeft: number;
  entries: BoardEntry[];
  lastWeekLeader: { name: string; points: number } | null;
}

export async function setClassWeeklyBoard(teacherId: string, classId: string, enabled: boolean) {
  await getTeacherClass(teacherId, classId);
  await runMutation(
    createServiceClient()
      .from("classes")
      .update({ weekly_board: enabled })
      .eq("id", classId)
      .eq("teacher_id", teacherId),
  );
}

export async function isClassOnWeeklyBoard(classId: string) {
  const row = await selectOptional(
    createServiceClient().from("classes").select("weekly_board").eq("id", classId).maybeSingle(),
    z.object({ weekly_board: z.boolean() }),
  );
  return row?.weekly_board ?? false;
}

export async function isHiddenFromBoard(userId: string) {
  const row = await selectOptional(
    createServiceClient().from("profiles").select("hide_from_board").eq("id", userId).maybeSingle(),
    z.object({ hide_from_board: z.boolean() }),
  );
  return row?.hide_from_board ?? false;
}

export async function setHiddenFromBoard(userId: string, hidden: boolean) {
  await runMutation(
    createServiceClient().from("profiles").update({ hide_from_board: hidden }).eq("id", userId),
  );
}

const classSchema = z.object({
  id: z.uuid(),
  teacher_id: z.uuid(),
  self_study: z.boolean(),
});

/**
 * The boards the viewer belongs to: one per teacher whose classes joined the weekly board and
 * where the viewer learns or teaches. Everyone in those classes is ranked together.
 */
export async function loadWeeklyBoards(userId: string, now: Date): Promise<WeeklyBoard[]> {
  const service = createServiceClient();
  const [enrolled, owned] = await Promise.all([
    selectRows(
      service.from("enrollments").select("class_id").eq("user_id", userId).is("left_at", null),
      z.object({ class_id: z.uuid() }),
    ),
    selectRows(
      service
        .from("classes")
        .select("id")
        .eq("teacher_id", userId)
        .eq("weekly_board", true)
        .eq("active", true),
      z.object({ id: z.uuid() }),
    ),
  ]);
  const ownClassIds = [...enrolled.map((row) => row.class_id), ...owned.map((row) => row.id)];
  if (!ownClassIds.length) {
    return [];
  }
  const ownBoardClasses = await selectRowsIn(
    ownClassIds,
    (chunk) =>
      service
        .from("classes")
        .select("teacher_id")
        .in("id", chunk)
        .eq("weekly_board", true)
        .eq("active", true),
    z.object({ teacher_id: z.uuid() }),
  );
  const teacherIds = [...new Set(ownBoardClasses.map((row) => row.teacher_id))];
  if (!teacherIds.length) {
    return [];
  }
  const boardClasses = await selectRowsIn(
    teacherIds,
    (chunk) =>
      service
        .from("classes")
        .select("id, teacher_id, self_study")
        .in("teacher_id", chunk)
        .eq("weekly_board", true)
        .eq("active", true),
    classSchema,
  );
  const classIds = boardClasses.map((row) => row.id);
  const lastWeek = boardWeek(now, 1);
  const [enrollments, assignments] = await Promise.all([
    selectEveryPageIn(
      classIds,
      (chunk, from, to) =>
        service
          .from("enrollments")
          .select("class_id, user_id")
          .in("class_id", chunk)
          .is("left_at", null)
          .order("class_id")
          .order("user_id")
          .range(from, to),
      z.object({ class_id: z.uuid(), user_id: z.uuid() }),
    ),
    selectEveryPageIn(
      classIds,
      (chunk, from, to) =>
        service
          .from("assignments")
          .select("id, class_id, feedback_policy, due_at")
          .in("class_id", chunk)
          .neq("status", "draft")
          .order("id")
          .range(from, to),
      z.object({
        id: z.uuid(),
        class_id: z.uuid(),
        feedback_policy: z.enum(FEEDBACK_POLICIES),
        due_at: timestamp.nullable(),
      }),
    ),
  ]);
  const submissions = await selectEveryPageIn(
    assignments.map((row) => row.id),
    (chunk, from, to) =>
      service
        .from("submissions")
        .select("user_id, assignment_id, score, submitted_at")
        .in("assignment_id", chunk)
        .eq("status", "submitted")
        .gte("submitted_at", lastWeek.startsAt)
        .order("id")
        .range(from, to),
    z.object({
      user_id: z.uuid(),
      assignment_id: z.uuid(),
      score: z.number().int().nullable(),
      submitted_at: timestamp,
    }),
  );
  const classOf = new Map(boardClasses.map((row) => [row.id, row]));
  // A test whose results come after its deadline adds nothing before then: a jump on the board
  // would tell the learner and everyone else the score the teacher is holding back.
  const assignmentClass = new Map(
    assignments
      .filter((row) =>
        hasFeedbackTimeArrived({ feedbackPolicy: row.feedback_policy, dueAt: row.due_at }, now),
      )
      .map((row) => [row.id, row.class_id]),
  );
  const peopleIds = [...new Set([...enrollments.map((row) => row.user_id), ...teacherIds, userId])];
  const people = await selectRowsIn(
    peopleIds,
    (chunk) => service.from("profiles").select("id, full_name, hide_from_board").in("id", chunk),
    z.object({ id: z.uuid(), full_name: z.string(), hide_from_board: z.boolean() }),
  );
  const personOf = new Map(people.map((row) => [row.id, row]));
  const week = boardWeek(now);
  return teacherIds.map((teacherId) => {
    const isBoardClass = (classId: string | undefined) =>
      classId !== undefined && classOf.get(classId)?.teacher_id === teacherId;
    const members = [
      ...new Set(
        enrollments
          .filter((row) => {
            const classRow = classOf.get(row.class_id);
            return classRow?.teacher_id === teacherId && countsAsLearner(classRow, row.user_id);
          })
          .map((row) => row.user_id),
      ),
    ];
    const boardSubmissions = submissions
      .filter((row) => isBoardClass(assignmentClass.get(row.assignment_id)))
      .map((row) => ({
        userId: row.user_id,
        assignmentId: row.assignment_id,
        score: row.score ?? 0,
        submittedAt: row.submitted_at,
      }));
    const nameOf = (memberId: string) => personOf.get(memberId)?.full_name || "Học viên";
    const ranked = visibleBoardRows(
      rankBoard(members, boardSubmissions, week),
      userId,
      (memberId) => Boolean(personOf.get(memberId)?.hide_from_board),
    );
    const lastLeader = rankBoard(members, boardSubmissions, lastWeek).find(
      (row) => row.points > 0 && !personOf.get(row.userId)?.hide_from_board,
    );
    return {
      teacherId,
      teacherName: nameOf(teacherId),
      week,
      daysLeft: daysLeftInWeek(week, now),
      entries: ranked.map((row, index) => ({
        rank: index + 1,
        name: nameOf(row.userId),
        points: row.points,
        activeDays: row.activeDays,
        isViewer: row.userId === userId,
        isHidden: Boolean(personOf.get(row.userId)?.hide_from_board),
      })),
      lastWeekLeader: lastLeader
        ? { name: nameOf(lastLeader.userId), points: lastLeader.points }
        : null,
    };
  });
}

// Pages read the board best-effort: a failed read (such as before the board's migration) only
// leaves the board out.
export async function loadWeeklyBoardsSafely(userId: string, now: Date) {
  try {
    return await loadWeeklyBoards(userId, now);
  } catch (error) {
    console.error("Weekly board failed", error instanceof Error ? error.name : "unknown");
    return [];
  }
}

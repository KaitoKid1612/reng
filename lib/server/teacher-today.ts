import "server-only";

import { z } from "zod";

import { listClassAssignments } from "@/lib/server/assignments";
import { listClassSchedules } from "@/lib/server/class-schedule";
import { listTeacherClasses } from "@/lib/server/classes";
import { listDailyAssignmentIds } from "@/lib/server/daily-history";
import { createServiceClient, selectRowsIn } from "@/lib/server/supabase";
import { buildTeacherToday } from "@/lib/teacher-today";

import type { ScheduleSlot } from "@/lib/class-schedule";
import type {
  TeacherTodayAssignment,
  TeacherTodayClass,
  TeacherTodaySubmissions,
} from "@/lib/teacher-today";

const DAY_MS = 24 * 60 * 60 * 1000;

// Published work with a deadline in the teaching classes, and how many submissions each class got
// in the last 24 hours. Callers pass only classes the teacher owns.
export async function loadTeacherTodayActivity(classIds: readonly string[], now: Date) {
  const assignments = await listClassAssignments(classIds);
  const classOf = new Map(assignments.map((assignment) => [assignment.id, assignment.classId]));
  const dueIds = assignments
    .filter((assignment) => assignment.status === "published" && assignment.dueAt)
    .map((assignment) => assignment.id);
  const [dailyIds, recent] = await Promise.all([
    listDailyAssignmentIds(dueIds),
    selectRowsIn(
      assignments.map((assignment) => assignment.id),
      (chunk) =>
        createServiceClient()
          .from("submissions")
          .select("assignment_id")
          .eq("status", "submitted")
          .gte("submitted_at", new Date(now.getTime() - DAY_MS).toISOString())
          .in("assignment_id", chunk),
      z.object({ assignment_id: z.uuid() }),
    ),
  ]);
  const counts = new Map<string, number>();
  for (const row of recent) {
    const classId = classOf.get(row.assignment_id);
    if (classId) {
      counts.set(classId, (counts.get(classId) ?? 0) + 1);
    }
  }
  return {
    assignments: assignments.flatMap((assignment): TeacherTodayAssignment[] =>
      assignment.status === "published" && assignment.dueAt
        ? [
            {
              id: assignment.id,
              classId: assignment.classId,
              title: assignment.title,
              dueAt: assignment.dueAt,
              isDaily: dailyIds.has(assignment.id),
            },
          ]
        : [],
    ),
    submissions: [...counts].map(([classId, count]): TeacherTodaySubmissions => ({
      classId,
      count,
    })),
  };
}

interface TeachingClassRow {
  id: string;
  name: string;
}

// The classes a teacher's plan covers, with their weekly slots.
export function toTeacherTodayClasses(
  classes: readonly TeachingClassRow[],
  schedules: ReadonlyMap<string, { slots: readonly ScheduleSlot[] }>,
): TeacherTodayClass[] {
  return classes.map((item) => ({
    id: item.id,
    name: item.name,
    slots: schedules.get(item.id)?.slots ?? [],
  }));
}

// "Hôm nay dạy gì" for a teacher's start page; null when they teach no active class. A self-study
// class never takes learners, so only teaching classes count.
export async function getTeacherToday(teacherId: string, now: Date) {
  const classes = await listTeacherClasses(teacherId);
  const teaching = classes.filter((item) => !item.self_study && item.active);
  if (!teaching.length) {
    return null;
  }
  const ids = teaching.map((item) => item.id);
  const [schedules, activity] = await Promise.all([
    listClassSchedules(ids),
    loadTeacherTodayActivity(ids, now),
  ]);
  return buildTeacherToday(
    { classes: toTeacherTodayClasses(teaching, schedules), ...activity },
    now,
  );
}

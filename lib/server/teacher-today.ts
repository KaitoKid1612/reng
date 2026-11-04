import "server-only";

import { z } from "zod";

import { listClassAssignments } from "@/lib/server/assignments";
import { createServiceClient, selectRowsIn } from "@/lib/server/supabase";

import type { TeacherTodayAssignment, TeacherTodaySubmissions } from "@/lib/teacher-today";

const DAY_MS = 24 * 60 * 60 * 1000;

// Published work with a deadline in the teaching classes, and how many submissions each class got
// in the last 24 hours. Callers pass only classes the teacher owns.
export async function loadTeacherTodayActivity(classIds: readonly string[], now: Date) {
  const assignments = await listClassAssignments(classIds);
  const classOf = new Map(assignments.map((assignment) => [assignment.id, assignment.classId]));
  const recent = await selectRowsIn(
    assignments.map((assignment) => assignment.id),
    (chunk) =>
      createServiceClient()
        .from("submissions")
        .select("assignment_id")
        .eq("status", "submitted")
        .gte("submitted_at", new Date(now.getTime() - DAY_MS).toISOString())
        .in("assignment_id", chunk),
    z.object({ assignment_id: z.uuid() }),
  );
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

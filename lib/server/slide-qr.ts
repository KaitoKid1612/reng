import "server-only";

import { z } from "zod";

import { getTeacherClass } from "@/lib/server/classes";
import { createServiceClient, selectRows, ServiceError } from "@/lib/server/supabase";
import { buildSlideQrTargets } from "@/lib/slide-qr";

const MAX_ASSIGNMENTS = 6;

const classLessonRowSchema = z.object({
  available_at: z.iso.datetime({ offset: true }).nullable(),
});
const assignmentRowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  due_at: z.iso.datetime({ offset: true }).nullable(),
  allow_late: z.boolean(),
});

// The codes a teacher can show on the shared slides of one class lesson. Only the class owner gets
// any: a code reveals the class invitation, so another teacher's class id yields nothing.
export async function listSlideQrTargets(
  teacherId: string,
  classId: string,
  lessonId: string,
  now: Date,
) {
  let classRow;
  try {
    classRow = await getTeacherClass(teacherId, classId);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "not_found") {
      return [];
    }
    throw error;
  }
  const service = createServiceClient();
  const [classLessons, assignments] = await Promise.all([
    selectRows(
      service
        .from("class_lessons")
        .select("available_at")
        .eq("class_id", classId)
        .eq("lesson_id", lessonId),
      classLessonRowSchema,
    ),
    selectRows(
      service
        .from("assignments")
        .select("id, title, due_at, allow_late")
        .eq("class_id", classId)
        .eq("lesson_id", lessonId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(MAX_ASSIGNMENTS * 2),
      assignmentRowSchema,
    ),
  ]);
  // Daily sets are opened from the class page each day, not from a lesson's slides.
  const dailyIds = assignments.length
    ? new Set(
        (
          await selectRows(
            service
              .from("daily_practice_runs")
              .select("assignment_id")
              .in(
                "assignment_id",
                assignments.map((row) => row.id),
              ),
            z.object({ assignment_id: z.uuid() }),
          )
        ).map((row) => row.assignment_id),
      )
    : new Set<string>();
  const availableAt = classLessons[0]?.available_at;
  return buildSlideQrTargets(
    {
      lessonId,
      joinCode:
        classRow.active && classRow.join_enabled && !classRow.self_study
          ? classRow.join_code
          : null,
      lessonInClass:
        classLessons.length > 0 && (!availableAt || Date.parse(availableAt) <= now.getTime()),
      assignments: assignments
        .filter((row) => !dailyIds.has(row.id))
        .slice(0, MAX_ASSIGNMENTS)
        .map((row) => ({
          id: row.id,
          title: row.title,
          dueAt: row.due_at,
          allowLate: row.allow_late,
        })),
    },
    now,
  );
}

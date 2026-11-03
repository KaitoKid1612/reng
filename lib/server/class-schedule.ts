import "server-only";

import { z } from "zod";

import { classScheduleSchema, EMPTY_SCHEDULE, normalizeSlots } from "@/lib/class-schedule";
import { getTeacherClass } from "@/lib/server/classes";
import {
  createServiceClient,
  runMutation,
  selectOptional,
  selectRowsIn,
  ServiceError,
} from "@/lib/server/supabase";

import type { ClassSchedule } from "@/lib/class-schedule";

const scheduleRowSchema = z.object({ class_id: z.uuid(), slots: z.unknown(), note: z.string() });

// A row the current app version cannot read must not break the class pages; it shows no schedule.
function toSchedule(row: { slots: unknown; note: string } | null): ClassSchedule {
  const parsed = row ? classScheduleSchema.safeParse({ slots: row.slots, note: row.note }) : null;
  if (!parsed?.success) {
    return EMPTY_SCHEDULE;
  }
  return { slots: normalizeSlots(parsed.data.slots), note: parsed.data.note };
}

// The timetable is extra information: when it cannot be read (for example, before its migration
// reaches a database), class pages still open, only without the next session.
async function readOrFallback<Value>(read: () => Promise<Value>, fallback: Value) {
  try {
    return await read();
  } catch (error) {
    if (!(error instanceof ServiceError)) {
      throw error;
    }
    console.error(`class_schedules read failed: ${error.code}`);
    return fallback;
  }
}

// Callers check the class owner or member first.
export async function getClassSchedule(classId: string) {
  return readOrFallback(async () => {
    const row = await selectOptional(
      createServiceClient()
        .from("class_schedules")
        .select("class_id, slots, note")
        .eq("class_id", classId)
        .maybeSingle(),
      scheduleRowSchema,
    );
    return toSchedule(row);
  }, EMPTY_SCHEDULE);
}

export async function listClassSchedules(classIds: readonly string[]) {
  return readOrFallback(async () => {
    const rows = await selectRowsIn(
      classIds,
      (chunk) =>
        createServiceClient()
          .from("class_schedules")
          .select("class_id, slots, note")
          .in("class_id", chunk),
      scheduleRowSchema,
    );
    return new Map(rows.map((row) => [row.class_id, toSchedule(row)]));
  }, new Map<string, ClassSchedule>());
}

export async function saveClassSchedule(
  teacherId: string,
  classId: string,
  schedule: ClassSchedule,
) {
  await getTeacherClass(teacherId, classId);
  await runMutation(
    createServiceClient()
      .from("class_schedules")
      .upsert({
        class_id: classId,
        slots: normalizeSlots(schedule.slots),
        note: schedule.note,
        updated_at: new Date().toISOString(),
      }),
  );
}

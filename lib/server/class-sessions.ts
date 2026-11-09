import "server-only";

import { z } from "zod";

import { getTeacherClass } from "@/lib/server/classes";
import {
  callRpc,
  createServiceClient,
  describeServiceFailure,
  runMutation,
  selectEveryPage,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";

import type {
  AttendanceMark,
  ClassSessionInput,
  SessionAttendanceInput,
} from "@/lib/class-sessions";

// The class page shows the latest sessions; older ones stay in the database.
const RECENT_SESSIONS = 12;

const sessionRowSchema = z.object({
  id: z.uuid(),
  taught_on: z.iso.date(),
  lesson_id: z.string().nullable(),
  lesson_version_id: z.uuid().nullable(),
  slide_reached: z.number().int().nullable(),
  notes: z.string(),
});

export interface ClassSession {
  id: string;
  taughtOn: string;
  lesson: { id: string; versionId: string; title: string; versionNo: number } | null;
  slideReached: number | null;
  notes: string;
  /** Learners marked present or absent; null while the attendance table is not available. */
  marks: AttendanceMark[] | null;
}

const markRowSchema = z.object({
  session_id: z.uuid(),
  user_id: z.uuid(),
  is_present: z.boolean(),
});

// Before migration 20261109024203 is applied the attendance table is missing; the log still opens,
// without attendance. Twelve sessions of a large class pass the 1000-row cap, so it is paged.
async function listAttendance(sessionIds: readonly string[]) {
  const marks = new Map<string, AttendanceMark[]>();
  if (!sessionIds.length) {
    return marks;
  }
  try {
    const rows = await selectEveryPage(
      (from, to) =>
        createServiceClient()
          .from("class_session_attendance")
          .select("session_id, user_id, is_present")
          .in("session_id", [...sessionIds])
          .order("session_id")
          .order("user_id")
          .range(from, to),
      markRowSchema,
    );
    for (const row of rows) {
      const list = marks.get(row.session_id) ?? [];
      list.push({ userId: row.user_id, isPresent: row.is_present });
      marks.set(row.session_id, list);
    }
    return marks;
  } catch (error) {
    console.error("Session attendance unavailable", describeServiceFailure(error));
    return null;
  }
}

// Callers check that the teacher owns the class before listing its sessions.
export async function listClassSessions(classId: string): Promise<ClassSession[]> {
  const service = createServiceClient();
  const rows = await selectRows(
    service
      .from("class_sessions")
      .select("id, taught_on, lesson_id, lesson_version_id, slide_reached, notes")
      .eq("class_id", classId)
      .order("taught_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(RECENT_SESSIONS),
    sessionRowSchema,
  );
  const versionIds = [
    ...new Set(rows.flatMap((row) => (row.lesson_version_id ? [row.lesson_version_id] : []))),
  ];
  const [versions, attendance] = await Promise.all([
    versionIds.length
      ? selectRows(
          service.from("lesson_versions").select("id, title, version_no").in("id", versionIds),
          z.object({ id: z.uuid(), title: z.string(), version_no: z.number().int() }),
        )
      : [],
    listAttendance(rows.map((row) => row.id)),
  ]);
  return rows.map((row) => {
    const version = versions.find((item) => item.id === row.lesson_version_id);
    return {
      id: row.id,
      taughtOn: row.taught_on,
      lesson:
        row.lesson_id && version
          ? {
              id: row.lesson_id,
              versionId: version.id,
              title: version.title,
              versionNo: version.version_no,
            }
          : null,
      slideReached: row.slide_reached,
      notes: row.notes,
      marks: attendance ? (attendance.get(row.id) ?? []) : null,
    };
  });
}

/** Marks learners of the teacher's own class present or absent for one recorded session. */
export async function saveSessionAttendance(teacherId: string, input: SessionAttendanceInput) {
  return callRpc(
    "save_session_attendance",
    {
      p_teacher_id: teacherId,
      p_class_id: input.classId,
      p_session_id: input.sessionId,
      p_present_ids: input.presentIds,
      p_absent_ids: input.absentIds,
    },
    z.number().int(),
  );
}

// The session keeps the version the class shows at the time, so its slide number still points
// at the same slide after the class moves to a newer version.
export async function recordClassSession(teacherId: string, input: ClassSessionInput) {
  await getTeacherClass(teacherId, input.classId);
  const service = createServiceClient();
  let versionId: string | null = null;
  if (input.lessonId) {
    const pinned = await selectOptional(
      service
        .from("class_lessons")
        .select("lesson_version_id")
        .eq("class_id", input.classId)
        .eq("lesson_id", input.lessonId)
        .maybeSingle(),
      z.object({ lesson_version_id: z.uuid() }),
    );
    if (!pinned) {
      throw new ServiceError("lesson_not_in_class");
    }
    versionId = pinned.lesson_version_id;
  }
  await runMutation(
    service.from("class_sessions").insert({
      class_id: input.classId,
      taught_on: input.taughtOn,
      lesson_id: input.lessonId,
      lesson_version_id: versionId,
      slide_reached: input.slideReached,
      notes: input.notes,
    }),
  );
}

export async function deleteClassSession(teacherId: string, classId: string, sessionId: string) {
  await getTeacherClass(teacherId, classId);
  if (!z.uuid().safeParse(sessionId).success) {
    throw new ServiceError("not_found");
  }
  await runMutation(
    createServiceClient()
      .from("class_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("class_id", classId),
  );
}

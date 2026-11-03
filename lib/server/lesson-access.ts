import "server-only";

import { z } from "zod";

import {
  isDatabaseLessonSource,
  loadLessonVersion,
  parseDatabaseVersion,
} from "@/lib/lesson-repository";
import { getCurrentAccount } from "@/lib/server/account";
import { callRpc, createServiceClient, selectRows } from "@/lib/server/supabase";
import { toPublicAnyLesson } from "@/lib/teaching-content";

// actorId is supplied only by trusted server callers (session or an already-scoped email job).
export async function loadAccessibleLessonVersion(
  lessonId: string,
  versionId?: string,
  actorId?: string | null,
) {
  if (!isDatabaseLessonSource()) {
    return loadLessonVersion(lessonId, versionId);
  }
  if (versionId && !z.uuid().safeParse(versionId).success) {
    return undefined;
  }
  const userId = actorId === undefined ? ((await getCurrentAccount())?.id ?? null) : actorId;
  const row = await callRpc(
    "read_lesson_version",
    { p_user_id: userId, p_lesson_id: lessonId, p_version_id: versionId ?? null },
    z.record(z.string(), z.unknown()).nullable(),
  );
  return row ? parseDatabaseVersion(row) : undefined;
}

// The version each lesson's class pins for this learner, the most recently opened first, as
// read_lesson_version picks it for members. Lesson owners (a teacher in a self-study class) and
// public lessons otherwise read the newest published version, so flashcards and review cards
// could show other words than the class teaches.
export async function findClassLessonVersions(
  userId: string,
  lessonIds: readonly string[],
  now: Date,
) {
  const versions = new Map<string, string>();
  if (!lessonIds.length || !isDatabaseLessonSource()) {
    return versions;
  }
  const service = createServiceClient();
  const enrollments = await selectRows(
    service.from("enrollments").select("class_id").eq("user_id", userId).is("left_at", null),
    z.object({ class_id: z.uuid() }),
  );
  if (!enrollments.length) {
    return versions;
  }
  const classes = await selectRows(
    service
      .from("classes")
      .select("id")
      .in(
        "id",
        enrollments.map((row) => row.class_id),
      )
      .eq("active", true),
    z.object({ id: z.uuid() }),
  );
  if (!classes.length) {
    return versions;
  }
  const rows = await selectRows(
    service
      .from("class_lessons")
      .select("lesson_id, lesson_version_id")
      .in(
        "class_id",
        classes.map((row) => row.id),
      )
      .in("lesson_id", [...new Set(lessonIds)])
      .lte("available_at", now.toISOString())
      .order("available_at", { ascending: false })
      .order("class_id"),
    z.object({ lesson_id: z.string(), lesson_version_id: z.uuid() }),
  );
  for (const row of rows) {
    if (!versions.has(row.lesson_id)) {
      versions.set(row.lesson_id, row.lesson_version_id);
    }
  }
  return versions;
}

export async function loadAccessibleLesson(lessonId: string, versionId?: string) {
  const version = await loadAccessibleLessonVersion(lessonId, versionId);
  return version ? toPublicAnyLesson(version) : undefined;
}

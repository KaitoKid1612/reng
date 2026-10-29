import "server-only";

import { z } from "zod";

import {
  isDatabaseLessonSource,
  loadLessonVersion,
  parseDatabaseVersion,
} from "@/lib/lesson-repository";
import { getCurrentAccount } from "@/lib/server/account";
import { callRpc } from "@/lib/server/supabase";
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

export async function loadAccessibleLesson(lessonId: string, versionId?: string) {
  const version = await loadAccessibleLessonVersion(lessonId, versionId);
  return version ? toPublicAnyLesson(version) : undefined;
}

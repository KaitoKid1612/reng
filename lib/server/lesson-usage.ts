import "server-only";

import { z } from "zod";

import { getTeacherClass, listTeacherClasses, setClassLesson } from "@/lib/server/classes";
import {
  createServiceClient,
  selectOptional,
  selectRows,
  selectRowsIn,
  ServiceError,
} from "@/lib/server/supabase";

export interface ClassUsage {
  classId: string;
  className: string;
  // The version number the class shows, or null when the lesson is not in the class.
  usedVersionNo: number | null;
}

export interface LessonUsage {
  publishedVersion: { id: string; versionNo: number } | null;
  classes: ClassUsage[];
}

const versionSchema = z.object({ id: z.uuid(), version_no: z.number().int() });

async function loadPublishedVersion(teacherId: string, lessonId: string) {
  const service = createServiceClient();
  const lesson = await selectOptional(
    service
      .from("lessons")
      .select("published_version_id")
      .eq("id", lessonId)
      .eq("owner_id", teacherId)
      .is("archived_at", null)
      .maybeSingle(),
    z.object({ published_version_id: z.uuid().nullable() }),
  );
  if (!lesson) {
    throw new ServiceError("lesson_not_found");
  }
  if (!lesson.published_version_id) {
    return null;
  }
  return selectOptional(
    service
      .from("lesson_versions")
      .select("id, version_no")
      .eq("id", lesson.published_version_id)
      .maybeSingle(),
    versionSchema,
  );
}

// Which of the teacher's active classes use this lesson, and at which version.
export async function getLessonUsage(teacherId: string, lessonId: string): Promise<LessonUsage> {
  const service = createServiceClient();
  const [published, classes] = await Promise.all([
    loadPublishedVersion(teacherId, lessonId),
    listTeacherClasses(teacherId),
  ]);
  const activeClasses = classes.filter((item) => item.active);
  const rows = await selectRowsIn(
    activeClasses.map((item) => item.id),
    (chunk) =>
      service
        .from("class_lessons")
        .select("class_id, lesson_version_id")
        .eq("lesson_id", lessonId)
        .in("class_id", chunk),
    z.object({ class_id: z.uuid(), lesson_version_id: z.uuid() }),
  );
  const versions = await selectRowsIn(
    rows.map((row) => row.lesson_version_id),
    (chunk) => service.from("lesson_versions").select("id, version_no").in("id", chunk),
    versionSchema,
  );
  return {
    publishedVersion: published ? { id: published.id, versionNo: published.version_no } : null,
    classes: activeClasses.map((item) => {
      const row = rows.find((candidate) => candidate.class_id === item.id);
      const version = row && versions.find((candidate) => candidate.id === row.lesson_version_id);
      return {
        classId: item.id,
        className: item.name,
        usedVersionNo: row ? (version?.version_no ?? 0) : null,
      };
    }),
  };
}

// Puts the lesson's current published version into a class. A lesson already in the class keeps
// its order and opening time; a new one goes last and opens now.
export async function pinLatestVersion(teacherId: string, classId: string, lessonId: string) {
  await getTeacherClass(teacherId, classId);
  const published = await loadPublishedVersion(teacherId, lessonId);
  if (!published) {
    throw new ServiceError("version_not_found");
  }
  const service = createServiceClient();
  const placements = await selectRows(
    service
      .from("class_lessons")
      .select("lesson_id, order_no, available_at")
      .eq("class_id", classId),
    z.object({ lesson_id: z.string(), order_no: z.number().int(), available_at: z.string() }),
  );
  const current = placements.find((row) => row.lesson_id === lessonId);
  await setClassLesson(teacherId, {
    classId,
    lessonId,
    versionId: published.id,
    orderNo: current?.order_no ?? Math.max(0, ...placements.map((row) => row.order_no)) + 1,
    availableAt: current?.available_at ?? new Date().toISOString(),
  });
  return { versionNo: published.version_no, wasInClass: Boolean(current) };
}

// Whether any of the given classes (the caller's own teaching classes) has a lesson or an
// assignment. classes and class_lessons are linked twice (lessons and the daily practice source),
// so the lookup filters by class ID instead of embedding the class.
export async function getClassProgressFlags(classIds: readonly string[]) {
  const service = createServiceClient();
  const [lessons, assignments] = await Promise.all([
    selectRowsIn(
      classIds,
      (chunk) => service.from("class_lessons").select("class_id").in("class_id", chunk).limit(1),
      z.object({ class_id: z.uuid() }),
    ),
    selectRowsIn(
      classIds,
      (chunk) => service.from("assignments").select("class_id").in("class_id", chunk).limit(1),
      z.object({ class_id: z.uuid() }),
    ),
  ]);
  return { hasClassLesson: lessons.length > 0, hasAssignment: assignments.length > 0 };
}

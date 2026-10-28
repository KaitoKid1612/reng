import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { findPublicVersion } from "./lesson-catalog";
import { lessonCatalogSchema, lessonVersionSchema, toPublicLesson } from "./lesson-schema";

import type { LessonVersion } from "./lesson-schema";

function createLessonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Supabase lesson source is not configured.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isLocalLessonSource() {
  const source = process.env.LESSON_SOURCE || "local";
  if (source !== "local" && source !== "supabase") {
    throw new Error("Unknown lesson source.");
  }
  return source === "local";
}

async function readCatalog() {
  return lessonCatalogSchema.parse(
    JSON.parse(await readFile(resolve("content/lesson-catalog.json"), "utf8")),
  );
}

export function parseDatabaseVersion(row: Record<string, unknown>): LessonVersion {
  return lessonVersionSchema.parse({
    id: row.id,
    lessonId: row.lesson_id,
    versionNo: row.version_no,
    publishedAt: row.published_at,
    title: row.title,
    titleJa: row.title_ja,
    summary: row.summary,
    order: row.order_no,
    courseId: row.course_id,
    isSample: row.is_sample,
    content: row.content,
  });
}

export async function listPublicLessons() {
  if (isLocalLessonSource()) {
    const catalog = await readCatalog();
    return catalog.lessons
      .flatMap((entry) => {
        const version = findPublicVersion(catalog, entry.id);
        return version ? [toPublicLesson(version)] : [];
      })
      .sort((first, second) => first.order - second.order);
  }
  const client = createLessonClient();
  const { data: pointers, error } = await client
    .from("lessons")
    .select("id,published_version_id")
    .eq("visibility", "public")
    .is("archived_at", null)
    .not("published_version_id", "is", null);
  if (error) {
    throw new Error("Unable to load published lessons.");
  }
  if (!pointers?.length) {
    return [];
  }
  const { data: versions, error: versionError } = await client
    .from("lesson_versions")
    .select("*")
    .in(
      "id",
      pointers.map((pointer) => pointer.published_version_id),
    );
  if (versionError) {
    throw new Error("Unable to load published versions.");
  }
  return (versions || [])
    .map((version) => toPublicLesson(parseDatabaseVersion(version)))
    .sort((first, second) => first.order - second.order);
}

export async function loadLessonVersion(lessonId: string, versionId?: string) {
  if (isLocalLessonSource()) {
    return findPublicVersion(await readCatalog(), lessonId, versionId);
  }
  if (versionId && !/^[a-f0-9-]{36}$/i.test(versionId)) {
    return undefined;
  }
  const client = createLessonClient();
  const { data: lesson, error } = await client
    .from("lessons")
    .select("published_version_id")
    .eq("id", lessonId)
    .eq("visibility", "public")
    .is("archived_at", null)
    .not("published_version_id", "is", null)
    .maybeSingle();
  if (error) {
    throw new Error("Unable to load the published lesson.");
  }
  if (!lesson) {
    return undefined;
  }
  const { data: row, error: versionError } = await client
    .from("lesson_versions")
    .select("*")
    .eq("lesson_id", lessonId)
    .eq("id", versionId || lesson.published_version_id)
    .maybeSingle();
  if (versionError) {
    throw new Error("Unable to load the lesson version.");
  }
  return row ? parseDatabaseVersion(row) : undefined;
}

export async function loadPublicLesson(lessonId: string, versionId?: string) {
  const version = await loadLessonVersion(lessonId, versionId);
  return version ? toPublicLesson(version) : undefined;
}

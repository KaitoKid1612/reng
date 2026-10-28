import { randomUUID } from "node:crypto";

import { lessonCatalogSchema } from "./lesson-schema";

import type { LessonCatalog, LessonDraft } from "./lesson-schema";

export function findPublicVersion(catalog: LessonCatalog, lessonId: string, versionId?: string) {
  const lesson = catalog.lessons.find(
    (entry) => entry.id === lessonId && entry.visibility === "public",
  );
  if (!lesson) {
    return undefined;
  }
  return catalog.versions.find(
    (version) =>
      version.lessonId === lessonId && version.id === (versionId || lesson.publishedVersionId),
  );
}

export function publishLocalLesson(
  catalog: LessonCatalog,
  draft: LessonDraft,
  expectedRevision: number,
) {
  const previousVersions = catalog.versions.filter((version) => version.lessonId === draft.id);
  const revision = Math.max(0, ...previousVersions.map((version) => version.versionNo));
  if (revision !== expectedRevision) {
    throw new Error(`Revision conflict: expected ${expectedRevision}, current ${revision}.`);
  }
  const { id: lessonId, ...metadata } = draft;
  const version = {
    ...structuredClone(metadata),
    id: randomUUID(),
    lessonId,
    versionNo: revision + 1,
    publishedAt: new Date().toISOString(),
  };
  const pointer = { id: lessonId, publishedVersionId: version.id, visibility: "public" as const };
  return lessonCatalogSchema.parse({
    schemaVersion: 1,
    lessons: [...catalog.lessons.filter((lesson) => lesson.id !== lessonId), pointer],
    versions: [...catalog.versions, version],
  });
}

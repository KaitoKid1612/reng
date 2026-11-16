import "server-only";

import { z } from "zod";

import { buildGrammarLinks } from "@/lib/grammar-links";
import { listClassLessons, requireMembership } from "@/lib/server/classes";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";
import {
  createServiceClient,
  describeServiceFailure,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";
import { isPublicTeachingLesson, toPublicAnyLesson } from "@/lib/teaching-content";

import type { PublicLesson } from "@/lib/lesson-schema";

const grammarVersionSchema = z.object({ id: z.string(), first_grammar: z.unknown() });

// The open lessons of a class that explain grammar, in class order, read only by their first
// grammar point so a question bank (hundreds of questions, no grammar) is never downloaded.
export async function listClassGrammarLessons(userId: string, classId: string, now: Date) {
  const { classRow } = await requireMembership(userId, classId);
  const open = (await listClassLessons(classId)).filter(
    (lesson) => Date.parse(lesson.availableAt) <= now.getTime(),
  );
  if (!open.length) {
    return { classRow, lessons: open };
  }
  const rows = await selectRows(
    createServiceClient()
      .from("lesson_versions")
      .select("id, first_grammar:content->grammar->0")
      .in(
        "id",
        open.map((lesson) => lesson.versionId),
      ),
    grammarVersionSchema,
  );
  const withGrammar = new Set(
    rows
      .filter((row) => row.first_grammar !== null && row.first_grammar !== undefined)
      .map((row) => row.id),
  );
  return { classRow, lessons: open.filter((lesson) => withGrammar.has(lesson.versionId)) };
}

// Those lessons in full, as the learner may read them, with a link for each grammar point.
export async function loadClassGrammar(userId: string, classId: string, now: Date) {
  const { classRow, lessons: listed } = await listClassGrammarLessons(userId, classId, now);
  const versions = await Promise.all(
    listed.map((lesson) => loadAccessibleLessonVersion(lesson.lessonId, lesson.versionId, userId)),
  );
  const lessons = versions
    .flatMap((version) => (version ? [toPublicAnyLesson(version)] : []))
    .filter((lesson): lesson is PublicLesson => !isPublicTeachingLesson(lesson));
  return { classRow, lessons, links: buildGrammarLinks(lessons, classId) };
}

// For pages that only add links: a reader outside the class (a teacher's view) gets none, and a
// failed read leaves the page without links rather than without its results.
export async function findClassGrammarLinks(userId: string, classId: string, now: Date) {
  try {
    return (await loadClassGrammar(userId, classId, now)).links;
  } catch (error) {
    if (!(error instanceof ServiceError && error.code === "not_found")) {
      console.error("Class grammar links failed", classId, describeServiceFailure(error));
    }
    return {};
  }
}

// Whether to offer the class's grammar lookup; a failed read only hides the link.
export async function hasClassGrammar(userId: string, classId: string, now: Date) {
  try {
    return (await listClassGrammarLessons(userId, classId, now)).lessons.length > 0;
  } catch (error) {
    console.error("Class grammar lookup failed", classId, describeServiceFailure(error));
    return false;
  }
}

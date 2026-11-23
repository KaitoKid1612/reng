import "server-only";

import { z } from "zod";

import { buildGrammarLinks } from "@/lib/grammar-links";
import {
  listClassLessons,
  listOwnedLessons,
  listStudentClasses,
  requireMembership,
} from "@/lib/server/classes";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";
import {
  createServiceClient,
  describeServiceFailure,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";
import { isPublicTeachingLesson, toPublicAnyLesson } from "@/lib/teaching-content";

import type { GrammarSource } from "@/lib/grammar-search";
import type { PublicLesson } from "@/lib/lesson-schema";
import type { Account } from "@/lib/server/account";

const grammarVersionSchema = z.object({ id: z.string(), first_grammar: z.unknown() });

// Version ids among these that have at least one grammar point, read without the rest of the content.
async function versionsWithGrammar(versionIds: readonly string[]) {
  if (!versionIds.length) {
    return new Set<string>();
  }
  const rows = await selectRows(
    createServiceClient()
      .from("lesson_versions")
      .select("id, first_grammar:content->grammar->0")
      .in("id", [...versionIds]),
    grammarVersionSchema,
  );
  return new Set(
    rows
      .filter((row) => row.first_grammar !== null && row.first_grammar !== undefined)
      .map((row) => row.id),
  );
}

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
  const withGrammar = await versionsWithGrammar(open.map((lesson) => lesson.versionId));
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

interface GrammarLesson {
  lessonId: string;
  versionId: string;
  classId?: string;
}

// Everything a signed-in reader may look up outside one class: the open lessons of each class they
// learn in (newest class first, linked to that class) and, for a teacher, their own published
// lessons. A class whose read fails is left out rather than emptying the page.
export async function loadAccountGrammar(account: Account, now: Date): Promise<GrammarSource[]> {
  const classes = await listStudentClasses(account.id);
  const perClass = await Promise.all(
    classes.map((item) =>
      listClassGrammarLessons(account.id, item.id, now).then(
        ({ lessons }) =>
          lessons.map((lesson): GrammarLesson => ({
            lessonId: lesson.lessonId,
            versionId: lesson.versionId,
            classId: item.id,
          })),
        (error: unknown): GrammarLesson[] => {
          console.error("Class grammar lookup failed", item.id, describeServiceFailure(error));
          return [];
        },
      ),
    ),
  );
  const listed = perClass.flat();
  if (account.role === "teacher") {
    const owned = (await listOwnedLessons(account.id)).flatMap((lesson) =>
      lesson.publishedVersionId
        ? [{ lessonId: lesson.id, versionId: lesson.publishedVersionId }]
        : [],
    );
    const withGrammar = await versionsWithGrammar(owned.map((lesson) => lesson.versionId));
    listed.push(...owned.filter((lesson) => withGrammar.has(lesson.versionId)));
  }
  // A lesson in several classes (or also the teacher's own) is read once, from its first source.
  const seen = new Set<string>();
  const unique = listed.filter((lesson) => {
    if (seen.has(lesson.lessonId)) {
      return false;
    }
    seen.add(lesson.lessonId);
    return true;
  });
  const versions = await Promise.all(
    unique.map((lesson) =>
      loadAccessibleLessonVersion(lesson.lessonId, lesson.versionId, account.id),
    ),
  );
  return unique.flatMap((lesson, index) => {
    const version = versions[index];
    if (!version) {
      return [];
    }
    const publicLesson = toPublicAnyLesson(version);
    return isPublicTeachingLesson(publicLesson)
      ? []
      : [{ lesson: publicLesson, classId: lesson.classId }];
  });
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

import "server-only";

import { z } from "zod";

import { buildCourseMap, stageTag } from "@/lib/course-map";
import { listClassTaggedAnswers } from "@/lib/server/grammar-weak-points";
import { listReadLessonIds } from "@/lib/server/learner";
import { createServiceClient, selectRows } from "@/lib/server/supabase";

import type { TaughtLesson } from "@/lib/course-map";
import type { GrammarAnswer } from "@/lib/grammar-weak-points";
import type { ClassLesson } from "@/lib/server/classes";

// The class's teaching log: the newest session of each lesson, finished when it reached the last
// slide of the version taught.
async function listTaughtLessons(classId: string): Promise<TaughtLesson[]> {
  const service = createServiceClient();
  const sessions = await selectRows(
    service
      .from("class_sessions")
      .select("lesson_id, lesson_version_id, slide_reached")
      .eq("class_id", classId)
      .not("lesson_id", "is", null)
      .order("taught_on", { ascending: false })
      .order("created_at", { ascending: false }),
    z.object({
      lesson_id: z.string(),
      lesson_version_id: z.uuid(),
      slide_reached: z.number().int().nullable(),
    }),
  );
  const newest = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) {
    if (!newest.has(session.lesson_id)) {
      newest.set(session.lesson_id, session);
    }
  }
  if (!newest.size) {
    return [];
  }
  const versions = await selectRows(
    service
      .from("lesson_versions")
      .select("id, slides:content->slides")
      .in(
        "id",
        [...newest.values()].map((session) => session.lesson_version_id),
      ),
    z.object({ id: z.uuid(), slides: z.array(z.unknown()).catch([]) }),
  );
  const slideCount = new Map(versions.map((version) => [version.id, version.slides.length]));
  return [...newest.values()].map((session) => ({
    lessonId: session.lesson_id,
    isFinished:
      session.slide_reached !== null &&
      session.slide_reached >= (slideCount.get(session.lesson_version_id) ?? Infinity),
  }));
}

/**
 * The course map of one class for one learner, plus the month of answers it read, which the class
 * page also uses for its weak grammar points (one read instead of two).
 */
export async function loadCourseMap(
  userId: string,
  classId: string,
  lessons: readonly ClassLesson[],
  now: Date,
) {
  const stages = lessons
    .filter((lesson) => lesson.isCourseLesson)
    .map((lesson) => ({
      lessonId: lesson.lessonId,
      courseId: lesson.courseId,
      orderNo: lesson.orderNo,
      lessonOrder: lesson.lessonOrder,
      isOpen: Date.parse(lesson.availableAt) <= now.getTime(),
    }));
  const tags = new Set(stages.map((stage) => stageTag(stage.courseId, stage.lessonOrder)));
  const [readIds, taught, answers] = await Promise.all([
    listReadLessonIds(
      userId,
      stages.map((stage) => stage.lessonId),
    ),
    listTaughtLessons(classId),
    listClassTaggedAnswers(userId, classId, now, (questionTags) =>
      questionTags.some((tag) => tags.has(tag) || tag.startsWith("grammar:")),
    ),
  ]);
  return {
    stages: buildCourseMap(stages, readIds, taught, answers),
    answers: answers satisfies GrammarAnswer[],
  };
}

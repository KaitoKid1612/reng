import "server-only";

import { z } from "zod";

import { FEEDBACK_POLICIES } from "@/lib/assignment";
import { toVietnamDate } from "@/lib/daily-practice";
import {
  composeJlptExam,
  fixedJlptExam,
  isOfficialTest,
  JLPT_LEVELS,
  MAX_EXAM_MINUTES,
  MIN_EXAM_MINUTES,
  officialTestLevel,
} from "@/lib/jlpt";
import { listAssignmentExams } from "@/lib/server/assignment-exams";
import { listAssignablePracticeQuestions } from "@/lib/server/assignments";
import { getTeacherClass } from "@/lib/server/classes";
import {
  callRpc,
  createServiceClient,
  selectEveryPageIn,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";

import type { DailyQuestionUse } from "@/lib/daily-practice";

export const publishJlptExamSchema = z.object({
  classId: z.uuid(),
  lessonId: z.string().trim().min(1).max(100),
  level: z.enum(JLPT_LEVELS),
  title: z.string().trim().min(1).max(160),
  dueAt: z.iso.datetime({ offset: true }),
  timeLimitMinutes: z.number().int().min(MIN_EXAM_MINUTES).max(MAX_EXAM_MINUTES),
  feedbackPolicy: z.enum(FEEDBACK_POLICIES),
});

export type PublishJlptExamInput = z.infer<typeof publishJlptExamSchema>;

// Earlier exams of the class, newest first; enough to rotate a bank of a few hundred questions.
const RECENT_EXAMS = 30;

/** The questions of the class's earlier mock exams, so a new exam prefers unseen questions. */
export async function listRecentExamUses(classId: string): Promise<DailyQuestionUse[]> {
  const tests = await selectRows(
    createServiceClient()
      .from("assignments")
      .select("id, published_at")
      .eq("class_id", classId)
      .eq("mode", "test")
      .neq("status", "draft")
      .order("published_at", { ascending: false })
      .limit(RECENT_EXAMS * 4),
    z.object({ id: z.uuid(), published_at: z.iso.datetime({ offset: true }) }),
  );
  const exams = await listAssignmentExams(tests.map((test) => test.id));
  const recent = tests.filter((test) => exams.has(test.id)).slice(0, RECENT_EXAMS);
  if (!recent.length) {
    return [];
  }
  // Thirty exams of 67–85 questions pass the API's 1000-row page, so the items are read in pages.
  const items = await selectEveryPageIn(
    recent.map((test) => test.id),
    (chunk, from, to) =>
      createServiceClient()
        .from("assignment_items")
        .select("assignment_id, question_id")
        .in("assignment_id", chunk)
        .order("assignment_id")
        .order("position")
        .range(from, to),
    z.object({ assignment_id: z.uuid(), question_id: z.string() }),
  );
  const days = new Map(recent.map((test) => [test.id, toVietnamDate(new Date(test.published_at))]));
  return items.map((item) => ({
    questionId: item.question_id,
    practiceDate: days.get(item.assignment_id) ?? "",
  }));
}

/**
 * Gives a JLPT mock exam to the teacher's Japanese class: questions of the lesson the class pins
 * (a review bank), the level's share of each section, one attempt with a time limit.
 */
export async function publishJlptExam(
  teacherId: string,
  input: PublishJlptExamInput,
  // A fixed exam (Đề thi thử Reng N5 số 1…) names its questions instead of composing them.
  fixedQuestionIds?: readonly string[],
  // A library exam composes from a known seed, so its print before opening matches it.
  seed = `${input.classId}:${new Date().toISOString()}`,
) {
  const classRow = await getTeacherClass(teacherId, input.classId);
  if (classRow.language_tag !== "ja-JP") {
    throw new ServiceError("not_japanese");
  }
  const [questions, recentUses] = await Promise.all([
    listAssignablePracticeQuestions(input.classId, input.lessonId),
    listRecentExamUses(input.classId),
  ]);
  // An official workbook test keeps the level it was written for: its time and pass mark.
  if (isOfficialTest(questions) && officialTestLevel(questions) !== input.level) {
    throw new ServiceError("official_level");
  }
  const candidates = questions.map((question) => ({
    id: question.id,
    type: question.type,
    tags: question.tags,
    passage: question.passage ?? null,
  }));
  const composition = fixedQuestionIds
    ? fixedJlptExam(candidates, fixedQuestionIds)
    : composeJlptExam(candidates, recentUses, input.level, seed);
  if (!composition.questionIds.length) {
    throw new ServiceError("no_exam_questions");
  }
  const assignmentId = await callRpc(
    "publish_jlpt_mock_exam",
    {
      p_teacher_id: teacherId,
      p_class_id: input.classId,
      p_lesson_id: input.lessonId,
      p_title: input.title,
      p_level: input.level,
      p_due_at: input.dueAt,
      p_time_limit_minutes: input.timeLimitMinutes,
      p_feedback_policy: input.feedbackPolicy,
      p_question_ids: composition.questionIds,
    },
    z.uuid(),
  );
  return { assignmentId, counts: composition.counts };
}

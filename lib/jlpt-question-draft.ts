import { z } from "zod";

import { parseAssignableQuestion } from "@/lib/assignment";
import { JLPT_LEVELS, jlptSectionOf } from "@/lib/jlpt";
import { findFuriganaProblems } from "@/lib/lesson-draft";
import { lessonContentSchema } from "@/lib/lesson-schema";
import { formatStudyDay } from "@/lib/study-days";

import type { JlptLevel } from "@/lib/jlpt";
import type { LessonContent } from "@/lib/lesson-schema";

// Reng's own JLPT practice questions (content/jlpt/<level>-original-question-draft.json), kept
// as drafts until someone reviews the Japanese. Official exam questions and audio never go into
// these files: content/jlpt/source-registry.json lists that material as links until its rights
// are cleared. `npm run jlpt:drafts` turns each draft into lesson content in
// content/jlpt/generated/; nothing reaches learners before a teacher publishes it.

const text = z.string().trim().min(1);

const draftQuestionSchema = z
  .object({
    id: z.string(),
    type: z.literal("choice"),
    prompt: text,
    options: z.array(text).min(2).max(6),
    // One zero-based option index: a mock exam question has a single right answer.
    answer: z.tuple([z.number().int().nonnegative()]),
    multiple: z.literal(false),
    points: z.number().int().min(1).max(100),
    // One tag naming the exam section the question practises, read by jlptSectionOf.
    tags: z.tuple([text]),
    // The Vietnamese explanation learners read after answering.
    explain: text,
  })
  .strict();

export const jlptQuestionDraftSchema = z
  .object({
    schemaVersion: z.literal(1),
    level: z.enum(JLPT_LEVELS),
    status: z.literal("draft"),
    origin: z.literal("original"),
    rights: text,
    // A person who reads Japanese checks wording, the single right answer and the level.
    reviewStatus: z.enum(["needs-japanese-review", "reviewed"]),
    reviewedAt: z.iso.date().optional(),
    questions: z.array(draftQuestionSchema).min(1),
  })
  .strict()
  .superRefine((draft, context) => {
    if ((draft.reviewStatus === "reviewed") !== Boolean(draft.reviewedAt)) {
      context.addIssue({
        code: "custom",
        path: ["reviewedAt"],
        message: "A reviewed draft records its review date (reviewedAt), and only a reviewed one.",
      });
    }
    const prefix = `jlpt-${draft.level.toLowerCase()}-`;
    const seenIds = new Set<string>();
    draft.questions.forEach((question, index) => {
      const path = ["questions", index];
      if (!question.id.startsWith(prefix) || seenIds.has(question.id)) {
        context.addIssue({
          code: "custom",
          path: [...path, "id"],
          message: `Question IDs start with ${prefix} and are unique: ${question.id}.`,
        });
      }
      seenIds.add(question.id);
      if (new Set(question.options).size !== question.options.length) {
        context.addIssue({
          code: "custom",
          path: [...path, "options"],
          message: `${question.id} repeats an option.`,
        });
      }
      if (question.answer[0] >= question.options.length) {
        context.addIssue({
          code: "custom",
          path: [...path, "answer"],
          message: `${question.id} answers an option that does not exist.`,
        });
      }
      // A question outside every section would never be drawn into a mock exam.
      if (!jlptSectionOf(question)) {
        context.addIssue({
          code: "custom",
          path: [...path, "tags"],
          message: `${question.id} has no JLPT section tag such as kanji, vocabulary, grammar or reading.`,
        });
      }
    });
  });

export type JlptQuestionDraft = z.infer<typeof jlptQuestionDraftSchema>;

export function jlptDraftFileNames(level: JlptLevel) {
  const name = level.toLowerCase();
  return {
    source: `content/jlpt/${name}-original-question-draft.json`,
    generated: `content/jlpt/generated/${name}-lesson-content-draft.json`,
  };
}

function describeReview(draft: JlptQuestionDraft) {
  return draft.reviewedAt
    ? `Bộ câu hỏi gốc của Reng theo dạng đề JLPT ${draft.level}, đã duyệt tiếng Nhật ngày ${formatStudyDay(draft.reviewedAt)}.`
    : "Bộ câu hỏi gốc đang chờ kiểm duyệt. Không xuất bản cho học viên trước khi kiểm tra nội dung.";
}

/**
 * Lesson content for a draft: a note slide saying whether it has been reviewed, then the
 * questions as written. Throws when the result would not pass the lesson schema, would be refused
 * for its furigana when published as a review bank, or could not be assigned.
 */
export function buildJlptDraftLesson(draft: JlptQuestionDraft): LessonContent {
  const level = draft.level.toLowerCase();
  const content: LessonContent = {
    schemaVersion: 1,
    vocab: [],
    grammar: [],
    slides: [
      {
        id: `jlpt-${level}-intro`,
        type: "note",
        title: `JLPT ${draft.level} – Bài luyện tập nháp`,
        body: describeReview(draft),
      },
    ],
    questions: draft.questions,
  };
  // The parsed copy would reorder keys, so the file keeps the draft's own order.
  lessonContentSchema.parse(content);
  const furiganaProblems = findFuriganaProblems(content.questions);
  if (furiganaProblems.length) {
    throw new Error(furiganaProblems.map((problem) => problem.message).join("\n"));
  }
  content.questions.forEach((question) => parseAssignableQuestion(question));
  return content;
}

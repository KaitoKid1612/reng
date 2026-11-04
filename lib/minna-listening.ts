import minnaListening from "@/content/listening/minna-1-15.json";
import { draftContentSchema } from "@/lib/lesson-draft";

import type { DraftQuestion } from "@/lib/lesson-draft";

// Listening questions written for Minna no Nihongo lessons 1–15, six per lesson, each tagged
// minna:N with its audio already made and served with the web. A teacher adds a lesson's set to
// that lesson, so the questions belong to it: assignments, daily practice and its listening page.
const questions = draftContentSchema.parse(minnaListening.content).questions;

export function minnaLessonOf(question: Pick<DraftQuestion, "tags">) {
  const tag = question.tags.find((item) => /^minna:\d+$/.test(item));
  return tag ? Number(tag.slice("minna:".length)) : null;
}

export const MINNA_LISTENING_LESSONS = [
  ...new Set(questions.map(minnaLessonOf).filter((lesson) => lesson !== null)),
].sort((first, second) => first - second);

// Inside its own lesson a question needs no "(Bài N)" label; the tag keeps the link.
export function minnaListeningQuestions(lesson: number): DraftQuestion[] {
  return questions
    .filter((question) => minnaLessonOf(question) === lesson)
    .map((question) => ({
      ...question,
      prompt: question.prompt.replace(/^\(Bài \d+\)\s*/, ""),
    }));
}

// "Bài 3 – Nơi chốn và mua sắm" is lesson 3; other titles leave the choice to the teacher.
export function guessMinnaLesson(title: string) {
  const lesson = Number(/^Bài\s+(\d+)/.exec(title.trim())?.[1]);
  return MINNA_LISTENING_LESSONS.includes(lesson) ? lesson : null;
}

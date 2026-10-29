import minnaLesson11 from "@/content/starters/minna-1-11.json";
import { lessonDraftSchema } from "@/lib/lesson-schema";

import type { LessonDraft } from "@/lib/lesson-schema";

export interface StarterLesson {
  id: string;
  course: string;
  buttonLabel: string;
  draft: LessonDraft;
}

// Lessons written for Reng that follow a textbook's lesson order without copying its text.
// A teacher always gets an own draft to review, edit and publish.
export const STARTER_LESSONS: readonly StarterLesson[] = [
  {
    id: "minna-1-11",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 11 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson11),
  },
];

export function findStarterLesson(id: string) {
  return STARTER_LESSONS.find((starter) => starter.id === id);
}

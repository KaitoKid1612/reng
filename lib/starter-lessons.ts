import minnaLesson01 from "@/content/starters/minna-1-01.json";
import minnaLesson02 from "@/content/starters/minna-1-02.json";
import minnaLesson11 from "@/content/starters/minna-1-11.json";
import minnaLesson12 from "@/content/starters/minna-1-12.json";
import minnaLesson13 from "@/content/starters/minna-1-13.json";
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
    id: "minna-1-01",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 1 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson01),
  },
  {
    id: "minna-1-02",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 2 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson02),
  },
  {
    id: "minna-1-11",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 11 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson11),
  },
  {
    id: "minna-1-12",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 12 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson12),
  },
  {
    id: "minna-1-13",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 13 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson13),
  },
];

export function findStarterLesson(id: string) {
  return STARTER_LESSONS.find((starter) => starter.id === id);
}

const STARTER_FINGERPRINT = "starter:";

// A lesson made from a starter keeps the fingerprint of that copy request.
export function findStarterForLesson(creationFingerprint: string | null) {
  if (!creationFingerprint?.startsWith(STARTER_FINGERPRINT)) {
    return undefined;
  }
  return findStarterLesson(creationFingerprint.slice(STARTER_FINGERPRINT.length));
}

interface LessonContentShape {
  vocab: readonly { image?: string }[];
  slides: readonly { type: string }[];
  questions: readonly unknown[];
}

export interface LessonContentSummary {
  slides: number;
  questions: number;
  pictures: number;
}

// Counts what a teacher compares before replacing a draft with the latest starter: pictures are
// vocabulary pictures, title pictures and picture slides.
export function summarizeLessonContent(content: LessonContentShape): LessonContentSummary {
  const pictureSlides = content.slides.filter(
    (slide) =>
      slide.type === "image" ||
      (slide.type === "title" && "image" in slide && Boolean(slide.image)),
  ).length;
  return {
    slides: content.slides.length,
    questions: content.questions.length,
    pictures: content.vocab.filter((item) => Boolean(item.image)).length + pictureSlides,
  };
}

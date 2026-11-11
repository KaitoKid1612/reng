import minnaLesson01 from "@/content/starters/minna-1-01.json";
import minnaLesson02 from "@/content/starters/minna-1-02.json";
import minnaLesson03 from "@/content/starters/minna-1-03.json";
import minnaLesson04 from "@/content/starters/minna-1-04.json";
import minnaLesson05 from "@/content/starters/minna-1-05.json";
import minnaLesson06 from "@/content/starters/minna-1-06.json";
import minnaLesson07 from "@/content/starters/minna-1-07.json";
import minnaLesson08 from "@/content/starters/minna-1-08.json";
import minnaLesson09 from "@/content/starters/minna-1-09.json";
import minnaLesson10 from "@/content/starters/minna-1-10.json";
import minnaLesson11 from "@/content/starters/minna-1-11.json";
import minnaLesson12 from "@/content/starters/minna-1-12.json";
import minnaLesson13 from "@/content/starters/minna-1-13.json";
import minnaLesson14 from "@/content/starters/minna-1-14.json";
import minnaLesson15 from "@/content/starters/minna-1-15.json";
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
    id: "minna-1-03",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 3 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson03),
  },
  {
    id: "minna-1-04",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 4 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson04),
  },
  {
    id: "minna-1-05",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 5 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson05),
  },
  {
    id: "minna-1-06",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 6 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson06),
  },
  {
    id: "minna-1-07",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 7 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson07),
  },
  {
    id: "minna-1-08",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 8 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson08),
  },
  {
    id: "minna-1-09",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 9 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson09),
  },
  {
    id: "minna-1-10",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 10 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson10),
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
  {
    id: "minna-1-14",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 14 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson14),
  },
  {
    id: "minna-1-15",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 15 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson15),
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

interface ComparableContent {
  vocab: readonly { image?: string }[];
  grammar: readonly unknown[];
  slides: readonly { type: string }[];
  questions: readonly unknown[];
}

const COMPARED_SECTIONS = [
  ["vocab", "Từ vựng"],
  ["grammar", "Mẫu câu"],
  ["slides", "Slide"],
  ["questions", "Câu luyện"],
] as const;

export interface SectionComparison {
  label: string;
  draftCount: number;
  starterCount: number;
  isSame: boolean;
}

// Postgres jsonb keeps object keys in its own order, so content is compared by value, not text.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    // Default sort compares UTF-16 code units: one fixed order on both sides is all that matters.
    const fields = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
    return `{${fields.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

// Starters gained pictures after teachers had copied them: vocabulary pictures, title pictures and
// picture slides.
function pictures(content: ComparableContent) {
  return [
    ...content.vocab.flatMap((item) => (item.image ? [item.image] : [])),
    ...content.slides.filter(
      (slide) =>
        slide.type === "image" ||
        (slide.type === "title" && "image" in slide && Boolean(slide.image)),
    ),
  ];
}

function compareSection(label: string, draft: readonly unknown[], starter: readonly unknown[]) {
  return {
    label,
    draftCount: draft.length,
    starterCount: starter.length,
    isSame: canonicalJson(draft) === canonicalJson(starter),
  };
}

// What a teacher reads before replacing a draft with the latest starter: each part of the lesson,
// its size on both sides and whether it already matches.
export function compareWithStarter(
  draft: ComparableContent,
  starter: ComparableContent,
): SectionComparison[] {
  return [
    ...COMPARED_SECTIONS.map(([key, label]) => compareSection(label, draft[key], starter[key])),
    compareSection("Hình minh họa", pictures(draft), pictures(starter)),
  ];
}

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
import minnaLesson16 from "@/content/starters/minna-1-16.json";
import minnaLesson17 from "@/content/starters/minna-1-17.json";
import minnaLesson18 from "@/content/starters/minna-1-18.json";
import minnaLesson19 from "@/content/starters/minna-1-19.json";
import minnaLesson20 from "@/content/starters/minna-1-20.json";
import minnaLesson21 from "@/content/starters/minna-1-21.json";
import minnaLesson22 from "@/content/starters/minna-1-22.json";
import minnaLesson23 from "@/content/starters/minna-1-23.json";
import minnaLesson24 from "@/content/starters/minna-1-24.json";
import minnaLesson25 from "@/content/starters/minna-1-25.json";
import minnaLesson26 from "@/content/starters/minna-2-26.json";
import minnaLesson27 from "@/content/starters/minna-2-27.json";
import minnaLesson28 from "@/content/starters/minna-2-28.json";
import minnaLesson29 from "@/content/starters/minna-2-29.json";
import minnaLesson30 from "@/content/starters/minna-2-30.json";
import minnaLesson31 from "@/content/starters/minna-2-31.json";
import minnaLesson32 from "@/content/starters/minna-2-32.json";
import minnaLesson33 from "@/content/starters/minna-2-33.json";
import minnaLesson34 from "@/content/starters/minna-2-34.json";
import minnaLesson35 from "@/content/starters/minna-2-35.json";
import minnaLesson36 from "@/content/starters/minna-2-36.json";
import minnaLesson37 from "@/content/starters/minna-2-37.json";
import minnaLesson38 from "@/content/starters/minna-2-38.json";
import minnaLesson39 from "@/content/starters/minna-2-39.json";
import minnaLesson40 from "@/content/starters/minna-2-40.json";
import minnaLesson41 from "@/content/starters/minna-2-41.json";
import minnaLesson42 from "@/content/starters/minna-2-42.json";
import minnaLesson43 from "@/content/starters/minna-2-43.json";
import minnaLesson44 from "@/content/starters/minna-2-44.json";
import minnaLesson45 from "@/content/starters/minna-2-45.json";
import minnaLesson46 from "@/content/starters/minna-2-46.json";
import minnaLesson47 from "@/content/starters/minna-2-47.json";
import minnaLesson48 from "@/content/starters/minna-2-48.json";
import minnaLesson49 from "@/content/starters/minna-2-49.json";
import minnaLesson50 from "@/content/starters/minna-2-50.json";
import n4GrammarMap from "@/content/starters/n4-grammar-map.json";
import n4Grammar1 from "@/content/starters/n4-grammar-1.json";
import n4Grammar2 from "@/content/starters/n4-grammar-2.json";
import n4Grammar3 from "@/content/starters/n4-grammar-3.json";
import n4Grammar4 from "@/content/starters/n4-grammar-4.json";
import n4Grammar5 from "@/content/starters/n4-grammar-5.json";
import n4Grammar6 from "@/content/starters/n4-grammar-6.json";
import n4Grammar7 from "@/content/starters/n4-grammar-7.json";
import n4Grammar8 from "@/content/starters/n4-grammar-8.json";
import n4Tips1 from "@/content/starters/n4-tips-1.json";
import n4Tips2 from "@/content/starters/n4-tips-2.json";
import n4Tips3 from "@/content/starters/n4-tips-3.json";
import n4Tips4 from "@/content/starters/n4-tips-4.json";
import n4Tips5 from "@/content/starters/n4-tips-5.json";
import n4Tips6 from "@/content/starters/n4-tips-6.json";
import n4Tips7 from "@/content/starters/n4-tips-7.json";
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
  {
    id: "minna-1-16",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 16 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson16),
  },
  {
    id: "minna-1-17",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 17 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson17),
  },
  {
    id: "minna-1-18",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 18 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson18),
  },
  {
    id: "minna-1-19",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 19 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson19),
  },
  {
    id: "minna-1-20",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 20 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson20),
  },
  {
    id: "minna-1-21",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 21 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson21),
  },
  {
    id: "minna-1-22",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 22 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson22),
  },
  {
    id: "minna-1-23",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 23 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson23),
  },
  {
    id: "minna-1-24",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 24 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson24),
  },
  {
    id: "minna-1-25",
    course: "Minna no Nihongo Sơ cấp I",
    buttonLabel: "Tạo bài 25 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson25),
  },
  {
    id: "minna-2-26",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 26 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson26),
  },
  {
    id: "minna-2-27",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 27 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson27),
  },
  {
    id: "minna-2-28",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 28 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson28),
  },
  {
    id: "minna-2-29",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 29 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson29),
  },
  {
    id: "minna-2-30",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 30 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson30),
  },
  {
    id: "minna-2-31",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 31 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson31),
  },
  {
    id: "minna-2-32",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 32 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson32),
  },
  {
    id: "minna-2-33",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 33 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson33),
  },
  {
    id: "minna-2-34",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 34 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson34),
  },
  {
    id: "minna-2-35",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 35 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson35),
  },
  {
    id: "minna-2-36",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 36 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson36),
  },
  {
    id: "minna-2-37",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 37 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson37),
  },
  {
    id: "minna-2-38",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 38 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson38),
  },
  {
    id: "minna-2-39",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 39 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson39),
  },
  {
    id: "minna-2-40",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 40 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson40),
  },
  {
    id: "minna-2-41",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 41 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson41),
  },
  {
    id: "minna-2-42",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 42 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson42),
  },
  {
    id: "minna-2-43",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 43 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson43),
  },
  {
    id: "minna-2-44",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 44 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson44),
  },
  {
    id: "minna-2-45",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 45 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson45),
  },
  {
    id: "minna-2-46",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 46 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson46),
  },
  {
    id: "minna-2-47",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 47 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson47),
  },
  {
    id: "minna-2-48",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 48 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson48),
  },
  {
    id: "minna-2-49",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 49 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson49),
  },
  {
    id: "minna-2-50",
    course: "Minna no Nihongo Sơ cấp II",
    buttonLabel: "Tạo bài 50 từ mẫu",
    draft: lessonDraftSchema.parse(minnaLesson50),
  },
  {
    id: "n4-grammar-map",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo bản đồ ngữ pháp N4",
    draft: lessonDraftSchema.parse(n4GrammarMap),
  },
  {
    id: "n4-grammar-1",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 1",
    draft: lessonDraftSchema.parse(n4Grammar1),
  },
  {
    id: "n4-grammar-2",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 2",
    draft: lessonDraftSchema.parse(n4Grammar2),
  },
  {
    id: "n4-grammar-3",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 3",
    draft: lessonDraftSchema.parse(n4Grammar3),
  },
  {
    id: "n4-grammar-4",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 4",
    draft: lessonDraftSchema.parse(n4Grammar4),
  },
  {
    id: "n4-grammar-5",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 5",
    draft: lessonDraftSchema.parse(n4Grammar5),
  },
  {
    id: "n4-grammar-6",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 6",
    draft: lessonDraftSchema.parse(n4Grammar6),
  },
  {
    id: "n4-grammar-7",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 7",
    draft: lessonDraftSchema.parse(n4Grammar7),
  },
  {
    id: "n4-grammar-8",
    course: "Tổng ôn ngữ pháp N4",
    buttonLabel: "Tạo tổng ôn N4 · 8",
    draft: lessonDraftSchema.parse(n4Grammar8),
  },
  {
    id: "n4-tips-1",
    course: "Mẹo học và thi JLPT N4",
    buttonLabel: "Tạo mẹo N4 · 1",
    draft: lessonDraftSchema.parse(n4Tips1),
  },
  {
    id: "n4-tips-2",
    course: "Mẹo học và thi JLPT N4",
    buttonLabel: "Tạo mẹo N4 · 2",
    draft: lessonDraftSchema.parse(n4Tips2),
  },
  {
    id: "n4-tips-3",
    course: "Mẹo học và thi JLPT N4",
    buttonLabel: "Tạo mẹo N4 · 3",
    draft: lessonDraftSchema.parse(n4Tips3),
  },
  {
    id: "n4-tips-4",
    course: "Mẹo học và thi JLPT N4",
    buttonLabel: "Tạo mẹo N4 · 4",
    draft: lessonDraftSchema.parse(n4Tips4),
  },
  {
    id: "n4-tips-5",
    course: "Mẹo học và thi JLPT N4",
    buttonLabel: "Tạo mẹo N4 · 5",
    draft: lessonDraftSchema.parse(n4Tips5),
  },
  {
    id: "n4-tips-6",
    course: "Mẹo học và thi JLPT N4",
    buttonLabel: "Tạo mẹo N4 · 6",
    draft: lessonDraftSchema.parse(n4Tips6),
  },
  {
    id: "n4-tips-7",
    course: "Mẹo học và thi JLPT N4",
    buttonLabel: "Tạo mẹo N4 · 7",
    draft: lessonDraftSchema.parse(n4Tips7),
  },
];

// The new-lesson page lists each course in its own section; Minna Sơ cấp I and II run as one list.
export const MINNA_STARTERS = STARTER_LESSONS.filter((starter) =>
  ["minna-1", "minna-2"].includes(starter.draft.courseId),
);
export const N4_REVIEW_STARTERS = STARTER_LESSONS.filter(
  (starter) => starter.draft.courseId === "n4-grammar",
);
export const N4_TIPS_STARTERS = STARTER_LESSONS.filter(
  (starter) => starter.draft.courseId === "n4-tips",
);

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

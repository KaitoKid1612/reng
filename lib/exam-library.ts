import { isOfficialTest, JLPT_LEVELS, officialTestLevel } from "@/lib/jlpt";
import { jlptPartOf, jlptTestParts } from "@/lib/jlpt-parts";

import type { JlptExamCandidate, JlptLevel } from "@/lib/jlpt";

// The exam library of a class (the "Luyện đề" page): the lessons a class pins that make whole
// JLPT mock exams. An official workbook test is one exam; a bank written in the test's parts makes
// as many exams as its scarcest part allows, and the class's earlier exams use some of it up.
export type ExamSource =
  | {
      kind: "official";
      lessonId: string;
      lessonTitle: string;
      level: JlptLevel;
      year: number | null;
    }
  | {
      kind: "bank";
      lessonId: string;
      lessonTitle: string;
      level: JlptLevel;
      // A bank of exam sets says which kind it holds (tag reng-exam:standard / reng-exam:advanced).
      variant: ExamVariant | null;
      // Whole exams the bank fills, and those left without repeating a question already asked in
      // an earlier exam of the class.
      totalExams: number;
      remainingExams: number;
    }
  | {
      // A fixed Reng mock exam (lib/jlpt-exam-sets.ts) whose questions the pinned bank holds.
      kind: "fixed";
      lessonId: string;
      lessonTitle: string;
      level: JlptLevel;
      setId: string;
      title: string;
      questionCount: number;
    };

const OFFICIAL_YEAR = /^official:jlpt-(\d{4})$/u;

export const EXAM_VARIANTS = ["standard", "advanced"] as const;
export type ExamVariant = (typeof EXAM_VARIANTS)[number];
const VARIANT_LABELS: Record<ExamVariant, string> = { standard: "chuẩn", advanced: "nâng cao" };

/** The kind of exam set most of a bank's questions are tagged with, if any. */
function variantOf(questions: readonly JlptExamCandidate[]): ExamVariant | null {
  for (const variant of EXAM_VARIANTS) {
    const tagged = questions.filter((question) => question.tags.includes(`reng-exam:${variant}`));
    if (tagged.length > questions.length / 2) {
      return variant;
    }
  }
  return null;
}

function hasLevel(tags: readonly string[], level: JlptLevel) {
  const lower = level.toLowerCase();
  return tags.some((tag) => {
    const value = tag.trim().toLowerCase();
    return value === lower || value === `jlpt:${lower}`;
  });
}

/** How many whole exams of a level the questions fill, counting all of them or only `unused`. */
export function countBankExams(
  questions: readonly JlptExamCandidate[],
  level: JlptLevel,
  used: ReadonlySet<string> = new Set(),
) {
  const counts = new Map<string, { all: number; unused: number }>();
  for (const question of questions) {
    const part = jlptPartOf(question);
    if (!part || !hasLevel(question.tags, level)) {
      continue;
    }
    const entry = counts.get(part.tag) ?? { all: 0, unused: 0 };
    entry.all += 1;
    if (!used.has(question.id)) {
      entry.unused += 1;
    }
    counts.set(part.tag, entry);
  }
  let total = Infinity;
  let remaining = Infinity;
  for (const { part, count } of jlptTestParts(level)) {
    const entry = counts.get(part.tag) ?? { all: 0, unused: 0 };
    total = Math.min(total, Math.floor(entry.all / count));
    remaining = Math.min(remaining, Math.floor(entry.unused / count));
  }
  return { total, remaining };
}

/**
 * What a pinned lesson offers to the exam library, or null when it makes no whole exam (a lesson,
 * a bank written by Minna lesson, a bank short of a part).
 */
export function describeExamSource(
  lessonId: string,
  lessonTitle: string,
  questions: readonly JlptExamCandidate[],
  used: ReadonlySet<string> = new Set(),
): ExamSource | null {
  if (!questions.length) {
    return null;
  }
  if (isOfficialTest(questions)) {
    const level = officialTestLevel(questions);
    if (!level) {
      return null;
    }
    const yearTag = questions[0].tags.map((tag) => OFFICIAL_YEAR.exec(tag)).find(Boolean);
    return {
      kind: "official",
      lessonId,
      lessonTitle,
      level,
      year: yearTag ? Number(yearTag[1]) : null,
    };
  }
  // N4 first: an N4 bank also holds every N5 part, but its questions carry the N4 tag.
  for (const level of [...JLPT_LEVELS].reverse()) {
    const { total, remaining } = countBankExams(questions, level, used);
    if (total >= 1) {
      return {
        kind: "bank",
        lessonId,
        lessonTitle,
        level,
        variant: variantOf(questions),
        totalExams: total,
        remainingExams: remaining,
      };
    }
  }
  return null;
}

/** The title an exam opened from the library gets, numbering Reng's exams per level. */
export function examTitleFor(source: ExamSource, earlierFromSource: number) {
  if (source.kind === "fixed") {
    return source.title;
  }
  if (source.kind === "official") {
    return `Đề chính thức JLPT ${source.level}${source.year ? ` (${source.year})` : ""}`;
  }
  const variant = source.variant ? ` ${VARIANT_LABELS[source.variant]}` : "";
  return `Đề Reng ${source.level}${variant} số ${earlierFromSource + 1}`;
}

interface FixedExamSet {
  id: string;
  level: JlptLevel;
  title: string;
  questions: readonly { id: string }[];
}

/** The fixed Reng exams a pinned lesson holds every question of, so the class can open them. */
export function describeFixedExamSources(
  lessonId: string,
  lessonTitle: string,
  questionIds: ReadonlySet<string>,
  sets: readonly FixedExamSet[],
): ExamSource[] {
  return sets
    .filter((set) => set.questions.every((question) => questionIds.has(question.id)))
    .map((set) => ({
      kind: "fixed",
      lessonId,
      lessonTitle,
      level: set.level,
      setId: set.id,
      title: set.title,
      questionCount: set.questions.length,
    }));
}

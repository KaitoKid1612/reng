import { z } from "zod";

import officialN42012 from "@/content/jlpt/official/n4-2012.json";
import officialN42018 from "@/content/jlpt/official/n4-2018.json";
import officialN52012 from "@/content/jlpt/official/n5-2012.json";
import officialN52018 from "@/content/jlpt/official/n5-2018.json";
import rengExamSets from "@/content/jlpt/reng-exam-sets.json";
import n4StandardBank from "@/content/review-banks/n4-jlpt-mock-standard.json";
import n5MockBank from "@/content/review-banks/n5-jlpt-mock.json";
import { isOfficialTest, JLPT_LEVELS } from "@/lib/jlpt";
import { JLPT_OFFICIAL_CREDIT } from "@/lib/jlpt-official";
import { JLPT_TEST_FILES } from "@/lib/jlpt-tests";
import { questionSchema } from "@/lib/lesson-schema";

import type { JlptLevel } from "@/lib/jlpt";
import type { LessonQuestion } from "@/lib/lesson-schema";

// The whole JLPT exams Reng can print, per level in the order a class meets them: the two
// official workbook tests (2018, 2012), the whole tests the owner supplied (content/jlpt/tests/,
// newest last), then Reng's fixed mock exams. A fixed mock exam names its questions in
// content/jlpt/reng-exam-sets.json and keeps the bank's question ids, so a class that opens it uses
// those questions up like any exam from the same bank.
export type JlptExamSetKind = "official" | "test" | "reng";

const KIND_ORDER: readonly JlptExamSetKind[] = ["official", "test", "reng"];

export interface JlptExamSet {
  id: string;
  kind: JlptExamSetKind;
  level: JlptLevel;
  title: string;
  year: number | null;
  // The bank lesson a fixed mock exam takes its questions from; null for an official test.
  bankLessonId: string | null;
  questions: LessonQuestion[];
}

const bankFileSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.object({ questions: z.array(questionSchema) }),
});

const fixedExamSchema = z
  .object({
    id: z.string().regex(/^reng-n[45]-\d+$/),
    title: z.string().min(1),
    level: z.enum(JLPT_LEVELS),
    bank: z.string(),
    questionIds: z.array(z.string()).min(1),
  })
  .strict();

export const rengExamSetsSchema = z
  .object({ schemaVersion: z.literal(1), exams: z.array(fixedExamSchema) })
  .strict();

const BANKS = new Map(
  [
    ["n5-jlpt-mock", n5MockBank],
    ["n4-jlpt-mock-standard", n4StandardBank],
  ].map(([name, file]) => [name as string, bankFileSchema.parse(file)]),
);

const OFFICIAL_TESTS = [
  { level: "N5", year: 2018, file: officialN52018 },
  { level: "N5", year: 2012, file: officialN52012 },
  { level: "N4", year: 2018, file: officialN42018 },
  { level: "N4", year: 2012, file: officialN42012 },
] as const;

function officialSets(): JlptExamSet[] {
  return OFFICIAL_TESTS.map(({ level, year, file }) => {
    const parsed = bankFileSchema.parse(file);
    return {
      id: `${level.toLowerCase()}-${year}`,
      kind: "official",
      level,
      title: parsed.title,
      year,
      bankLessonId: null,
      questions: parsed.content.questions,
    };
  });
}

// A supplied test prints by the id of its file without the "jlpt-" prefix (n4-2025-07), the same
// id its questions carry in their official:<id> tag.
function testSets(): JlptExamSet[] {
  return JLPT_TEST_FILES.map((file) => {
    const parsed = bankFileSchema.parse(file);
    const level = /^jlpt-(n[45])-/.exec(parsed.id)?.[1].toUpperCase();
    if (level !== "N4" && level !== "N5") {
      throw new Error(`Whole test ${parsed.id} does not name its level`);
    }
    return {
      id: parsed.id.slice("jlpt-".length),
      kind: "test",
      level,
      title: parsed.title,
      year: null,
      bankLessonId: null,
      questions: parsed.content.questions,
    };
  });
}

function fixedSets(): JlptExamSet[] {
  return rengExamSetsSchema.parse(rengExamSets).exams.map((exam) => {
    const bank = BANKS.get(exam.bank);
    if (!bank) {
      throw new Error(`Reng exam ${exam.id} names an unknown bank ${exam.bank}`);
    }
    const byId = new Map(bank.content.questions.map((question) => [question.id, question]));
    const questions = exam.questionIds.map((id) => {
      const question = byId.get(id);
      if (!question) {
        throw new Error(`Reng exam ${exam.id}: ${id} is not in ${exam.bank}`);
      }
      return question;
    });
    return {
      id: exam.id,
      kind: "reng",
      level: exam.level,
      title: exam.title,
      year: null,
      bankLessonId: bank.id,
      questions,
    };
  });
}

/** Every printable exam: per level, the official tests (2018, 2012), supplied tests, Reng's. */
export const JLPT_EXAM_SETS: readonly JlptExamSet[] = [
  ...officialSets(),
  ...testSets(),
  ...fixedSets(),
].sort(
  (first, second) =>
    JLPT_LEVELS.indexOf(first.level) - JLPT_LEVELS.indexOf(second.level) ||
    KIND_ORDER.indexOf(first.kind) - KIND_ORDER.indexOf(second.kind),
);

/** The kind of an exam a class opened, from its questions: what its printed cover says. */
export function examSetKindOf(questions: readonly LessonQuestion[]): JlptExamSetKind {
  if (questions.length && questions.every((q) => q.source?.credit === JLPT_OFFICIAL_CREDIT)) {
    return "official";
  }
  return isOfficialTest(questions) ? "test" : "reng";
}

export function findJlptExamSet(id: string) {
  return JLPT_EXAM_SETS.find((set) => set.id === id) ?? null;
}

/** "Đề 1", "Đề 2"… within the level, in the order of JLPT_EXAM_SETS. */
export function jlptExamSetNumber(set: JlptExamSet) {
  return JLPT_EXAM_SETS.filter((item) => item.level === set.level).indexOf(set) + 1;
}

/** Reng's fixed mock exams, for the exam library of a class that pins their bank. */
export function fixedRengExamSets() {
  return JLPT_EXAM_SETS.filter((set) => set.kind === "reng");
}

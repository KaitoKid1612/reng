import { AUTO_SUBMIT_LEAD_MS } from "@/lib/assignment";
import { selectBalancedDailyQuestions } from "@/lib/daily-practice";
import { jlptPartOf, jlptSectionQuestionCount, jlptTestParts } from "@/lib/jlpt-parts";
import { formatStudyDay, toStudyDay } from "@/lib/study-days";

import type { DailyQuestionUse } from "@/lib/daily-practice";

// JLPT mock exams: a one-attempt test drawn from a review bank by the exam's sections, with a
// time limit counted from the start of each attempt. Scores are scaled to the exam's 180 points
// as an estimate only; the official score uses item statistics this app does not have.

export const JLPT_LEVELS = ["N5", "N4"] as const;

// The real test plays each listening clip once, so a mock exam does too: no pause, rewind or
// slower speed (see ListeningPlayer's isSinglePass).
export const JLPT_EXAM_MAX_LISTENS = 1;
export type JlptLevel = (typeof JLPT_LEVELS)[number];

export const JLPT_SECTIONS = ["vocabulary", "grammarReading", "listening"] as const;
export type JlptSection = (typeof JLPT_SECTIONS)[number];

export const JLPT_SECTION_LABELS: Record<JlptSection, string> = {
  vocabulary: "Chữ Hán – từ vựng (文字・語彙)",
  grammarReading: "Ngữ pháp – đọc hiểu (文法・読解)",
  listening: "Nghe hiểu (聴解)",
};

interface JlptPreset {
  // The official time of the level since 2020 (all sections together).
  minutes: number;
  // Questions per section; the total stays within the 70-question cap of an assignment.
  quotas: Record<JlptSection, number>;
  // Pass mark out of 180.
  passMark: number;
}

export const JLPT_PRESETS: Record<JlptLevel, JlptPreset> = {
  N5: { minutes: 90, quotas: { vocabulary: 25, grammarReading: 20, listening: 20 }, passMark: 80 },
  N4: { minutes: 115, quotas: { vocabulary: 25, grammarReading: 25, listening: 20 }, passMark: 90 },
};

// N5 and N4 report two scored sections: language knowledge with reading (0–120, at least 38)
// and listening (0–60, at least 19).
export const JLPT_LANGUAGE_MAX = 120;
export const JLPT_LISTENING_MAX = 60;
export const JLPT_LANGUAGE_MIN = 38;
export const JLPT_LISTENING_MIN = 19;

export const MIN_EXAM_MINUTES = 5;
export const MAX_EXAM_MINUTES = 240;
// The server accepts saves and the hand-in for one more minute after the time limit (migration
// 20261109032029); the page hands in at the limit itself.
const EXAM_CLOSE_GRACE_MS = 60 * 1000;

const VOCABULARY_TAGS = new Set([
  "文字・語彙",
  "文字",
  "語彙",
  "kanji",
  "vocabulary",
  "writing",
  "paraphrase",
]);
const GRAMMAR_TAGS = new Set(["文法", "grammar", "forms", "particles", "sentence-order"]);
const READING_TAGS = new Set(["読解", "reading"]);

export interface JlptQuestionShape {
  type: string;
  tags: readonly string[];
  passage?: string | null;
}

/**
 * The exam section of a bank question, from its type and tags: listening for listening
 * questions, reading for questions on a passage, then the bank's vocabulary and grammar tags.
 * Dictation is not part of the JLPT, and a question without a known tag stays out of an exam.
 */
export function jlptSectionOf(question: JlptQuestionShape): JlptSection | null {
  if (question.type === "listen") {
    return "listening";
  }
  if (question.type === "dictation") {
    return null;
  }
  const part = jlptPartOf(question);
  if (part) {
    return part.section;
  }
  const tags = question.tags.map((tag) => tag.trim().toLowerCase());
  if (question.passage || tags.some((tag) => READING_TAGS.has(tag))) {
    return "grammarReading";
  }
  if (tags.some((tag) => VOCABULARY_TAGS.has(tag))) {
    return "vocabulary";
  }
  if (question.type === "order" || tags.some((tag) => GRAMMAR_TAGS.has(tag))) {
    return "grammarReading";
  }
  return null;
}

function emptySectionCounts(): Record<JlptSection, number> {
  return { vocabulary: 0, grammarReading: 0, listening: 0 };
}

export function countJlptSections(questions: readonly JlptQuestionShape[]) {
  const counts = emptySectionCounts();
  for (const question of questions) {
    const section = jlptSectionOf(question);
    if (section) {
      counts[section] += 1;
    }
  }
  return counts;
}

/** How many questions of each section an exam of the level takes from these counts. */
export function planJlptExam(level: JlptLevel, available: Record<JlptSection, number>) {
  const planned = emptySectionCounts();
  for (const section of JLPT_SECTIONS) {
    planned[section] = Math.min(JLPT_PRESETS[level].quotas[section], available[section]);
  }
  return planned;
}

export interface JlptExamCandidate extends JlptQuestionShape {
  id: string;
}

// The selector keeps a passage's questions next to each other within one kind of question; a
// passage asked with several kinds (choice and fill) is gathered here at its first question.
function keepPassagesTogether(ids: readonly string[], passageOf: ReadonlyMap<string, string>) {
  const ordered: string[] = [];
  const placed = new Set<string>();
  for (const id of ids) {
    if (placed.has(id)) {
      continue;
    }
    const passage = passageOf.get(id);
    const group = passage ? ids.filter((other) => passageOf.get(other) === passage) : [id];
    for (const member of group) {
      placed.add(member);
      ordered.push(member);
    }
  }
  return ordered;
}

const OFFICIAL_TAG = /^official:/;
const LEVEL_TAG = /^jlpt:(n[45])$/;

// Each question of a test reused whole, such as a JLPT official workbook, carries an
// official:… tag (official:jlpt-2018).
export function isOfficialTest(questions: readonly JlptQuestionShape[]) {
  return (
    questions.length > 0 &&
    questions.every((question) =>
      question.tags.some((tag) => OFFICIAL_TAG.test(tag.trim().toLowerCase())),
    )
  );
}

// The level an official test was written for, from its jlpt:n5 / jlpt:n4 tags.
export function officialTestLevel(questions: readonly JlptQuestionShape[]): JlptLevel | null {
  for (const question of questions) {
    for (const tag of question.tags) {
      const level = LEVEL_TAG.exec(tag.trim().toLowerCase());
      if (level) {
        return level[1].toUpperCase() as JlptLevel;
      }
    }
  }
  return null;
}

const LISTENING_PART = /^section:([1-4])$/;

// The part of the real listening test a question was written for (section:1 課題理解 to
// section:4 即時応答), or 5 for a question written for daily practice.
function listeningPartOf(tags: readonly string[]) {
  for (const tag of tags) {
    const part = LISTENING_PART.exec(tag.trim().toLowerCase());
    if (part) {
      return Number(part[1]);
    }
  }
  return 5;
}

/**
 * Picks an exam from a bank: each section takes its quota, preferring questions not used in the
 * class's earlier exams and keeping a passage's questions together, in the exam's section order.
 * Listening takes only questions written in the test's format (tagged jlpt:n5 or jlpt:n4) when
 * the bank has a full section of them, and plays them in the test's part order. An official test
 * is taken whole, in its booklet's order: no quotas and no rotation.
 */
/** The candidates of each part of the level's test; listening counts only clips of that level. */
function groupByTestParts(candidates: readonly JlptExamCandidate[], level: JlptLevel) {
  const formatTag = `jlpt:${level.toLowerCase()}`;
  const parts = jlptTestParts(level);
  const byPart = new Map<string, JlptExamCandidate[]>(parts.map(({ part }) => [part.tag, []]));
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const part = jlptPartOf(candidate);
    const isLevelListening =
      part?.section !== "listening" ||
      candidate.tags.some((tag) => tag.trim().toLowerCase() === formatTag);
    if (part && isLevelListening && !seen.has(candidate.id)) {
      seen.add(candidate.id);
      byPart.get(part.tag)?.push(candidate);
    }
  }
  return { parts, byPart };
}

/**
 * Whether a bank is written in the test's parts with enough questions for every part, so its
 * exam takes the real test's size and order (N4 85 questions, N5 67).
 */
export function fillsJlptTest(candidates: readonly JlptExamCandidate[], level: JlptLevel) {
  const { parts, byPart } = groupByTestParts(candidates, level);
  return parts.every(({ part, count }) => (byPart.get(part.tag)?.length ?? 0) >= count);
}

/** The real test's questions per section (N4 28, 29, 28), for a bank that fills the test. */
export function jlptTestSectionCounts(level: JlptLevel): Record<JlptSection, number> {
  const counts = emptySectionCounts();
  for (const { part, count } of jlptTestParts(level)) {
    counts[part.section] += count;
  }
  return counts;
}

/** An exam of the real test's size and part order, or null when a part is short of questions. */
function composeByParts(
  candidates: readonly JlptExamCandidate[],
  recentUses: readonly DailyQuestionUse[],
  level: JlptLevel,
  seed: string,
  passageOf: ReadonlyMap<string, string>,
) {
  if (!fillsJlptTest(candidates, level)) {
    return null;
  }
  const { parts, byPart } = groupByTestParts(candidates, level);
  const questionIds: string[] = [];
  const counts = emptySectionCounts();
  for (const { part, count } of parts) {
    const picked = selectBalancedDailyQuestions(
      (byPart.get(part.tag) ?? []).map((question) => ({
        id: question.id,
        type: question.type,
        tags: question.tags,
        group: question.passage ?? undefined,
      })),
      recentUses,
      count,
      `${seed}:${part.tag}`,
    );
    questionIds.push(...keepPassagesTogether(picked, passageOf));
    counts[part.section] += picked.length;
  }
  return { questionIds, counts };
}

/**
 * A fixed exam: the named questions in their order, each of which the lesson must still hold, so
 * a bank edited on the server never opens a shorter or different exam than the one printed.
 */
export function fixedJlptExam(
  candidates: readonly JlptExamCandidate[],
  questionIds: readonly string[],
) {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const counts = emptySectionCounts();
  for (const id of questionIds) {
    const candidate = byId.get(id);
    const section = candidate ? jlptSectionOf(candidate) : null;
    if (!section) {
      return { questionIds: [], counts: emptySectionCounts() };
    }
    counts[section] += 1;
  }
  return { questionIds: [...questionIds], counts };
}

export function composeJlptExam(
  candidates: readonly JlptExamCandidate[],
  recentUses: readonly DailyQuestionUse[],
  level: JlptLevel,
  seed: string,
) {
  if (isOfficialTest(candidates)) {
    const counts = emptySectionCounts();
    const questionIds: string[] = [];
    for (const candidate of candidates) {
      const section = jlptSectionOf(candidate);
      if (section && !questionIds.includes(candidate.id)) {
        questionIds.push(candidate.id);
        counts[section] += 1;
      }
    }
    return { questionIds, counts };
  }
  const passages = new Map<string, string>();
  for (const candidate of candidates) {
    if (candidate.passage) {
      passages.set(candidate.id, candidate.passage);
    }
  }
  const byParts = composeByParts(candidates, recentUses, level, seed, passages);
  if (byParts) {
    return byParts;
  }
  const bySection: Record<JlptSection, JlptExamCandidate[]> = {
    vocabulary: [],
    grammarReading: [],
    listening: [],
  };
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const section = jlptSectionOf(candidate);
    if (section && !seen.has(candidate.id)) {
      seen.add(candidate.id);
      bySection[section].push(candidate);
    }
  }
  const formatTag = `jlpt:${level.toLowerCase()}`;
  const testFormat = bySection.listening.filter((question) =>
    question.tags.some((tag) => tag.trim().toLowerCase() === formatTag),
  );
  if (testFormat.length >= JLPT_PRESETS[level].quotas.listening) {
    bySection.listening = testFormat;
  }
  const planned = planJlptExam(level, {
    vocabulary: bySection.vocabulary.length,
    grammarReading: bySection.grammarReading.length,
    listening: bySection.listening.length,
  });
  const questionIds: string[] = [];
  const counts = emptySectionCounts();
  for (const section of JLPT_SECTIONS) {
    const picked = selectBalancedDailyQuestions(
      bySection[section].map((question) => ({
        id: question.id,
        type: question.type,
        tags: question.tags,
        group: question.passage ?? undefined,
      })),
      recentUses,
      planned[section],
      `${seed}:${section}`,
    );
    if (section === "listening") {
      const partOf = new Map(
        bySection.listening.map((question) => [question.id, listeningPartOf(question.tags)]),
      );
      // A stable sort keeps the selector's order within a part.
      picked.sort((a, b) => (partOf.get(a) ?? 5) - (partOf.get(b) ?? 5));
    }
    questionIds.push(...keepPassagesTogether(picked, passages));
    counts[section] = picked.length;
  }
  return { questionIds, counts };
}

export interface JlptScoredItem {
  section: JlptSection | null;
  isCorrect: boolean;
  pointsEarned: number;
  points: number;
}

export interface JlptSectionScore {
  section: JlptSection;
  correct: number;
  total: number;
  earned: number;
  max: number;
}

export function scoreJlptSections(items: readonly JlptScoredItem[]): JlptSectionScore[] {
  return JLPT_SECTIONS.map((section) => {
    const inSection = items.filter((item) => item.section === section);
    return {
      section,
      correct: inSection.filter((item) => item.isCorrect).length,
      total: inSection.length,
      earned: inSection.reduce((sum, item) => sum + item.pointsEarned, 0),
      max: inSection.reduce((sum, item) => sum + item.points, 0),
    };
  }).filter((score) => score.total > 0);
}

export interface JlptEstimate {
  language: number;
  listening: number;
  total: number;
  passMark: number;
  isPassing: boolean;
  missesLanguageMinimum: boolean;
  missesListeningMinimum: boolean;
}

/**
 * The exam's two scored sections scaled from the share of points earned. Without listening
 * questions (a bank with no audio) there is nothing to estimate the pass from.
 */
export function estimateJlptScore(
  level: JlptLevel,
  scores: readonly JlptSectionScore[],
): JlptEstimate | null {
  const sum = (sections: readonly JlptSection[], key: "earned" | "max") =>
    scores
      .filter((score) => sections.includes(score.section))
      .reduce((total, score) => total + score[key], 0);
  const languageMax = sum(["vocabulary", "grammarReading"], "max");
  const listeningMax = sum(["listening"], "max");
  if (!languageMax || !listeningMax) {
    return null;
  }
  const language = Math.round(
    (JLPT_LANGUAGE_MAX * sum(["vocabulary", "grammarReading"], "earned")) / languageMax,
  );
  const listening = Math.round((JLPT_LISTENING_MAX * sum(["listening"], "earned")) / listeningMax);
  const total = language + listening;
  const passMark = JLPT_PRESETS[level].passMark;
  const missesLanguageMinimum = language < JLPT_LANGUAGE_MIN;
  const missesListeningMinimum = listening < JLPT_LISTENING_MIN;
  return {
    language,
    listening,
    total,
    passMark,
    isPassing: total >= passMark && !missesLanguageMinimum && !missesListeningMinimum,
    missesLanguageMinimum,
    missesListeningMinimum,
  };
}

/** When the page hands an attempt in: at the time limit, or before a deadline that comes first. */
export function examHandInAt(
  startedAt: string,
  timeLimitMinutes: number,
  dueAt: string | null,
  allowLate: boolean,
) {
  const limitEnd = Date.parse(startedAt) + timeLimitMinutes * 60 * 1000;
  // A deadline that refuses late work is met a minute early, as in other assignments.
  const dueEnd = dueAt && !allowLate ? Date.parse(dueAt) - AUTO_SUBMIT_LEAD_MS : Infinity;
  return new Date(Math.min(limitEnd, dueEnd)).toISOString();
}

/** True once the server no longer accepts the attempt's answers (the limit plus a minute). */
export function isExamTimeUp(startedAt: string, timeLimitMinutes: number, now: Date) {
  return now.getTime() > Date.parse(startedAt) + timeLimitMinutes * 60 * 1000 + EXAM_CLOSE_GRACE_MS;
}

/** Handed in by Reng when the time ran out, at the end of the limit. */
export function isHandedInAtTimeLimit(
  submittedAt: string | null,
  startedAt: string,
  timeLimitMinutes: number,
) {
  return (
    submittedAt !== null &&
    Date.parse(submittedAt) === Date.parse(startedAt) + timeLimitMinutes * 60 * 1000
  );
}

// The real test's minutes for each section since 2020: N5 90 and N4 115 in all.
export const JLPT_SECTION_MINUTES: Record<JlptLevel, Record<JlptSection, number>> = {
  N5: { vocabulary: 20, grammarReading: 40, listening: 30 },
  N4: { vocabulary: 25, grammarReading: 55, listening: 35 },
};

export const JLPT_SECTION_SHORT_LABELS: Record<JlptSection, string> = {
  vocabulary: "Chữ Hán – từ vựng",
  grammarReading: "Ngữ pháp – đọc hiểu",
  listening: "Nghe hiểu",
};

export interface ExamPacingStep {
  section: JlptSection;
  /** Question numbers as the learner sees them, from 1. */
  firstPosition: number;
  lastPosition: number;
  minutes: number;
  /** When the section's share of the time runs out. */
  endsAt: string;
}

/**
 * Pacing like the real test: the exam's sections in order, each with the official share of the
 * attempt's time limit. It only guides; the attempt keeps its single limit, and an exam whose
 * questions do not come one section after another gets no pacing.
 */
// The sections of a set in order, each as one run of questions; null when they interleave or a
// set has a single section, since then there is no test order to pace.
function sectionRuns(sections: readonly (JlptSection | null)[]) {
  const runs: { section: JlptSection; firstPosition: number; lastPosition: number }[] = [];
  sections.forEach((section, index) => {
    const last = runs.at(-1);
    if (last && (section === null || section === last.section)) {
      last.lastPosition = index + 1;
    } else if (section) {
      runs.push({ section, firstPosition: index + 1, lastPosition: index + 1 });
    }
  });
  if (runs.length < 2 || new Set(runs.map((run) => run.section)).size !== runs.length) {
    return null;
  }
  return runs;
}

export function planExamPacing(
  level: JlptLevel,
  timeLimitMinutes: number,
  sections: readonly (JlptSection | null)[],
  startedAt: string,
): ExamPacingStep[] {
  const runs = sectionRuns(sections);
  if (!runs) {
    return [];
  }
  const official = JLPT_SECTION_MINUTES[level];
  const total = runs.reduce((sum, run) => sum + official[run.section], 0);
  let used = 0;
  return runs.map((run, index) => {
    const minutes =
      index === runs.length - 1
        ? timeLimitMinutes - used
        : Math.round((timeLimitMinutes * official[run.section]) / total);
    used += minutes;
    const endsAt = new Date(Date.parse(startedAt) + used * 60 * 1000).toISOString();
    return { ...run, minutes, endsAt };
  });
}

/**
 * The real test's pace for a practice set in test order (a JLPT-format daily set): each section
 * gets the official minutes in proportion to its questions here against one real test, so 10 of
 * the 28 N4 listening questions get 13 of its 35 minutes. Empty when the set is not in test order.
 */
export function planStudyPacing(
  level: JlptLevel,
  sections: readonly (JlptSection | null)[],
  startedAt: string,
): ExamPacingStep[] {
  const runs = sectionRuns(sections);
  if (!runs) {
    return [];
  }
  let used = 0;
  return runs.map((run) => {
    const count = run.lastPosition - run.firstPosition + 1;
    const share = count / jlptSectionQuestionCount(level, run.section);
    const minutes = Math.max(
      1,
      Math.round(JLPT_SECTION_MINUTES[level][run.section] * Math.min(1, share)),
    );
    used += minutes;
    const endsAt = new Date(Date.parse(startedAt) + used * 60 * 1000).toISOString();
    return { ...run, minutes, endsAt };
  });
}

/** "Chữ Hán – từ vựng 25 phút, …": the guide's split of an exam with all three sections. */
export function describeExamPacing(level: JlptLevel, timeLimitMinutes: number) {
  return planExamPacing(level, timeLimitMinutes, JLPT_SECTIONS, new Date(0).toISOString())
    .map((step) => `${JLPT_SECTION_SHORT_LABELS[step.section]} ${step.minutes} phút`)
    .join(", ");
}

/** The step the clock is in: the first whose share has not run out, else the last one. */
export function currentPacingStep(steps: readonly ExamPacingStep[], now: number) {
  return steps.find((step) => Date.parse(step.endsAt) > now) ?? steps.at(-1) ?? null;
}

// Longer than this the learner left and came back, so the time says nothing about their pace.
const ONE_SITTING_MS = 6 * 60 * 60 * 1000;

/** "52 phút", "1 giờ 5 phút": how long a submitted attempt took, or null past one sitting. */
export function describeAttemptTime(startedAt: string, submittedAt: string | null) {
  if (!submittedAt) {
    return null;
  }
  const milliseconds = Date.parse(submittedAt) - Date.parse(startedAt);
  if (!(milliseconds >= 0) || milliseconds > ONE_SITTING_MS) {
    return null;
  }
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} giờ ${minutes % 60} phút` : `${minutes} phút`;
}

export function formatExamClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

export function examTitle(level: JlptLevel, now: Date) {
  return `Thi thử JLPT ${level} — ${formatStudyDay(toStudyDay(now)).slice(0, 5)}`;
}

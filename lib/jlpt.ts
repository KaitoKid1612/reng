import { AUTO_SUBMIT_LEAD_MS } from "@/lib/assignment";
import { selectBalancedDailyQuestions } from "@/lib/daily-practice";
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
export const EXAM_CLOSE_GRACE_MS = 60 * 1000;

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

export function emptySectionCounts(): Record<JlptSection, number> {
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

/**
 * Picks an exam from a bank: each section takes its quota, preferring questions not used in the
 * class's earlier exams and keeping a passage's questions together, in the exam's section order.
 */
export function composeJlptExam(
  candidates: readonly JlptExamCandidate[],
  recentUses: readonly DailyQuestionUse[],
  level: JlptLevel,
  seed: string,
) {
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
  const planned = planJlptExam(level, {
    vocabulary: bySection.vocabulary.length,
    grammarReading: bySection.grammarReading.length,
    listening: bySection.listening.length,
  });
  const passageOf = new Map<string, string>();
  for (const candidate of candidates) {
    if (candidate.passage) {
      passageOf.set(candidate.id, candidate.passage);
    }
  }
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
    questionIds.push(...keepPassagesTogether(picked, passageOf));
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

// The JLPT is held on the first Sunday of July and December. Later sessions are marked expected
// until the Japan Foundation publishes them; add each new session here.
export const JLPT_SESSIONS = [
  { date: "2026-12-06", isConfirmed: true },
  { date: "2027-07-04", isConfirmed: false },
  { date: "2027-12-05", isConfirmed: false },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function findNextJlptSession(now: Date) {
  const today = toStudyDay(now);
  const session = JLPT_SESSIONS.find((item) => item.date >= today);
  if (!session) {
    return null;
  }
  return {
    ...session,
    daysLeft: Math.round((Date.parse(session.date) - Date.parse(today)) / DAY_MS),
  };
}

export function describeJlptCountdown(now: Date) {
  const session = findNextJlptSession(now);
  if (!session) {
    return null;
  }
  const date = `Chủ nhật ${formatStudyDay(session.date)}${session.isConfirmed ? "" : " (dự kiến)"}`;
  return session.daysLeft === 0
    ? `Hôm nay là ngày thi JLPT, ${date}.`
    : `Còn ${session.daysLeft} ngày tới kỳ thi JLPT, ${date}.`;
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
export function planExamPacing(
  level: JlptLevel,
  timeLimitMinutes: number,
  sections: readonly (JlptSection | null)[],
  startedAt: string,
): ExamPacingStep[] {
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

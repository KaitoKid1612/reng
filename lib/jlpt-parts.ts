import type { JlptLevel, JlptSection } from "@/lib/jlpt";

// The mondai (もんだい) of the JLPT N5/N4 test in booklet order. A bank question names its part
// with the part's tag (kanji-reading, usage…); a listening question keeps the section:1 to
// section:4 tag of the listening sets. The official guideline (n4_revised.pdf, 2022) lists the
// parts but no longer prints counts; the counts below are the ones in use since the shorter
// N4/N5 test of December 2020.

export interface JlptPart {
  tag: string;
  label: string;
  section: JlptSection;
}

export const JLPT_PARTS: readonly JlptPart[] = [
  { tag: "kanji-reading", label: "漢字読み", section: "vocabulary" },
  { tag: "orthography", label: "表記", section: "vocabulary" },
  { tag: "contextual", label: "文脈規定", section: "vocabulary" },
  { tag: "paraphrase", label: "言い換え類義", section: "vocabulary" },
  { tag: "usage", label: "用法", section: "vocabulary" },
  { tag: "grammar-form", label: "文法形式の判断", section: "grammarReading" },
  { tag: "composition", label: "文の組み立て", section: "grammarReading" },
  { tag: "text-grammar", label: "文章の文法", section: "grammarReading" },
  { tag: "short-reading", label: "内容理解（短文）", section: "grammarReading" },
  { tag: "mid-reading", label: "内容理解（中文）", section: "grammarReading" },
  { tag: "info-search", label: "情報検索", section: "grammarReading" },
  { tag: "listening-task", label: "課題理解", section: "listening" },
  { tag: "listening-point", label: "ポイント理解", section: "listening" },
  { tag: "listening-utterance", label: "発話表現", section: "listening" },
  { tag: "listening-response", label: "即時応答", section: "listening" },
];

// Questions per part in one real test; N5 has no 用法.
const PART_COUNTS: Record<JlptLevel, readonly number[]> = {
  N4: [7, 5, 8, 4, 4, 13, 4, 4, 3, 3, 2, 8, 7, 5, 8],
  N5: [7, 5, 6, 3, 0, 9, 4, 4, 2, 2, 1, 7, 6, 5, 6],
};

export const DAILY_FORMATS = ["balanced", "jlpt-n4", "jlpt-n5"] as const;
export type DailyFormat = (typeof DAILY_FORMATS)[number];

export const DAILY_FORMAT_LABELS: Record<DailyFormat, string> = {
  balanced: "Theo tỉ lệ các dạng câu trong bài nguồn",
  "jlpt-n4": "Theo cấu trúc đề JLPT N4",
  "jlpt-n5": "Theo cấu trúc đề JLPT N5",
};

export function dailyFormatLevel(format: DailyFormat): JlptLevel | null {
  if (format === "jlpt-n4") {
    return "N4";
  }
  return format === "jlpt-n5" ? "N5" : null;
}

// A full daily set: every language and reading question of one test plus this many listening.
export const JLPT_DAILY_LISTENING = 10;

const LISTENING_SECTION_TAG = /^section:([1-4])$/;

interface JlptPartQuestion {
  type: string;
  tags: readonly string[];
}

/** The part of a bank question, or null for a question written in no exam format. */
export function jlptPartOf(question: JlptPartQuestion): JlptPart | null {
  const tags = question.tags.map((tag) => tag.trim().toLowerCase());
  if (question.type === "listen") {
    for (const tag of tags) {
      const section = LISTENING_SECTION_TAG.exec(tag);
      if (section) {
        return JLPT_PARTS[10 + Number(section[1])];
      }
    }
  }
  return (
    JLPT_PARTS.find(
      (part) =>
        (part.section === "listening") === (question.type === "listen") && tags.includes(part.tag),
    ) ?? null
  );
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

// Largest remainder; ties keep part order, so the earlier mondai gets the extra question.
function scaleCounts(weights: readonly number[], total: number) {
  const weightSum = sum(weights);
  const exact = weights.map((weight) => (weightSum ? (weight / weightSum) * total : 0));
  const counts = exact.map(Math.floor);
  const order = exact
    .map((value, index) => ({ index, rest: value - Math.floor(value) }))
    .filter((item) => weights[item.index] > 0)
    .sort((first, second) => second.rest - first.rest);
  let left = total - sum(counts);
  for (const item of order) {
    if (left <= 0) {
      break;
    }
    counts[item.index] += 1;
    left -= 1;
  }
  return counts;
}

export interface JlptDailyPart {
  part: JlptPart;
  count: number;
}

/** The size of a daily set with every language and reading question of one test. */
export function jlptFullDailySize(level: JlptLevel) {
  const counts = PART_COUNTS[level];
  const language = sum(counts.filter((_, index) => JLPT_PARTS[index].section !== "listening"));
  return language + JLPT_DAILY_LISTENING;
}

/**
 * How many questions of each part a daily set of this size takes, in test order. The listening
 * count is the class's choice (null keeps the test's share of listening); the rest goes to the
 * language and reading parts in the test's proportions.
 */
export function planJlptDailyParts(
  level: JlptLevel,
  size: number,
  listeningCount: number | null,
): JlptDailyPart[] {
  const counts = PART_COUNTS[level];
  const isListening = JLPT_PARTS.map((part) => part.section === "listening");
  const listeningWeights = counts.map((count, index) => (isListening[index] ? count : 0));
  const languageWeights = counts.map((count, index) => (isListening[index] ? 0 : count));
  const listeningShare = Math.round((size * sum(listeningWeights)) / sum(counts));
  const listening = Math.min(size, listeningCount ?? listeningShare);
  const languageCounts = scaleCounts(languageWeights, size - listening);
  const listeningCounts = scaleCounts(listeningWeights, listening);
  return JLPT_PARTS.map((part, index) => ({
    part,
    count: isListening[index] ? listeningCounts[index] : languageCounts[index],
  })).filter((item) => counts[JLPT_PARTS.indexOf(item.part)] > 0);
}

export interface JlptDailyCoverage extends JlptDailyPart {
  available: number;
}

/** Each part's daily count beside the questions the bank has for it, for the class page. */
export function describeJlptDailyCoverage(
  level: JlptLevel,
  size: number,
  listeningCount: number | null,
  questions: readonly JlptPartQuestion[],
): JlptDailyCoverage[] {
  const available = new Map<string, number>();
  for (const question of questions) {
    const part = jlptPartOf(question);
    if (part) {
      available.set(part.tag, (available.get(part.tag) ?? 0) + 1);
    }
  }
  return planJlptDailyParts(level, size, listeningCount).map((item) => ({
    ...item,
    available: available.get(item.part.tag) ?? 0,
  }));
}

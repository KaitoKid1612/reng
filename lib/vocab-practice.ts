import { withBlank } from "@/lib/jlpt-vocab";

import type { JlptVocab, VocabPos } from "@/lib/jlpt-vocab";

// Vocabulary practice in the exam's shapes: fill the blank of a sentence (もんだい3) with the
// author's three same-form wrong words, pick the word or phrase closest in meaning (もんだい4),
// and pick the Vietnamese meaning. Every question is a choice of four, nothing is saved.
export const VOCAB_KINDS = ["fill", "similar", "meaning"] as const;
export type VocabKind = (typeof VOCAB_KINDS)[number];

export const VOCAB_KIND_LABELS: Record<VocabKind, string> = {
  fill: "Điền từ vào câu, như đề JLPT (もんだい3)",
  similar: "Chọn từ gần nghĩa (もんだい4)",
  meaning: "Chọn nghĩa tiếng Việt",
};

const OPTION_COUNT = 4;

export interface VocabQuestion {
  id: string;
  kind: VocabKind;
  item: JlptVocab;
  // The text shown above the options: the sentence with its blank, or the word.
  prompt: string;
  options: string[];
  answerIndex: number;
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function choose(answer: string, wrong: readonly string[], random: () => number) {
  const distractors = [...new Set(wrong)].filter((value) => value !== answer);
  if (distractors.length < OPTION_COUNT - 1) {
    return null;
  }
  const options = shuffle([answer, ...distractors.slice(0, OPTION_COUNT - 1)], random);
  return { options, answerIndex: options.indexOf(answer) };
}

// Wrong options for the meaning and synonym questions come first from words of the same part
// of speech, so the options look alike, then from any word.
function othersFirst(item: JlptVocab, pool: readonly JlptVocab[], random: () => number) {
  const others = pool.filter((other) => other !== item);
  const samePos = (pos: VocabPos) => others.filter((other) => other.pos === pos);
  return [...shuffle(samePos(item.pos), random), ...shuffle(others, random)];
}

function buildQuestion(
  item: JlptVocab,
  kind: VocabKind,
  pool: readonly JlptVocab[],
  random: () => number,
): VocabQuestion | null {
  const id = `${kind}:${item.word}:${item.reading}`;
  if (kind === "fill") {
    const answer = item.example.ja.match(/\[\[(.+?)\]\]/u)?.[1] ?? "";
    const choice = choose(answer, item.example.choices, random);
    return choice && { id, kind, item, prompt: withBlank(item.example.ja), ...choice };
  }
  if (kind === "similar") {
    if (!item.similar) {
      return null;
    }
    const wrong = othersFirst(item, pool, random)
      .map((other) => other.similar ?? other.reading)
      .filter((value) => value !== item.reading);
    const choice = choose(item.similar, wrong, random);
    return choice && { id, kind, item, prompt: item.reading, ...choice };
  }
  const wrong = othersFirst(item, pool, random).map((other) => other.meaning);
  const choice = choose(item.meaning, wrong, random);
  return choice && { id, kind, item, prompt: item.word, ...choice };
}

/**
 * One question per word, the chosen kinds taking turns. A word without a synonym gets the next
 * kind instead of "similar", so every word in the session is asked once.
 */
export function createVocabSession(
  items: readonly JlptVocab[],
  kinds: readonly VocabKind[],
  count: number,
  pool: readonly JlptVocab[] = items,
  random: () => number = Math.random,
): VocabQuestion[] {
  if (!kinds.length) {
    return [];
  }
  const questions: VocabQuestion[] = [];
  for (const [index, item] of shuffle(items, random).entries()) {
    if (questions.length >= count) {
      break;
    }
    for (let step = 0; step < kinds.length; step++) {
      const question = buildQuestion(item, kinds[(index + step) % kinds.length], pool, random);
      if (question) {
        questions.push(question);
        break;
      }
    }
  }
  return questions;
}

import { toHiragana } from "wanakana";

import { createItemId } from "@/lib/lesson-draft";

import type { DraftContent, DraftQuestion } from "@/lib/lesson-draft";

// Kanji practice reuses the lesson's own vocabulary: the written form comes from the kanji
// column and the only accepted reading is the kana the teacher wrote (docs/07: readings are
// declared, never inferred). No outside dictionary data is needed.
export interface KanjiWord {
  id: string;
  written: string;
  reading: string;
  meaning: string;
}

export const KANJI_QUESTION_KINDS = ["reading", "written", "meaning"] as const;
export type KanjiQuestionKind = (typeof KANJI_QUESTION_KINDS)[number];

export const KANJI_KIND_LABELS: Record<KanjiQuestionKind, string> = {
  reading: "Đọc chữ: nhìn chữ Hán, gõ cách đọc",
  written: "Nhận mặt chữ: chọn chữ Hán đúng",
  meaning: "Hiểu nghĩa: chọn nghĩa tiếng Việt",
};

export const KANJI_TAG = "kanji";
// Marks the vocabulary item a generated question came from, so it is not generated twice.
const SOURCE_TAG_PREFIX = "kanji:";
const MAX_OPTIONS = 4;
const MAX_LESSON_QUESTIONS = 200;
const HAN = /\p{Script=Han}/u;
const AFFIX_MARKS = /[〜～~]/gu;

interface VocabSource {
  id: string;
  jp: string;
  kanji?: string;
  vi: string;
}

export function extractKanjiWords(vocab: readonly VocabSource[]): KanjiWord[] {
  return vocab
    .filter((item) => item.kanji && HAN.test(item.kanji) && item.jp.trim() && item.vi.trim())
    .map((item) => ({
      id: item.id,
      written: (item.kanji ?? "").trim(),
      reading: item.jp.trim(),
      meaning: item.vi.trim(),
    }));
}

// Spaces, the "〜" of counters/suffixes and a final 。 are ignored, and katakana counts as
// its hiragana, so "〜にん" matches "にん" and "いい てんきですね" matches "いいてんきですね".
export function normalizeReading(value: string) {
  return toHiragana(
    value.normalize("NFKC").replace(AFFIX_MARKS, "").replace(/\s+/gu, "").replace(/。$/u, ""),
  );
}

export function isCorrectReading(word: KanjiWord, answer: string) {
  const given = normalizeReading(answer);
  return given !== "" && given === normalizeReading(word.reading);
}

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

// The correct value plus up to three different values from other words of the lesson.
function buildOptions(
  word: KanjiWord,
  words: readonly KanjiWord[],
  field: "written" | "meaning",
  random: () => number,
) {
  const distractors = shuffle(
    [...new Set(words.map((item) => item[field]))].filter((value) => value !== word[field]),
    random,
  ).slice(0, MAX_OPTIONS - 1);
  if (!distractors.length) {
    return null;
  }
  const options = shuffle([word[field], ...distractors], random);
  return { options, answerIndex: options.indexOf(word[field]) };
}

export interface KanjiQuestion {
  id: string;
  kind: KanjiQuestionKind;
  word: KanjiWord;
  // Empty for reading questions, which are typed.
  options: string[];
  answerIndex: number;
}

function buildQuestion(
  word: KanjiWord,
  kind: KanjiQuestionKind,
  words: readonly KanjiWord[],
  random: () => number,
): KanjiQuestion {
  if (kind !== "reading") {
    const choice = buildOptions(word, words, kind, random);
    if (choice) {
      return { id: `${kind}:${word.id}`, kind, word, ...choice };
    }
  }
  // A lesson with a single kanji word has nothing to choose between, so it is read instead.
  return { id: `reading:${word.id}`, kind: "reading", word, options: [], answerIndex: -1 };
}

// Each word appears once per session; the chosen kinds take turns.
export function createKanjiSession(
  words: readonly KanjiWord[],
  kinds: readonly KanjiQuestionKind[],
  count: number,
  random: () => number = Math.random,
): KanjiQuestion[] {
  if (!kinds.length) {
    return [];
  }
  return shuffle(words, random)
    .slice(0, Math.max(0, Math.min(count, words.length)))
    .map((word, index) => buildQuestion(word, kinds[index % kinds.length], words, random));
}

export function isCorrectKanjiAnswer(question: KanjiQuestion, answer: string) {
  return question.kind === "reading"
    ? isCorrectReading(question.word, answer)
    : answer === String(question.answerIndex);
}

export interface KanjiRecord {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface KanjiPracticeState {
  phase: "idle" | "answering" | "feedback" | "result";
  questions: KanjiQuestion[];
  index: number;
  records: KanjiRecord[];
}

export const initialKanjiPractice: KanjiPracticeState = {
  phase: "idle",
  questions: [],
  index: 0,
  records: [],
};

export type KanjiPracticeAction =
  | { type: "start"; questions: KanjiQuestion[] }
  | { type: "submit"; answer: string }
  | { type: "next" }
  | { type: "reset" };

export function kanjiPracticeReducer(
  state: KanjiPracticeState,
  action: KanjiPracticeAction,
): KanjiPracticeState {
  switch (action.type) {
    case "start":
      return action.questions.length
        ? { phase: "answering", questions: action.questions, index: 0, records: [] }
        : initialKanjiPractice;
    case "reset":
      return initialKanjiPractice;
    case "submit": {
      const question = state.questions[state.index];
      if (state.phase !== "answering" || !question || !action.answer.trim()) {
        return state;
      }
      return {
        ...state,
        phase: "feedback",
        records: [
          ...state.records,
          {
            questionId: question.id,
            answer: action.answer,
            correct: isCorrectKanjiAnswer(question, action.answer),
          },
        ],
      };
    }
    case "next":
      if (state.phase !== "feedback") {
        return state;
      }
      return state.index + 1 === state.questions.length
        ? { ...state, phase: "result" }
        : { ...state, phase: "answering", index: state.index + 1 };
  }
}

export interface KanjiMistake {
  question: KanjiQuestion;
  answer: string;
}

export function getKanjiMistakes(state: KanjiPracticeState): KanjiMistake[] {
  return state.records.flatMap((record) => {
    const question = state.questions.find((item) => item.id === record.questionId);
    return !record.correct && question ? [{ question, answer: record.answer }] : [];
  });
}

export function describeKanjiAnswer(question: KanjiQuestion, answer: string) {
  return question.kind === "reading" ? answer : (question.options[Number(answer)] ?? answer);
}

function sourceTag(vocabId: string) {
  return `${SOURCE_TAG_PREFIX}${vocabId}`;
}

// Words that still have no generated kanji question in the draft.
export function findWordsWithoutKanjiQuestions(content: DraftContent) {
  const covered = new Set(content.questions.flatMap((question) => question.tags));
  return extractKanjiWords(content.vocab).filter((word) => !covered.has(sourceTag(word.id)));
}

// Draft questions for the lesson's question bank: one typed reading and, when the lesson has
// other kanji words, one "pick the kanji" choice per word. They are ordinary choice/fill
// questions, so assignments, daily practice, the mistake book and reports use them as is.
export function buildKanjiQuestions(
  content: DraftContent,
  random: () => number = Math.random,
): DraftQuestion[] {
  const allWords = extractKanjiWords(content.vocab);
  const created: DraftQuestion[] = [];
  const nextId = () =>
    createItemId("question", { ...content, questions: [...content.questions, ...created] }, random);
  for (const word of findWordsWithoutKanjiQuestions(content)) {
    if (content.questions.length + created.length + 2 > MAX_LESSON_QUESTIONS) {
      break;
    }
    const tags = [KANJI_TAG, sourceTag(word.id)];
    const explain = `${word.written} đọc là ${word.reading}: ${word.meaning}.`;
    created.push({
      id: nextId(),
      type: "fill",
      prompt: `Viết cách đọc bằng hiragana: ${word.written}`,
      explain,
      points: 1,
      tags,
      inputMode: "hiragana",
      kanjiStrict: false,
      answer: [word.reading.replace(AFFIX_MARKS, "")],
    });
    const choice = buildOptions(word, allWords, "written", random);
    if (choice) {
      created.push({
        id: nextId(),
        type: "choice",
        prompt: `Chọn chữ Hán của “${word.reading}” (${word.meaning})`,
        explain,
        points: 1,
        tags,
        options: choice.options,
        multiple: false,
        answer: [choice.answerIndex],
      });
    }
  }
  return created;
}

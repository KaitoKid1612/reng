import { z } from "zod";

import type { KanjiWord } from "@/lib/kanji-practice";

// Kanji for JLPT N5 and N4, for Vietnamese learners: each character with its Sino-Vietnamese
// reading (âm Hán Việt), meaning, on/kun readings, a few words that use only kanji of its level
// or below, and an original memory tip. JLPT has published no kanji list since 2010, so these
// are the characters commonly taught for each level. `paper` lists the words the official sample
// papers (content/jlpt/official) asked a learner to read or write with the kanji; it is written
// by collectPaperKanji and a test keeps it equal to the papers.
export const KANJI_LEVELS = ["n5", "n4"] as const;
export type KanjiLevel = (typeof KANJI_LEVELS)[number];

export const KANJI_LEVEL_LABELS: Record<KanjiLevel, string> = { n5: "N5", n4: "N4" };

const HAN_ALL = /\p{Script=Han}/gu;
const KATAKANA = /^[ァ-ヶー]+$/u;
// Kun readings mark okurigana in brackets and suffix/prefix use with a hyphen: たか(い), -か.
const KUN = /^-?[ぁ-ゖ]+(?:\([ぁ-ゖ]+\))?-?$/u;
const KANA_READING = /^[ぁ-ゖァ-ヶー]+$/u;

const wordSchema = z
  .object({
    written: z.string().min(1).max(12),
    reading: z.string().regex(KANA_READING),
    meaning: z.string().min(1).max(60),
  })
  .strict();

const groupSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    title: z.string().min(1).max(60),
  })
  .strict();

const paperWordSchema = z
  .object({
    year: z.number().int().min(2010).max(2100),
    word: z.string().min(1).max(12),
  })
  .strict();

const itemSchema = z
  .object({
    kanji: z.string().regex(/^\p{Script=Han}$/u),
    group: z.string().regex(/^[a-z][a-z0-9-]*$/),
    hanViet: z.string().min(1).max(30),
    meaning: z.string().min(1).max(80),
    on: z.array(z.string().regex(KATAKANA)).max(4),
    kun: z.array(z.string().regex(KUN)).max(5),
    words: z.array(wordSchema).min(1).max(4),
    tip: z.string().min(10).max(220),
    paper: z.array(paperWordSchema).max(6).optional(),
  })
  .strict();

const levelSchema = z
  .object({
    level: z.enum(KANJI_LEVELS),
    groups: z.array(groupSchema).min(1),
    items: z.array(itemSchema).min(1),
  })
  .strict();

export type JlptKanji = z.infer<typeof itemSchema>;
export type JlptKanjiWord = z.infer<typeof wordSchema>;
export type JlptKanjiGroup = z.infer<typeof groupSchema>;
export type JlptKanjiLevelData = z.infer<typeof levelSchema>;
export type PaperWord = z.infer<typeof paperWordSchema>;

export function kanjiIn(text: string) {
  return text.match(HAN_ALL) ?? [];
}

/**
 * Parses one level. `known` holds the kanji of the lower levels: a word may use those and the
 * kanji of this level, nothing else, so a learner never meets an unstudied character.
 */
export function parseKanjiLevel(input: unknown, known: ReadonlySet<string> = new Set()) {
  return levelSchema
    .superRefine((data, ctx) => {
      const groupIds = new Set(data.groups.map((group) => group.id));
      if (groupIds.size !== data.groups.length) {
        ctx.addIssue({ code: "custom", path: ["groups"], message: "Duplicate group ID" });
      }
      const own = new Set(data.items.map((item) => item.kanji));
      if (own.size !== data.items.length) {
        ctx.addIssue({ code: "custom", path: ["items"], message: "Duplicate kanji" });
      }
      for (const [index, item] of data.items.entries()) {
        const errors: string[] = [];
        if (known.has(item.kanji)) {
          errors.push(`${item.kanji} belongs to a lower level`);
        }
        if (!groupIds.has(item.group)) {
          errors.push(`Unknown group ${item.group}`);
        }
        if (!item.on.length && !item.kun.length) {
          errors.push("A kanji needs an on or kun reading");
        }
        for (const word of item.words) {
          if (!word.written.includes(item.kanji)) {
            errors.push(`${word.written} does not use ${item.kanji}`);
          }
          for (const character of kanjiIn(word.written)) {
            if (!own.has(character) && !known.has(character)) {
              errors.push(`${word.written} uses ${character} from a higher level`);
            }
          }
        }
        if (new Set(item.words.map((word) => word.written)).size !== item.words.length) {
          errors.push("Duplicate word");
        }
        errors.forEach((message) =>
          ctx.addIssue({ code: "custom", path: ["items", index], message }),
        );
      }
      for (const group of data.groups) {
        if (!data.items.some((item) => item.group === group.id)) {
          ctx.addIssue({ code: "custom", path: ["groups"], message: `Empty group ${group.id}` });
        }
      }
    })
    .parse(input);
}

export function isKanjiLevel(value: string): value is KanjiLevel {
  return (KANJI_LEVELS as readonly string[]).includes(value);
}

interface PaperQuestion {
  prompt: string;
  options?: readonly string[];
  answer?: readonly number[];
  tags?: readonly string[];
}

function askedWords(question: PaperQuestion, tags: readonly string[]) {
  if (tags.includes("mondai:1")) {
    return [...question.prompt.matchAll(/\[\[(.+?)\]\]/gu)].map((match) => match[1]);
  }
  if (tags.includes("mondai:2") && question.options && question.answer?.length === 1) {
    return [question.options[question.answer[0]]];
  }
  return [];
}

/**
 * The words an official paper asked about in its kanji parts: もんだい1 marks the word to read
 * ([[先週]]), もんだい2 asks for the written form of a word, which is the right option. Each kanji
 * of such a word maps to the words in paper order, without repeats.
 */
export function collectPaperKanji(questions: readonly PaperQuestion[], year: number) {
  const result = new Map<string, PaperWord[]>();
  for (const question of questions) {
    const tags = question.tags ?? [];
    if (!tags.includes("文字・語彙")) {
      continue;
    }
    for (const word of askedWords(question, tags)) {
      for (const character of new Set(kanjiIn(word))) {
        const list = result.get(character) ?? [];
        if (!list.some((item) => item.word === word && item.year === year)) {
          list.push({ year, word });
        }
        result.set(character, list);
      }
    }
  }
  return result;
}

/**
 * The words to practise for a level or one of its groups, each word once (学校 is listed under
 * both 学 and 校), in the shape of the lesson kanji practice.
 */
export function practiceWordsOf(data: JlptKanjiLevelData, groupId?: string) {
  const seen = new Set<string>();
  const words: KanjiWord[] = [];
  for (const item of data.items) {
    if (groupId && item.group !== groupId) {
      continue;
    }
    item.words.forEach((word, index) => {
      if (seen.has(word.written)) {
        return;
      }
      seen.add(word.written);
      words.push({ id: `${item.kanji}-${index}`, lang: "ja", ...word });
    });
  }
  return words;
}

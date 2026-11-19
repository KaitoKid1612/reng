import { z } from "zod";

// JLPT vocabulary by topic for Vietnamese learners. Each word has its reading, meaning, the
// Sino-Vietnamese reading of a kanji word (経験 → kinh nghiệm), and one sentence written the way
// the exam writes its "fill the blank" part (もんだい3): mostly kana with spaces, the word in the
// form the sentence needs, and three wrong words in that same form. A word with a near synonym
// also feeds the "same meaning" part (もんだい4). Reng writes all of it; nothing is copied.
export const VOCAB_LEVELS = ["n4"] as const;
export type VocabLevel = (typeof VOCAB_LEVELS)[number];
export const VOCAB_LEVEL_LABELS: Record<VocabLevel, string> = { n4: "N4" };

export const VOCAB_POS = [
  "noun",
  "suru-noun",
  "verb",
  "i-adjective",
  "na-adjective",
  "adverb",
  "katakana",
  "expression",
] as const;
export type VocabPos = (typeof VOCAB_POS)[number];

export const VOCAB_POS_LABELS: Record<VocabPos, string> = {
  noun: "danh từ",
  "suru-noun": "danh từ + する",
  verb: "động từ",
  "i-adjective": "tính từ い",
  "na-adjective": "tính từ な",
  adverb: "phó từ",
  katakana: "từ ngoại lai",
  expression: "cụm từ",
};

const KANA = /^[ぁ-ゖァ-ヶー〜]+$/u;
const HAN = /\p{Script=Han}/gu;
const BLANK = /\[\[(.+?)\]\]/gu;

const exampleSchema = z
  .object({
    ja: z.string().min(4).max(120),
    vi: z.string().min(2).max(160),
    choices: z.array(z.string().min(1).max(24)).length(3),
  })
  .strict();

const itemSchema = z
  .object({
    word: z.string().min(1).max(16),
    reading: z.string().regex(KANA),
    group: z.string().regex(/^[a-z][a-z0-9-]*$/),
    pos: z.enum(VOCAB_POS),
    hanViet: z.string().min(1).max(40).optional(),
    meaning: z.string().min(1).max(80),
    example: exampleSchema,
    // A near synonym the exam may swap in (しゅっぱつする ≈ でる), or a phrase with that meaning.
    similar: z.string().min(1).max(40).optional(),
    tip: z.string().min(5).max(200).optional(),
    paper: z.array(z.number().int().min(2010).max(2100)).min(1).max(2).optional(),
  })
  .strict();

const levelSchema = z
  .object({
    level: z.enum(VOCAB_LEVELS),
    groups: z
      .array(
        z
          .object({ id: z.string().regex(/^[a-z][a-z0-9-]*$/), title: z.string().min(1).max(60) })
          .strict(),
      )
      .min(1),
    items: z.array(itemSchema).min(1),
  })
  .strict();

export type JlptVocab = z.infer<typeof itemSchema>;
export type JlptVocabLevelData = z.infer<typeof levelSchema>;

/** The word as the sentence uses it, inside [[ ]]. */
export function blankOf(sentence: string) {
  return [...sentence.matchAll(BLANK)].map((match) => match[1]);
}

/** The sentence with its blank shown as the exam does: （　　）. */
export function withBlank(sentence: string) {
  return sentence.replace(BLANK, "（　　）");
}

/** The sentence with the word filled in, for reading the example. */
export function withWord(sentence: string) {
  return sentence.replace(BLANK, "$1");
}

/**
 * Parses one level. `allowedKanji` holds the kanji a sentence may use (the N5 and N4 kanji of
 * Reng's kanji lists), so an example never needs a character the learner has not met.
 */
export function parseVocabLevel(input: unknown, allowedKanji: ReadonlySet<string>) {
  return levelSchema
    .superRefine((data, ctx) => {
      const groupIds = new Set(data.groups.map((group) => group.id));
      const seen = new Set<string>();
      for (const [index, item] of data.items.entries()) {
        const errors: string[] = [];
        const key = `${item.word}|${item.reading}`;
        if (seen.has(key)) {
          errors.push("Duplicate word");
        }
        seen.add(key);
        if (!groupIds.has(item.group)) {
          errors.push(`Unknown group ${item.group}`);
        }
        const blanks = blankOf(item.example.ja);
        if (blanks.length !== 1) {
          errors.push("The example needs exactly one [[blank]]");
        }
        const answer = blanks[0] ?? "";
        const options = [answer, ...item.example.choices];
        if (new Set(options).size !== options.length) {
          errors.push("A wrong choice repeats the answer or another choice");
        }
        for (const text of [item.example.ja, ...item.example.choices]) {
          for (const character of text.match(HAN) ?? []) {
            if (!allowedKanji.has(character)) {
              errors.push(`${character} in "${text}" is not an N5/N4 kanji`);
            }
          }
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

export function isVocabLevel(value: string): value is VocabLevel {
  return (VOCAB_LEVELS as readonly string[]).includes(value);
}

// The words the official N4 sample papers asked about in their vocabulary parts (もんだい3–5), by
// reading in dictionary form. A test keeps `paper` on the items equal to this list.
export const N4_PAPER_WORDS: Record<string, number[]> = {
  かわく: [2012],
  ねっしん: [2012],
  きょうみ: [2012],
  ルール: [2012],
  ようい: [2012],
  そうだん: [2012],
  はこぶ: [2012],
  きけん: [2012],
  とめる: [2012],
  しゅっぱつ: [2012],
  ていねい: [2012],
  うまい: [2012],
  ねぼう: [2012],
  ほめる: [2012],
  るす: [2012, 2018],
  しんせつ: [2012],
  にがい: [2012],
  わる: [2012],
  ちこく: [2012],
  しんぱい: [2018],
  ゆめ: [2018],
  ぜひ: [2018],
  せつめい: [2018],
  かたい: [2018],
  さそう: [2018],
  センチ: [2018],
  くらべる: [2018],
  みつかる: [2018],
  アルバイト: [2018],
  すいえい: [2018],
  びっくり: [2018],
  うつくしい: [2018],
  ゆにゅう: [2018],
  さいきん: [2018],
  おと: [2018],
  けんがく: [2018],
  かざる: [2018],
  こうじ: [2018],
};

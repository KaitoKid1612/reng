// Furigana in Japanese lesson text is written as {漢字|かんじ}; text without braces is unchanged.
const FURIGANA = /\{([^{}|]+)\|([^{}|]+)\}/g;
// Kana, kanji, Japanese punctuation and full-width forms; Vietnamese text stays outside.
const JAPANESE_RUN =
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\u3000-\u303f\u30fb\u30fc\uff01-\uff5e]+/gu;
// 〜 marks where a word attaches (〜にん); it is never read aloud.
const PLACEHOLDER = /[〜～]/g;

export interface JapaneseSegment {
  text: string;
  reading?: string;
}

export function parseFurigana(value: string): JapaneseSegment[] {
  const segments: JapaneseSegment[] = [];
  let position = 0;
  for (const match of value.matchAll(FURIGANA)) {
    if (match.index > position) {
      segments.push({ text: value.slice(position, match.index) });
    }
    segments.push({ text: match[1].trim(), reading: match[2].trim() });
    position = match.index + match[0].length;
  }
  if (position < value.length) {
    segments.push({ text: value.slice(position) });
  }
  return segments;
}

// Speech uses the reading so device voices and generated audio do not guess kanji readings.
export function toSpeechText(value: string) {
  return value
    .replace(FURIGANA, (_match, _base: string, reading: string) => reading.trim())
    .replace(PLACEHOLDER, "")
    .trim();
}

// Labels, summaries and search descriptions keep the written form only.
export function toPlainJapanese(value: string) {
  return value.replace(FURIGANA, (_match, base: string) => base.trim());
}

// The written form and reading of every {漢字|かんじ} mark, in order.
export function listFuriganaMarks(value: string) {
  return [...value.matchAll(FURIGANA)].map((match) => ({
    base: match[1].trim(),
    reading: match[2].trim(),
  }));
}

// Trims inside each mark, so saved text strips the same way in the database (strip_furigana in
// migration 20261105044634) as it does here.
export function tidyFurigana(value: string) {
  return value.replace(
    FURIGANA,
    (_match, base: string, reading: string) => `{${base.trim()}|${reading.trim()}}`,
  );
}

// Removes marks exactly like strip_furigana in the database: the written form stays as typed.
export function stripFuriganaMarks(value: string) {
  return value.replace(FURIGANA, (_match, base: string) => base);
}

// A brace left once the well-formed marks are removed means a mark lost its "|" or a brace, and
// learners would see the raw text.
export function hasBrokenFurigana(value: string) {
  return /[{}]/.test(value.replace(FURIGANA, ""));
}

// Splits mixed Vietnamese/Japanese text so Japanese runs can be marked lang="ja" for the font.
export function splitJapaneseRuns(value: string) {
  const runs: { text: string; isJapanese: boolean }[] = [];
  let position = 0;
  for (const match of value.matchAll(JAPANESE_RUN)) {
    if (match.index > position) {
      runs.push({ text: value.slice(position, match.index), isJapanese: false });
    }
    runs.push({ text: match[0], isJapanese: true });
    position = match.index + match[0].length;
  }
  if (position < value.length) {
    runs.push({ text: value.slice(position), isJapanese: false });
  }
  return runs;
}

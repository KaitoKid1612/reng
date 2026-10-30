import { toHiragana, toKana, toKatakana } from "wanakana";

import type { InputMode } from "@/lib/assignment";

const ROMAJI_BEFORE_CARET = /[A-Za-z'-]+$/;
const ROMAJI_RUN = /[A-Za-z'-]+/g;
const JAPANESE_TEXT = /[぀-ヿ㐀-鿿]/;

// Converts only the Latin run the learner is typing, so kana/kanji already in the field
// (from an IME or a paste) and text after the caret stay untouched.
export function convertRomajiBeforeCaret(value: string, caret: number, mode: InputMode) {
  if (mode === "chinese" || mode === "pinyin" || mode === "text") {
    return { value, caret };
  }
  const head = value.slice(0, caret);
  const match = ROMAJI_BEFORE_CARET.exec(head);
  if (!match) {
    return { value, caret };
  }
  const converted = toKana(match[0], {
    IMEMode: mode === "katakana" ? "toKatakana" : "toHiragana",
  });
  const nextHead = head.slice(0, match.index) + converted;
  return { value: nextHead + value.slice(caret), caret: nextHead.length };
}

// Typing keeps a final n pending (よにn) because the next key may still make な or に; leaving
// the field completes only the leftover Latin runs, so entered kana and kanji never change.
export function finalizeRomaji(value: string, mode: InputMode) {
  if (mode === "chinese" || mode === "pinyin" || mode === "text") {
    return value;
  }
  return value.replace(ROMAJI_RUN, (run) =>
    mode === "katakana" ? toKatakana(run) : toHiragana(run),
  );
}

// A Japanese IME composes kana itself; Android keyboards also compose Latin text, which
// still needs conversion for learners without an IME.
export function isJapaneseComposition(isComposing: boolean, data: string | null) {
  return isComposing && JAPANESE_TEXT.test(data ?? "");
}

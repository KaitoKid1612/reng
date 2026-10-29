import { toKana } from "wanakana";

import type { InputMode } from "@/lib/assignment";

const ROMAJI_BEFORE_CARET = /[A-Za-z'-]+$/;
const JAPANESE_TEXT = /[぀-ヿ㐀-鿿]/;

// Converts only the Latin run the learner is typing, so kana/kanji already in the field
// (from an IME or a paste) and text after the caret stay untouched.
export function convertRomajiBeforeCaret(value: string, caret: number, mode: InputMode) {
  if (mode === "chinese" || mode === "pinyin") {
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

// A Japanese IME composes kana itself; Android keyboards also compose Latin text, which
// still needs conversion for learners without an IME.
export function isJapaneseComposition(isComposing: boolean, data: string | null) {
  return isComposing && JAPANESE_TEXT.test(data ?? "");
}

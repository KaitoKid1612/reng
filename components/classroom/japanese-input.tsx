"use client";

import { useLayoutEffect, useRef } from "react";

import { convertRomajiBeforeCaret, isJapaneseComposition } from "@/lib/romaji-input";

import type { InputMode } from "@/lib/assignment";
import type { ChangeEvent } from "react";

interface JapaneseInputProps {
  id: string;
  value: string;
  inputMode: InputMode;
  isDisabled: boolean;
  describedBy?: string;
  onValueChange: (value: string) => void;
}

const INPUT_LANGUAGES: Record<InputMode, string> = {
  chinese: "zh",
  pinyin: "zh-Latn-pinyin",
  hiragana: "ja",
  katakana: "ja",
  japanese: "ja",
};

const MODE_HINTS: Record<InputMode, string> = {
  chinese: "Dùng bộ gõ tiếng Trung hoặc dán chữ Hán; giữ đúng giản thể/phồn thể theo bài.",
  pinyin: "Nhập pinyin có dấu thanh theo yêu cầu, ví dụ nǐ hǎo.",
  hiragana: "Gõ romaji để ra hiragana, ví dụ ko → こ, nn → ん.",
  katakana: "Gõ romaji để ra katakana, ví dụ ko → コ.",
  japanese: "Gõ romaji ra hiragana, hoặc dùng bộ gõ tiếng Nhật/dán kanji.",
};

export function JapaneseInput({
  id,
  value,
  inputMode,
  isDisabled,
  describedBy,
  onValueChange,
}: JapaneseInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caretRef.current !== null && document.activeElement === inputRef.current) {
      inputRef.current?.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (inputMode === "chinese" || inputMode === "pinyin") {
      onValueChange(event.target.value);
      return;
    }
    const nativeEvent = event.nativeEvent;
    const isComposing = "isComposing" in nativeEvent && nativeEvent.isComposing === true;
    const data =
      "data" in nativeEvent && typeof nativeEvent.data === "string" ? nativeEvent.data : null;
    if (isJapaneseComposition(isComposing, data)) {
      onValueChange(event.target.value);
      return;
    }
    const converted = convertRomajiBeforeCaret(
      event.target.value,
      event.target.selectionEnd ?? event.target.value.length,
      inputMode,
    );
    caretRef.current = converted.caret;
    onValueChange(converted.value);
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        lang={INPUT_LANGUAGES[inputMode]}
        className="japanese-input"
        value={value}
        onChange={handleChange}
        disabled={isDisabled}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={200}
        aria-describedby={describedBy ? `${id}-hint ${describedBy}` : `${id}-hint`}
      />
      <p id={`${id}-hint`} className="small muted">
        {MODE_HINTS[inputMode]}
      </p>
    </>
  );
}

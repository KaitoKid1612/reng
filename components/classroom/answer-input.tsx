"use client";

import { useLayoutEffect, useRef } from "react";

import { INPUT_LANGS } from "@/lib/assignment";
import { convertPinyinBeforeCaret } from "@/lib/pinyin-input";
import {
  convertRomajiBeforeCaret,
  finalizeRomaji,
  isJapaneseComposition,
} from "@/lib/romaji-input";

import type { InputMode } from "@/lib/assignment";
import type { ChangeEvent, KeyboardEvent } from "react";

interface AnswerInputProps {
  id: string;
  value: string;
  inputMode: InputMode;
  isDisabled: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  enterKeyHint?: "next" | "done";
  onValueChange: (value: string) => void;
  onEnter?: () => void;
}

const MODE_HINTS: Record<InputMode, string> = {
  text: "Nhập văn bản theo yêu cầu của đề; giữ dấu tiếng Việt. Không tự chuyển sang kana.",
  chinese: "Dùng bộ gõ tiếng Trung hoặc dán chữ Hán; giữ đúng giản thể/phồn thể theo bài.",
  pinyin:
    "Nhập pinyin có dấu thanh, ví dụ nǐ hǎo. Không có dấu trên bàn phím thì gõ số thanh sau mỗi âm: ni3 hao3 → nǐ hǎo, v thay cho ü (lv4 → lǜ).",
  hiragana: "Gõ romaji để ra hiragana, ví dụ ko → こ; ん giữa từ gõ nn (さんにん: sannnin).",
  katakana: "Gõ romaji để ra katakana, ví dụ ko → コ.",
  japanese: "Gõ romaji ra hiragana, hoặc dùng bộ gõ tiếng Nhật/dán kanji.",
};

export function AnswerInput({
  id,
  value,
  inputMode,
  isDisabled,
  describedBy,
  autoFocus,
  enterKeyHint,
  onValueChange,
  onEnter,
}: AnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caretRef.current !== null && document.activeElement === inputRef.current) {
      inputRef.current?.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (inputMode === "pinyin") {
      const converted = convertPinyinBeforeCaret(
        event.target.value,
        event.target.selectionEnd ?? event.target.value.length,
      );
      caretRef.current = converted.caret;
      onValueChange(converted.value);
      return;
    }
    if (inputMode === "chinese" || inputMode === "text") {
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

  // Checking or submitting first moves focus to the button, so the answer is complete by then.
  function handleBlur() {
    const finalized = finalizeRomaji(value, inputMode);
    if (finalized !== value) {
      onValueChange(finalized);
    }
  }

  // Enter also confirms an IME conversion, so only a plain Enter moves on. It finishes a trailing
  // romaji "n" first, the same as leaving the field does.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!onEnter || event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    handleBlur();
    onEnter();
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        lang={INPUT_LANGS[inputMode]}
        className="answer-input"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        autoFocus={autoFocus}
        enterKeyHint={enterKeyHint}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={200}
        aria-describedby={describedBy ? `${id}-hint ${describedBy}` : `${id}-hint`}
      />
      <p id={`${id}-hint`} className="small muted answer-hint">
        {MODE_HINTS[inputMode]}
      </p>
    </>
  );
}

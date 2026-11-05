"use client";

import { useLayoutEffect, useRef } from "react";

import { isKanaReading, listReadingUnits } from "@/lib/furigana-units";
import {
  convertRomajiBeforeCaret,
  finalizeRomaji,
  isJapaneseComposition,
} from "@/lib/romaji-input";

import type { ChangeEvent } from "react";

interface ReadingInputProps {
  id: string;
  word: string;
  value: string;
  onValueChange: (value: string) => void;
}

// Readings are kana: romaji turns into hiragana while typing, and a Japanese IME works as usual.
function ReadingInput({ id, word, value, onValueChange }: ReadingInputProps) {
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current !== null && document.activeElement === input.current) {
      input.current?.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const native = event.nativeEvent;
    const isComposing = "isComposing" in native && native.isComposing === true;
    const data = "data" in native && typeof native.data === "string" ? native.data : null;
    if (isJapaneseComposition(isComposing, data)) {
      onValueChange(event.target.value);
      return;
    }
    const converted = convertRomajiBeforeCaret(
      event.target.value,
      event.target.selectionEnd ?? event.target.value.length,
      "hiragana",
    );
    caret.current = converted.caret;
    onValueChange(converted.value);
  }

  const isInvalid = Boolean(value.trim()) && !isKanaReading(value);
  return (
    <input
      ref={input}
      id={id}
      type="text"
      lang="ja"
      className="reading-input"
      value={value}
      aria-label={`Cách đọc của ${word}`}
      aria-invalid={isInvalid || undefined}
      autoComplete="off"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      maxLength={40}
      onChange={handleChange}
      onBlur={() => {
        const finished = finalizeRomaji(value, "hiragana");
        if (finished !== value) {
          onValueChange(finished);
        }
      }}
    />
  );
}

interface ReadingFieldsProps {
  idPrefix: string;
  caption?: string;
  text: string;
  readings: readonly string[];
  lang: string;
  onChange: (readings: string[]) => void;
}

/** One reading box per kanji word of `text`; an empty box means no furigana on that word. */
export function ReadingFields({
  idPrefix,
  caption,
  text,
  readings,
  lang,
  onChange,
}: ReadingFieldsProps) {
  const units = listReadingUnits(text);
  if (!units.length) {
    return null;
  }
  // The n-th 学校 keeps its box while the teacher edits text around it.
  const seen = new Map<string, number>();
  return (
    <div className="reading-fields">
      {caption && <p className="small muted fix-reading-caption">{caption}</p>}
      <div className="reading-grid">
        {units.map((unit, index) => {
          const occurrence = seen.get(unit.text) ?? 0;
          seen.set(unit.text, occurrence + 1);
          const id = `${idPrefix}-${index}`;
          return (
            <span key={`${unit.text}-${occurrence}`} className="reading-item">
              <label htmlFor={id} lang={lang} className="reading-word">
                {unit.text}
              </label>
              <ReadingInput
                id={id}
                word={unit.text}
                value={readings[index] ?? ""}
                onValueChange={(next) =>
                  onChange(units.map((_, item) => (item === index ? next : (readings[item] ?? ""))))
                }
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function hasInvalidReading(readings: readonly string[]) {
  return readings.some((reading) => Boolean(reading.trim()) && !isKanaReading(reading));
}

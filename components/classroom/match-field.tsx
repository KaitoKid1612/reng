"use client";

import { FuriganaText } from "@/components/lessons/japanese-text";
import { toPlainJapanese } from "@/lib/japanese-text";

import type { MatchOption } from "@/lib/assignment";

interface MatchFieldProps {
  id: string;
  left: string[];
  right: MatchOption[];
  value: [number, number][];
  lang: string;
  isDisabled: boolean;
  onValueChange: (value: [number, number][]) => void;
}

const LETTERS = "ABCDEFGH";

// The right column is a lettered list (with furigana) and each item on the left gets a menu of
// those letters. Menus work the same with a keyboard, a screen reader and a phone, without
// dragging; choosing an item another row already has moves it to this row.
export function MatchField({
  id,
  left,
  right,
  value,
  lang,
  isDisabled,
  onValueChange,
}: MatchFieldProps) {
  function choose(row: number, choice: string) {
    const kept = value.filter(([item, partner]) => item !== row && String(partner) !== choice);
    const next: [number, number][] = choice === "" ? kept : [...kept, [row, Number(choice)]];
    onValueChange(next.sort(([first], [second]) => first - second));
  }
  return (
    <div className="match-field">
      <ul className="match-options" aria-label="Các mục để ghép">
        {right.map((option, position) => (
          <li key={option.index}>
            <span className="match-letter" aria-hidden="true">
              {LETTERS[position]}
            </span>
            <span lang={lang}>
              <FuriganaText text={option.text} />
            </span>
          </li>
        ))}
      </ul>
      <ul className="match-rows">
        {left.map((item, row) => {
          const chosen = value.find(([leftRow]) => leftRow === row)?.[1];
          return (
            <li key={row}>
              <label htmlFor={`${id}-${row}`} lang={lang}>
                <FuriganaText text={item} />
              </label>
              <select
                id={`${id}-${row}`}
                value={chosen === undefined ? "" : String(chosen)}
                disabled={isDisabled}
                onChange={(event) => choose(row, event.target.value)}
              >
                <option value="">Chọn…</option>
                {right.map((option, position) => (
                  <option key={option.index} value={option.index}>
                    {`${LETTERS[position]}. ${toPlainJapanese(option.text)}`}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { filledMatchRows, MAX_MATCH_PAIRS, MIN_MATCH_PAIRS } from "@/lib/match-pairs";
import { toPlainJapanese } from "@/lib/japanese-text";

interface MatchPairsFieldProps {
  id: string;
  leftText: string;
  rightText: string;
  lang: string;
  onChange: (columns: { leftText: string; rightText: string }) => void;
}

// Two columns typed side by side: line n on the left pairs with line n on the right.
export function MatchPairsField({ id, leftText, rightText, lang, onChange }: MatchPairsFieldProps) {
  const rows = filledMatchRows(leftText.split("\n"), rightText.split("\n"));
  return (
    <div className="match-pairs-field">
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${id}-left`}>Cột trái (mỗi dòng một mục)</label>
          <textarea
            id={`${id}-left`}
            lang={lang}
            rows={5}
            spellCheck={false}
            value={leftText}
            onChange={(event) => onChange({ leftText: event.target.value, rightText })}
            aria-describedby={`${id}-match-hint`}
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-right`}>Cột phải (cùng dòng là cặp đúng)</label>
          <textarea
            id={`${id}-right`}
            lang={lang}
            rows={5}
            spellCheck={false}
            value={rightText}
            onChange={(event) => onChange({ leftText, rightText: event.target.value })}
            aria-describedby={`${id}-match-hint`}
          />
        </div>
      </div>
      <p id={`${id}-match-hint`} className="small muted">
        Học viên thấy cột phải đã xáo trộn và chọn mục ghép với từng dòng cột trái. Từ{" "}
        {MIN_MATCH_PAIRS} đến {MAX_MATCH_PAIRS} cặp; trong một cột không có hai mục giống nhau.
      </p>
      {rows.length > 0 && (
        <p className="small">
          Các cặp đúng:{" "}
          <span lang={lang}>
            {rows
              .map((row) => `${toPlainJapanese(row.left)} → ${toPlainJapanese(row.right)}`)
              .join(" · ")}
          </span>
        </p>
      )}
    </div>
  );
}

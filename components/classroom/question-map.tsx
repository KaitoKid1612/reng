"use client";

import { useRef } from "react";

export type QuestionMapState = "blank" | "answered" | "correct" | "wrong";

export interface QuestionMapItem {
  id: string;
  state: QuestionMapState;
}

interface QuestionMapProps {
  items: QuestionMapItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

// Correct and wrong share a lightness, so each gets a mark as well as a colour (WCAG 1.4.1).
const STATE_MARKS: Partial<Record<QuestionMapState, string>> = { correct: "✓", wrong: "✗" };

const STATE_LABELS: Record<QuestionMapState, string> = {
  blank: "chưa trả lời",
  answered: "đã trả lời",
  correct: "đúng",
  wrong: "chưa đúng",
};

// Daily sets run to 60 questions; the map shows which are still blank and jumps to any of them.
// It stays folded so it never pushes the current question below the fold on a phone.
export function QuestionMap({ items, currentIndex, onSelect }: QuestionMapProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const answeredCount = items.filter((item) => item.state !== "blank").length;

  // The map folds again after a jump so the chosen question is what the learner sees.
  function handleSelect(index: number) {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
    onSelect(index);
  }

  return (
    <details ref={detailsRef} className="question-map">
      <summary>
        Danh sách câu: đã trả lời {answeredCount}/{items.length}
      </summary>
      <div className="question-map-grid">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            data-state={item.state}
            aria-current={index === currentIndex ? "step" : undefined}
            aria-label={`Câu ${index + 1}, ${STATE_LABELS[item.state]}`}
            onClick={() => handleSelect(index)}
          >
            {index + 1}
            {STATE_MARKS[item.state] && (
              <span className="question-map-mark" aria-hidden="true">
                {STATE_MARKS[item.state]}
              </span>
            )}
          </button>
        ))}
      </div>
    </details>
  );
}

import Link from "next/link";

import { ANSWER_OUTCOME_LABELS, outcomeHref } from "@/lib/answer-outcome";

import type { AnswerOutcome } from "@/lib/answer-outcome";

interface OutcomeFilterProps {
  path: string;
  outcome: AnswerOutcome | undefined;
  counts: { all: number; correct: number; wrong: number };
}

// Links rather than buttons: the filter works without scripts and keeps its place on reload.
export function OutcomeFilter({ path, outcome, counts }: OutcomeFilterProps) {
  const options: { key: AnswerOutcome | undefined; label: string; count: number }[] = [
    { key: undefined, label: "Tất cả", count: counts.all },
    { key: "wrong", label: ANSWER_OUTCOME_LABELS.wrong, count: counts.wrong },
    { key: "correct", label: ANSWER_OUTCOME_LABELS.correct, count: counts.correct },
  ];
  return (
    <nav className="filter-pills" aria-label="Lọc câu theo kết quả">
      {options.map((option) => (
        <Link
          key={option.key ?? "all"}
          href={outcomeHref(path, option.key)}
          aria-current={option.key === outcome ? "true" : undefined}
          prefetch={false}
          scroll={false}
        >
          {option.label} <span className="filter-pill-count">{option.count}</span>
        </Link>
      ))}
    </nav>
  );
}

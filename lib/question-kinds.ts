// How a learner does on each kind of question, from answers whose results may already be shown.

export type QuestionKind = "choice" | "fill" | "order" | "match" | "listening" | "reading";

export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  choice: "Trắc nghiệm",
  fill: "Điền từ",
  order: "Sắp xếp câu",
  match: "Ghép cặp",
  listening: "Nghe",
  reading: "Đọc hiểu",
};

const KIND_ORDER: readonly QuestionKind[] = [
  "choice",
  "fill",
  "order",
  "match",
  "listening",
  "reading",
];

// Fewer answers than this say little about a weak spot.
export const MIN_KIND_ANSWERS = 5;

// A question about a reading passage counts as reading whatever its form; dictation is listening.
export function questionKind(type: string, hasPassage: boolean): QuestionKind | null {
  if (hasPassage) {
    return "reading";
  }
  if (type === "listen" || type === "dictation") {
    return "listening";
  }
  return type === "choice" || type === "fill" || type === "order" || type === "match" ? type : null;
}

export interface KindStat {
  kind: QuestionKind;
  label: string;
  answered: number;
  correct: number;
  percent: number;
}

export function summarizeQuestionKinds(
  answers: readonly { kind: QuestionKind; isCorrect: boolean }[],
): KindStat[] {
  return KIND_ORDER.flatMap((kind) => {
    const ofKind = answers.filter((answer) => answer.kind === kind);
    if (!ofKind.length) {
      return [];
    }
    const correct = ofKind.filter((answer) => answer.isCorrect).length;
    return [
      {
        kind,
        label: QUESTION_KIND_LABELS[kind],
        answered: ofKind.length,
        correct,
        percent: Math.round((correct / ofKind.length) * 100),
      },
    ];
  });
}

// The kind with the lowest share right, among kinds with enough answers; none with one kind only.
export function weakestKind(stats: readonly KindStat[]) {
  const counted = stats.filter((stat) => stat.answered >= MIN_KIND_ANSWERS);
  if (counted.length < 2) {
    return null;
  }
  const weakest = counted.reduce((low, stat) => (stat.percent < low.percent ? stat : low));
  return counted.every((stat) => stat.percent === weakest.percent) ? null : weakest;
}

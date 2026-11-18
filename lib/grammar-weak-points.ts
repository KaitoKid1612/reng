import { grammarRefs } from "@/lib/grammar-links";

// How far back the class page looks for grammar a learner keeps getting wrong.
export const WEAK_GRAMMAR_DAYS = 30;
export const WEAK_GRAMMAR_LIMIT = 8;

export interface GrammarAnswer {
  tags: readonly string[];
  isCorrect: boolean;
  answeredAt: string;
}

export interface GrammarWeakPoint {
  id: string;
  attempts: number;
  wrong: number;
  // The newest answer on this point: a point put right since drops below the ones still wrong.
  isLastCorrect: boolean;
}

// Grammar points answered wrong at least once, the ones still wrong on the newest answer first,
// then by share of wrong answers and by how often they came up.
// Only points the class can open (a lesson of the class explains them) are listed when `known`
// is given, so every row has somewhere to go.
export function summarizeGrammarWeakPoints(
  answers: readonly GrammarAnswer[],
  known?: ReadonlySet<string>,
  limit = WEAK_GRAMMAR_LIMIT,
): GrammarWeakPoint[] {
  const points = new Map<string, GrammarWeakPoint & { lastAt: string }>();
  for (const answer of answers) {
    for (const id of new Set(grammarRefs(answer.tags))) {
      const point = points.get(id) ?? {
        id,
        attempts: 0,
        wrong: 0,
        isLastCorrect: answer.isCorrect,
        lastAt: "",
      };
      point.attempts += 1;
      point.wrong += answer.isCorrect ? 0 : 1;
      if (answer.answeredAt >= point.lastAt) {
        point.lastAt = answer.answeredAt;
        point.isLastCorrect = answer.isCorrect;
      }
      points.set(id, point);
    }
  }
  return [...points.values()]
    .filter((point) => point.wrong > 0 && (!known || known.has(point.id)))
    .sort(
      (first, second) =>
        Number(first.isLastCorrect) - Number(second.isLastCorrect) ||
        second.wrong / second.attempts - first.wrong / first.attempts ||
        second.wrong - first.wrong ||
        first.id.localeCompare(second.id),
    )
    .slice(0, limit)
    .map(({ id, attempts, wrong, isLastCorrect }) => ({ id, attempts, wrong, isLastCorrect }));
}

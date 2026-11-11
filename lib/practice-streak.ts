export interface PracticeStreak {
  // Right answers in a row up to the latest answer; 0 after a wrong one.
  current: number;
  // The longest run of right answers in the session so far.
  best: number;
}

// Self-study sessions show the learner's run of right answers to keep the drill lively.
export function countPracticeStreak(results: readonly boolean[]): PracticeStreak {
  let current = 0;
  let best = 0;
  for (const isCorrect of results) {
    current = isCorrect ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best };
}

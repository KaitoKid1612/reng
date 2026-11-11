import { test } from "node:test";
import assert from "node:assert/strict";

import { countPracticeStreak } from "../lib/practice-streak";

test("A practice streak counts the latest run of right answers and keeps the longest one", () => {
  assert.deepEqual(countPracticeStreak([]), { current: 0, best: 0 });
  assert.deepEqual(countPracticeStreak([true, true, false, true]), { current: 1, best: 2 });
  assert.deepEqual(countPracticeStreak([false, true, true, true]), { current: 3, best: 3 });
  assert.deepEqual(countPracticeStreak([true, true, true, false]), { current: 0, best: 3 });
});

import { test } from "node:test";
import assert from "node:assert/strict";

import { describeStreak, reachedStreakMilestones } from "../lib/study-streak";

test("A streak aims at the next milestone and remembers the last one reached", () => {
  assert.deepEqual(describeStreak(0, false), {
    days: 0,
    hasStudiedToday: false,
    previousMilestone: 0,
    nextMilestone: 3,
  });
  assert.equal(describeStreak(3, true).previousMilestone, 3);
  assert.equal(describeStreak(3, true).nextMilestone, 7);
  assert.equal(describeStreak(29, true).nextMilestone, 30);
  assert.equal(describeStreak(400, true).nextMilestone, null);
  assert.deepEqual(reachedStreakMilestones(15), [3, 7, 14]);
});

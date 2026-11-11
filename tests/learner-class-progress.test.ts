import { test } from "node:test";
import assert from "node:assert/strict";

import { countClassWork } from "../lib/learner-class-progress";

test("Class progress counts handed-in work against all work given, per class", () => {
  const progress = countClassWork([
    { classId: "a", status: "submitted" },
    { classId: "a", status: "in_progress" },
    { classId: "a", status: "past_due" },
    { classId: "a", status: "not_available" },
    { classId: "b", status: "not_started" },
  ]);
  assert.deepEqual(progress.get("a"), { submitted: 1, total: 3 });
  assert.deepEqual(progress.get("b"), { submitted: 0, total: 1 });
  assert.equal(progress.get("c"), undefined);
});

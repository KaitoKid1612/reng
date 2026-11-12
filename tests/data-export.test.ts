import { test } from "node:test";
import assert from "node:assert/strict";

import { parseAssignableQuestion } from "../lib/assignment";
import { canExportResults, exportAttempt, HIDDEN_RESULTS_NOTE } from "../lib/data-export";

import type { ExportAttemptInput } from "../lib/data-export";

const question = parseAssignableQuestion({
  id: "q1",
  type: "choice",
  prompt: "わたし___ がくせいです。",
  options: ["は", "を"],
  multiple: false,
  answer: [0],
  explain: "は đánh dấu chủ đề.",
  points: 1,
});

const now = new Date("2026-11-12T10:00:00Z");

function input(overrides: Partial<ExportAttemptInput["assignment"]>): ExportAttemptInput {
  return {
    assignment: {
      title: "Kiểm tra nhanh",
      mode: "test",
      feedbackPolicy: "after_due",
      dueAt: "2026-11-13T10:00:00Z",
      ...overrides,
    },
    className: "Lớp A",
    attempt: {
      attemptNo: 1,
      status: "submitted",
      startedAt: "2026-11-12T09:00:00Z",
      submittedAt: "2026-11-12T09:10:00Z",
      isLate: false,
      score: 0,
      maxScore: 1,
      passed: false,
    },
    questions: [question],
    answers: [{ question_id: "q1", raw: [1], is_correct: false, points_earned: 0 }],
  };
}

test("A test before its feedback time exports only the receipt, not answers or score", () => {
  const hidden = exportAttempt(input({}), now);
  assert.equal(hidden.results, null);
  assert.equal(hidden.note, HIDDEN_RESULTS_NOTE);
  assert.equal(hidden.submitted_at, "2026-11-12T09:10:00Z");
  assert.doesNotMatch(JSON.stringify(hidden), /がくせい|"score"/);
});

test("After the feedback time an attempt exports each answer with the right one and points", () => {
  const shown = exportAttempt(input({ dueAt: "2026-11-12T09:30:00Z" }), now);
  assert.deepEqual(shown.results, {
    score: 0,
    max_score: 1,
    passed: false,
    answers: [
      {
        question: "わたし___ がくせいです。",
        your_answer: "を",
        correct_answer: "は",
        is_correct: false,
        points_earned: 0,
        points: 1,
      },
    ],
  });
  assert.equal(
    canExportResults(
      { feedbackPolicy: "after_submit", dueAt: null },
      { status: "submitted", submittedAt: "2026-11-12T09:10:00Z" },
      now,
    ),
    true,
  );
  assert.equal(
    canExportResults(
      { feedbackPolicy: "after_submit", dueAt: null },
      { status: "in_progress", submittedAt: null },
      now,
    ),
    false,
  );
});

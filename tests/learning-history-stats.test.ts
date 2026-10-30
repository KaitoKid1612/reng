import assert from "node:assert/strict";
import { test } from "node:test";

import {
  averagePercent,
  describeScoreDelta,
  formatDayScore,
  formatDayScoreLabel,
  historyDayScores,
  historyKindAccuracy,
  historyLatestScore,
  historyOverview,
  scoreBand,
  scoredDays,
} from "../lib/learning-history-stats";

import type {
  HistoryAnswer,
  HistoryArchive,
  HistoryOutcome,
  HistorySession,
} from "../lib/learning-history";

let nextRow = 2;

function session(date: string, score: number | null, scoreScale: 10 | 100 = 10): HistorySession {
  nextRow += 1;
  return {
    sourceRow: nextRow,
    date,
    title: "Bài tự soạn",
    total: 10,
    completed: null,
    correct: null,
    incorrect: null,
    unanswered: null,
    score,
    scoreScale,
    gradedAtText: "",
  };
}

function answer(date: string, outcome: HistoryOutcome, kind = "Điền"): HistoryAnswer {
  nextRow += 1;
  return {
    sourceRow: nextRow,
    date,
    lesson: "Bài thử",
    number: "1",
    sourceId: "",
    kind,
    prompt: "Đề tự soạn",
    response: "",
    resultText: "",
    outcome,
    note: "",
    gradedAtText: "",
  };
}

function archive(sessions: HistorySession[], answers: HistoryAnswer[]): HistoryArchive {
  return {
    schemaVersion: 1,
    learnerName: "Học viên thử",
    course: "JLPT N5",
    languageTag: "ja-JP",
    sourceLabel: "Dữ liệu tự soạn",
    sourceTabs: { summaries: "Tong_hop", answers: "Cau" },
    sessions,
    answers,
  };
}

test("score bands use the 80% target and keep missing scores apart from zero", () => {
  assert.equal(scoreBand(80), "good");
  assert.equal(scoreBand(79.9), "fair");
  assert.equal(scoreBand(60), "fair");
  assert.equal(scoreBand(59.9), "low");
  assert.equal(scoreBand(0), "low");
  assert.equal(scoreBand(null), "none");
});

test("day scores cover answer-only days, normalise scales and never invent a zero", () => {
  const days = historyDayScores(
    archive(
      [
        session("2026-10-02", 7),
        session("2026-10-02", 8),
        session("2026-10-05", null),
        session("2026-10-06", 45, 100),
        session("2026-10-06", 8),
      ],
      [answer("2026-10-04", "correct")],
    ),
  );
  assert.deepEqual(
    days.map((day) => day.date),
    ["2026-10-02", "2026-10-04", "2026-10-05", "2026-10-06"],
  );
  const [twoSessions, answersOnly, blank, mixedScales] = days;
  assert.equal(twoSessions?.percent, 75);
  assert.equal(twoSessions && formatDayScore(twoSessions), "7,5");
  assert.equal(twoSessions && formatDayScoreLabel(twoSessions), "7,5 / 10 (75%)");
  assert.equal(answersOnly?.percent, null);
  assert.equal(blank && formatDayScoreLabel(blank), "chưa có điểm");
  // 45/100 and 8/10 average to 62.5%; no single source scale can show that day.
  assert.equal(mixedScales?.percent, 62.5);
  assert.equal(mixedScales?.score, null);
  assert.equal(mixedScales && formatDayScore(mixedScales), "63%");
});

test("the latest score compares with the mean of up to five earlier scored sessions", () => {
  const sessions = [
    session("2026-10-01", 2),
    session("2026-10-02", 6),
    session("2026-10-03", null),
    session("2026-10-04", 7),
    session("2026-10-05", 8),
    session("2026-10-06", 6),
    session("2026-10-07", 9),
    // Same day, later source row: this one is the latest.
    session("2026-10-07", 8.5),
  ];
  const latest = historyLatestScore(sessions.toReversed());
  assert.equal(latest?.score, 8.5);
  assert.equal(latest?.baselineCount, 5);
  // Baseline 6, 7, 8, 6, 9 → 72%; the blank day and the oldest score are not used.
  assert.equal(latest?.deltaPercent, 13);
  assert.deepEqual(describeScoreDelta(13, 10), { text: "+1,3", direction: "up" });
  assert.deepEqual(describeScoreDelta(-4.04, 10), { text: "−0,4", direction: "down" });
  assert.deepEqual(describeScoreDelta(0.2, 10), { text: "0", direction: "same" });
  // Two sessions on one day count once, as that day's mean (90% and 85% → 87.5%).
  const days = scoredDays(historyDayScores({ sessions, answers: [] }));
  assert.deepEqual(
    days.slice(-3).map((day) => day.percent),
    [80, 60, 87.5],
  );
  // (20 + 60 + 70 + 80 + 60 + 87.5) / 6; the blank day is not a zero.
  assert.equal(Math.round((averagePercent(days) ?? 0) * 100) / 100, 62.92);
  assert.equal(averagePercent([]), null);

  const first = historyLatestScore([session("2026-10-01", 50, 100), session("2026-10-02", null)]);
  assert.equal(first?.percent, 50);
  assert.equal(first?.deltaPercent, null);
  assert.equal(historyLatestScore([session("2026-10-01", null)]), null);
});

test("overview accuracy counts only answers graded correct or incorrect", () => {
  const overview = historyOverview(
    archive(
      [session("2026-10-03", 9)],
      [
        answer("2026-10-01", "correct"),
        answer("2026-10-01", "correct"),
        answer("2026-10-01", "correct"),
        answer("2026-10-02", "incorrect"),
        answer("2026-10-02", "ungraded"),
        answer("2026-10-02", "unanswered"),
        answer("2026-10-02", "excluded"),
        answer("2026-10-02", "unknown"),
      ],
    ),
  );
  assert.equal(overview.dayCount, 3);
  assert.equal(overview.firstDate, "2026-10-01");
  assert.equal(overview.lastDate, "2026-10-03");
  assert.equal(overview.gradedCount, 4);
  assert.equal(overview.accuracyPercent, 75);
  assert.equal(overview.outcomes.unknown, 1);
  assert.equal(overview.latest?.percent, 90);

  const empty = historyOverview(archive([], []));
  assert.equal(empty.dayCount, 0);
  assert.equal(empty.accuracyPercent, null);
  assert.equal(empty.latest, null);
});

test("kind accuracy ranks the weakest kinds and sums the small ones into one row", () => {
  const answers = [
    ...Array.from({ length: 5 }, (_, index) =>
      answer("2026-10-01", index < 4 ? "correct" : "incorrect", "Từ vựng"),
    ),
    // Same kind typed with other case, spacing and decomposed accents.
    answer("2026-10-01", "correct", "từ  vựng"),
    answer("2026-10-01", "incorrect", "Từ vựng".normalize("NFD")),
    ...Array.from({ length: 6 }, (_, index) =>
      answer("2026-10-01", index < 3 ? "correct" : "incorrect", " Ngữ  pháp "),
    ),
    answer("2026-10-01", "incorrect", "Kanji"),
    answer("2026-10-01", "ungraded", "Kanji"),
    answer("2026-10-01", "correct", ""),
  ];
  const { ranked, sparse, other } = historyKindAccuracy(answers);
  assert.deepEqual(
    ranked.map((item) => [item.kind, item.correct, item.graded]),
    [
      ["Ngữ pháp", 3, 6],
      ["Từ vựng", 5, 7],
    ],
  );
  assert.deepEqual(
    sparse.map((item) => [item.kind, item.correct, item.graded]),
    [
      ["", 1, 1],
      ["Kanji", 0, 1],
    ],
  );
  assert.deepEqual(other, { kindCount: 2, correct: 1, graded: 2, percent: 50 });
  assert.equal(historyKindAccuracy(answers.slice(0, 5)).other, null);
});

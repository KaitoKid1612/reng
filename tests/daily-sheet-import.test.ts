import assert from "node:assert/strict";
import { test } from "node:test";

import { importDailySheet } from "../lib/daily-sheet-import";

const KINDS = ["Ngữ pháp", "Từ vựng", "Kanji", "Tổng hợp"];

// Fictional rows laid out like the teacher's sheet: title rows, then the header row.
function sheet(options: { answeredRow?: number; missingKey?: string } = {}) {
  const todayIds = Array.from({ length: 60 }, (_, index) => `T-${index + 1}`);
  const today: unknown[][] = [
    ["Bài hôm nay"],
    ["Ngày", "2026-10-30", "", "", "", "", "", "Số câu", 60],
    [],
    ["Hạn nộp", "22:30"],
    [],
    ["STT", "Dạng bài", "Câu hỏi", "Câu trả lời", "Kết quả", "Ghi chú", "ID"],
    ...todayIds.map((id, index) => [
      index + 1,
      KINDS[index % KINDS.length],
      `Câu hỏi tự soạn ${index + 1}`,
      index === options.answeredRow ? "đã làm" : "",
      "",
      "",
      id,
    ]),
  ];
  const history: unknown[][] = [
    ["Lịch sử"],
    [],
    ["Ngày", "Phạm vi", "STT", "ID", "Dạng bài", "Câu hỏi", "Câu trả lời", "Kết quả", "Ghi chú"],
    ["2026-10-28", "Bài 1", 1, "H-1", "Từ vựng", "Nghĩa của げつようび?", "", "", ""],
    ["2026-10-29", "Bài 2", 1, "H-2", "Ngữ pháp", "わたし（　）がくせいです。", "", "", ""],
    // No answer key: left out of the bank.
    ["2026-10-29", "Bài 2", 2, "H-3", "Kanji", "Đọc 学校", "", "", ""],
    // Already in today's set.
    ["2026-10-29", "Bài 2", 3, "T-1", "Ngữ pháp", "Câu hỏi tự soạn 1", "", "", ""],
  ];
  const keys: unknown[][] = [
    ["Đáp án"],
    [],
    ["ID", "Bài", "Đáp án chuẩn", "Chấp nhận thêm"],
    ...todayIds
      .filter((id) => id !== options.missingKey)
      .map((id) => [id, "Bài 1", "がっこう", "学校 / ガッコウ"]),
    ["H-1", "Bài 1", "thứ hai", ""],
    ["H-2", "Bài 2", "は", ""],
  ];
  return { today, history, keys };
}

test("the daily sheet becomes today's 60 ids and a bank with typed answer rules", () => {
  const result = importDailySheet(sheet());
  assert.equal(result.date, "2026-10-30");
  assert.equal(result.dueAt, "2026-10-30T22:30:00+07:00");
  assert.equal(result.todayIds.length, 60);
  assert.equal(result.todayIds[0], "t-1");
  const questions = result.draft.content.questions;
  // Today's 60 first, then history rows that have a key, newest first, without duplicates.
  assert.deepEqual(
    questions.slice(60).map((question) => question.id),
    ["h-2", "h-1"],
  );
  const first = questions[0];
  assert.equal(first?.type, "fill");
  assert.deepEqual(first?.tags, ["Ngữ pháp"]);
  if (first?.type === "fill") {
    assert.equal(first.inputMode, "japanese");
    assert.ok(first.answer.includes("がっこう") && first.answer.includes("学校"));
  }
  const vietnamese = questions.find((question) => question.id === "h-1");
  assert.ok(vietnamese?.type === "fill" && vietnamese.inputMode === "text");
});

test("the daily sheet import refuses work already started or a question without a key", () => {
  assert.throws(() => importDailySheet(sheet({ answeredRow: 3 })), /already has work/);
  assert.throws(() => importDailySheet(sheet({ missingKey: "T-5" })), /no approved source/);
});

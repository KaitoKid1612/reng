import assert from "node:assert/strict";
import { test } from "node:test";

import { importHistorySheets } from "../lib/history-sheet-import";
import {
  classifyHistoryOutcome,
  historyDates,
  historyScoreLabel,
  parseHistoryNumber,
} from "../lib/learning-history";

const summaryHeaders = ["Ngày", "Nội dung", "Tổng câu", "Đúng", "Sai", "Chưa làm", "Điểm %"];
const answerHeaders = [
  "Ngày",
  "Bài",
  "Câu",
  "Dạng bài",
  "Câu hỏi",
  "Câu trả lời của học sinh",
  "Kết quả",
  "Chấm lúc",
];

test("source decimal commas, zero scores and blank scores stay distinct", () => {
  assert.equal(parseHistoryNumber("6,888888889"), 6.888888889);
  assert.equal(parseHistoryNumber("0"), 0);
  assert.equal(parseHistoryNumber(""), null);
  assert.equal(parseHistoryNumber(undefined), null);
  assert.throws(() => parseHistoryNumber("6 points"));
});

test("source grading labels retain unknown, excluded and unanswered cases", () => {
  for (const result of ["OK", "OK — nhận xét", "Đúng"]) {
    assert.equal(classifyHistoryOutcome(result, "a"), "correct");
  }
  for (const result of ["X", "Sai", "SAI — nhận xét"]) {
    assert.equal(classifyHistoryOutcome(result, "a"), "incorrect");
  }
  assert.equal(classifyHistoryOutcome("CHƯA LÀM — ghi chú", ""), "unanswered");
  assert.equal(classifyHistoryOutcome("KHÔNG TÍNH", "a"), "excluded");
  assert.equal(classifyHistoryOutcome("", "a"), "ungraded");
  assert.equal(classifyHistoryOutcome("", ""), "unanswered");
  assert.equal(classifyHistoryOutcome("Đợi giáo viên", "a"), "unknown");
});

test("sheet import preserves source rows, answer-only dates and original scores", () => {
  const archive = importHistorySheets(
    "viet",
    {
      rows: [
        summaryHeaders,
        ["2026-10-20", "Ôn tập", "10", "0", "0", "10", "0"],
        ["2026-10-21", "Chưa chấm", "10"],
      ],
    },
    {
      rows: [
        answerHeaders,
        [],
        [
          "2026-10-19",
          "Bài tự soạn",
          "1",
          "Điền",
          "Đề tự soạn",
          "<script>x</script>",
          "SAI — xem lại",
          "ghi chú giờ chấm",
        ],
      ],
    },
  );
  assert.equal(archive.answers[0].sourceRow, 3);
  assert.equal(archive.answers[0].response, "<script>x</script>");
  assert.equal(archive.sessions[0].score, 0);
  assert.equal(archive.sessions[1].score, null);
  assert.equal(historyScoreLabel(archive.sessions[0]), "0 / 100");
  assert.equal(historyScoreLabel(archive.sessions[1]), "Chưa có điểm");
  assert.deepEqual(historyDates(archive), ["2026-10-21", "2026-10-20", "2026-10-19"]);
  assert.throws(() =>
    importHistorySheets("viet", { rows: [["Wrong header"]] }, { rows: [answerHeaders] }),
  );
});

test("N5 imports keep repeated source question IDs and their original ten-point scale", () => {
  const archive = importHistorySheets(
    "nguyen",
    {
      rows: [
        ["Ngày", "Phạm vi", "Số câu", "Đã làm", "Đúng", "Sai", "Điểm /10", "Thời gian chấm"],
        ["2026-10-20", "Ôn", 2, 2, 1, 1, "5", "Ghi chú nguồn"],
      ],
    },
    {
      rows: [
        ["Title"],
        ["Note"],
        [
          "Ngày",
          "Phạm vi",
          "STT",
          "ID",
          "Dạng bài",
          "Câu hỏi",
          "Câu trả lời",
          "Kết quả",
          "Ghi chú",
        ],
        ["2026-10-20", "Ôn", 1, "repeated", "Điền", "Đề 1", "a", "X", "Ghi chú"],
        ["2026-10-20", "Ôn", 1, "repeated", "Điền", "Đề 2", "b", "OK"],
      ],
    },
  );
  assert.equal(archive.answers.length, 2);
  assert.notEqual(archive.answers[0].sourceRow, archive.answers[1].sourceRow);
  assert.equal(historyScoreLabel(archive.sessions[0]), "5 / 10");
});

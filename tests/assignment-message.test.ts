import assert from "node:assert/strict";
import { test } from "node:test";

import { buildAssignmentMessage } from "../lib/assignment-message";

const base = {
  className: "Tiếng Nhật Minna – Lớp 1",
  title: "Luyện bài 11 — đếm đồ vật",
  url: "https://reng-class.vercel.app/assignments/00000000-0000-4000-8000-000000000001",
};

test("the class chat message names the class, the work, the Vietnam-time deadline and the link", () => {
  assert.equal(
    buildAssignmentMessage({
      ...base,
      mode: "practice",
      dueAt: "2026-11-06T16:59:00.000Z",
      allowLate: true,
    }),
    [
      "Lớp Tiếng Nhật Minna – Lớp 1: có bài luyện tập mới «Luyện bài 11 — đếm đồ vật».",
      "Hạn nộp: 23:59 06/11/2026 (nộp muộn vẫn được).",
      `Làm bài tại: ${base.url}`,
    ].join("\n"),
  );
});

test("the message says when late work is refused and when there is no deadline", () => {
  const testMessage = buildAssignmentMessage({
    ...base,
    mode: "test",
    dueAt: "2026-11-06T17:05:00.000Z",
    allowLate: false,
  });
  assert.match(testMessage, /có bài kiểm tra mới/);
  // 17:05 UTC is already the next day in Vietnam.
  assert.match(testMessage, /Hạn nộp: 00:05 07\/11\/2026, sau hạn không nộp\./);
  assert.match(
    buildAssignmentMessage({ ...base, mode: "practice", dueAt: null, allowLate: true }),
    /\nKhông có hạn nộp\.\n/,
  );
});

test("a class name that already starts with Lớp is not prefixed twice", () => {
  const message = (className: string) =>
    buildAssignmentMessage({ ...base, className, mode: "practice", dueAt: null, allowLate: true });
  assert.match(message("Lớp đọc hiểu"), /^Lớp đọc hiểu: có bài/);
  assert.match(message("LỚP A"), /^LỚP A: có bài/);
  // A word that only begins with the same letters is still a name to prefix.
  assert.match(message("Lớpxyz"), /^Lớp Lớpxyz: có bài/);
});

test("a JLPT mock exam names the exam, its time per attempt and when to start", () => {
  const message = buildAssignmentMessage({
    ...base,
    title: "Thi thử JLPT N5 — 09/11",
    mode: "test",
    dueAt: "2026-11-16T16:59:00.000Z",
    allowLate: false,
    exam: { level: "N5", timeLimitMinutes: 90 },
  });
  assert.match(
    message,
    /có đề thi thử JLPT N5 mới «Thi thử JLPT N5 — 09\/11», làm trong 90 phút từ lúc bấm Bắt đầu thi\./,
  );
  assert.match(message, /\nBắt đầu thi trước 23:59 16\/11\/2026\.\n/);
});

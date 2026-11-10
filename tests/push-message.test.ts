import assert from "node:assert/strict";
import { test } from "node:test";

import { describeReminderPush, TEST_PUSH_MESSAGE } from "@/lib/notifications/push-message";

test("the evening notification sums up the work in one line and opens the class list", () => {
  const message = describeReminderPush({
    dueCards: 12,
    openCount: 2,
    assignments: [
      {
        title: "Thi thử JLPT N4 — 10/11",
        dueAt: "2026-11-17T16:59:00.000Z",
        isOverdue: false,
        isDueSoon: false,
      },
      { title: "Luyện tập bài 12", dueAt: null, isOverdue: false, isDueSoon: false },
    ],
  });
  assert.deepEqual(message, {
    title: "Reng: việc học hôm nay",
    body: "2 bài cần làm: Thi thử JLPT N4 — 10/11 (hạn 23:59 17/11/2026) · 12 thẻ cần ôn",
    url: "/classes",
    tag: "daily-reminder",
  });
  assert.equal(
    describeReminderPush({ dueCards: 5, openCount: 0, assignments: [] }).body,
    "5 thẻ cần ôn",
  );
  assert.equal(
    describeReminderPush({
      dueCards: 0,
      openCount: 1,
      assignments: [
        { title: "Bài 3", dueAt: "2026-11-01T00:00:00Z", isOverdue: true, isDueSoon: true },
      ],
    }).body,
    "1 bài cần làm: Bài 3 (đã quá hạn)",
  );
  const long = describeReminderPush({
    dueCards: 0,
    openCount: 1,
    assignments: [{ title: "あ".repeat(300), dueAt: null, isOverdue: false, isDueSoon: false }],
  });
  assert.equal(long.body.length, 160);
  assert.ok(long.body.endsWith("…"));
  assert.ok(TEST_PUSH_MESSAGE.url.startsWith("/"));
});

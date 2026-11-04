import assert from "node:assert/strict";
import { test } from "node:test";

import { buildTeacherToday, MAX_TEACHER_TODAY_ROWS } from "../lib/teacher-today";

import type { TeacherTodayInput } from "../lib/teacher-today";

// 2026-11-03 is a Tuesday. Times are written in Vietnam time (+07:00).
const at = (local: string) => new Date(`${local}+07:00`);
const iso = (local: string) => at(local).toISOString();
const now = at("2026-11-03T18:00:00");

const tuesday = [{ weekday: 2, start: "19:30", minutes: 90 }];
const empty: TeacherTodayInput = {
  classes: [
    { id: "a", name: "Lớp A", slots: tuesday },
    { id: "b", name: "Lớp B", slots: [{ weekday: 2, start: "17:30", minutes: 60 }] },
    { id: "c", name: "Lớp C", slots: [{ weekday: 4, start: "19:30", minutes: 90 }] },
  ],
  assignments: [],
  submissions: [],
};

test("today's sessions come first in time order, a live one says so, other days are left out", () => {
  const { rows } = buildTeacherToday(empty, now);
  assert.deepEqual(
    rows.map((row) => [row.title, row.meta, row.action]),
    [
      ["Lớp B", "17:30–18:30 · đang diễn ra", "Vào lớp"],
      ["Lớp A", "19:30–21:00", "Mở lớp"],
    ],
  );
});

test("work still due today and classes with new submissions follow", () => {
  const { rows } = buildTeacherToday(
    {
      ...empty,
      classes: [{ id: "a", name: "Lớp A", slots: [] }],
      assignments: [
        { id: "later", classId: "a", title: "Tuần sau", dueAt: iso("2026-11-10T23:59:00") },
        {
          id: "today",
          classId: "a",
          title: "Luyện tập hằng ngày 03/11",
          dueAt: iso("2026-11-03T23:59:00"),
        },
        { id: "past", classId: "a", title: "Đã quá hạn", dueAt: iso("2026-11-03T12:00:00") },
        { id: "other", classId: "x", title: "Lớp người khác", dueAt: iso("2026-11-03T23:00:00") },
      ],
      submissions: [
        { classId: "a", count: 4 },
        { classId: "x", count: 9 },
      ],
    },
    now,
  );
  assert.deepEqual(
    rows.map((row) => [row.kind, row.title, row.meta]),
    [
      ["Bài tập hạn hôm nay", "Luyện tập hằng ngày 03/11", "Lớp A · hạn 23:59"],
      ["Bài nộp mới", "Lớp A", "4 bài nộp trong 24 giờ qua"],
    ],
  );
});

test("each group is capped and the rest is counted", () => {
  const classes = Array.from({ length: MAX_TEACHER_TODAY_ROWS + 3 }, (_, index) => ({
    id: `k${index}`,
    name: `Lớp ${index}`,
    slots: tuesday,
  }));
  const { rows, moreCount } = buildTeacherToday(
    {
      classes,
      assignments: [],
      submissions: classes.map((item, index) => ({ classId: item.id, count: index + 1 })),
    },
    now,
  );
  assert.equal(rows.filter((row) => row.kind === "Buổi dạy").length, MAX_TEACHER_TODAY_ROWS);
  assert.equal(
    rows.filter((row) => row.kind === "Bài nộp mới")[0]?.title,
    `Lớp ${MAX_TEACHER_TODAY_ROWS + 2}`,
  );
  assert.equal(moreCount, 6);
});

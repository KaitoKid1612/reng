import { describeSessionTime, findNextSession } from "@/lib/class-schedule";
import { formatStudyTime, toStudyDay } from "@/lib/study-days";

import type { ScheduleSlot } from "@/lib/class-schedule";
import type { TodayRow } from "@/lib/learner-today";

// Each group lists a few rows; a teacher with many classes sees how many more there are.
export const MAX_TEACHER_TODAY_ROWS = 5;

export interface TeacherTodayClass {
  id: string;
  name: string;
  slots: readonly ScheduleSlot[];
}

export interface TeacherTodayAssignment {
  id: string;
  classId: string;
  title: string;
  dueAt: string;
  // The automatic daily set is due at 23:59 every day in every class, so it is not news.
  isDaily?: boolean;
}

export interface TeacherTodaySubmissions {
  classId: string;
  count: number;
}

export interface TeacherTodayInput {
  classes: readonly TeacherTodayClass[];
  // Published assignments with a deadline; the plan keeps those due today.
  assignments: readonly TeacherTodayAssignment[];
  // Submissions in the last 24 hours, per class.
  submissions: readonly TeacherTodaySubmissions[];
}

export interface TeacherToday {
  rows: TodayRow[];
  moreCount: number;
}

function capped<T>(items: readonly T[]) {
  return {
    shown: items.slice(0, MAX_TEACHER_TODAY_ROWS),
    hidden: Math.max(0, items.length - MAX_TEACHER_TODAY_ROWS),
  };
}

// Today's sessions first (fixed in time), then work due today, then classes with new submissions.
export function buildTeacherToday(input: TeacherTodayInput, now: Date): TeacherToday {
  const today = toStudyDay(now);
  const names = new Map(input.classes.map((item) => [item.id, item.name]));
  const sessions = capped(
    input.classes
      .flatMap((item) => {
        const session = findNextSession(item.slots, now);
        return session && toStudyDay(session.startsAt) === today ? [{ item, session }] : [];
      })
      .sort(
        (first, second) => first.session.startsAt.getTime() - second.session.startsAt.getTime(),
      ),
  );
  const due = capped(
    input.assignments
      .filter(
        (assignment) =>
          !assignment.isDaily &&
          names.has(assignment.classId) &&
          toStudyDay(assignment.dueAt) === today &&
          Date.parse(assignment.dueAt) > now.getTime(),
      )
      .toSorted((first, second) => Date.parse(first.dueAt) - Date.parse(second.dueAt)),
  );
  const submissions = capped(
    input.submissions
      .filter((entry) => entry.count > 0 && names.has(entry.classId))
      .toSorted((first, second) => second.count - first.count),
  );
  const rows: TodayRow[] = [
    ...sessions.shown.map(({ item, session }): TodayRow => ({
      key: `session-${item.id}`,
      kind: "Buổi dạy",
      title: item.name,
      href: `/teach/classes/${item.id}`,
      meta: `${describeSessionTime(session)}${session.isLive ? " · đang diễn ra" : ""}`,
      action: session.isLive ? "Vào lớp" : "Mở lớp",
      // Only a class in progress takes the main button; the page heading already has one.
      isAction: session.isLive,
    })),
    ...due.shown.map((assignment): TodayRow => ({
      key: `due-${assignment.id}`,
      kind: "Bài tập hạn hôm nay",
      title: assignment.title,
      href: `/teach/classes/${assignment.classId}#assignments-title`,
      meta: `${names.get(assignment.classId) ?? ""} · hạn ${formatStudyTime(assignment.dueAt)}`,
      action: "Xem lớp",
      isAction: false,
    })),
    ...submissions.shown.map((entry): TodayRow => ({
      key: `submissions-${entry.classId}`,
      kind: "Bài nộp mới",
      title: names.get(entry.classId) ?? "",
      href: `/teach/classes/${entry.classId}#students-title`,
      meta: `${entry.count} bài nộp trong 24 giờ qua`,
      action: "Xem lớp",
      isAction: false,
    })),
  ];
  return { rows, moreCount: sessions.hidden + due.hidden + submissions.hidden };
}

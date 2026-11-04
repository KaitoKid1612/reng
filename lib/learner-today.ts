import { describeSessionTime, findNextSession } from "@/lib/class-schedule";
import {
  formatStudyDateTime,
  formatStudyTime,
  shiftStudyDay,
  studyDayStart,
  toStudyDay,
} from "@/lib/study-days";

import type { ScheduleSlot } from "@/lib/class-schedule";

// A lesson a teacher opened stays "new" for a week, then lives on the class page only.
export const NEW_LESSON_DAYS = 7;
// "Hôm nay học gì" stays short; the full lists follow on the page.
export const MAX_TODAY_ASSIGNMENTS = 3;
export const MAX_TODAY_LESSONS = 3;

export interface TodayClass {
  id: string;
  name: string;
  isSelfStudy: boolean;
  slots: readonly ScheduleSlot[];
  meetingUrl?: string | null;
}

export interface TodayAssignment {
  id: string;
  classId: string;
  title: string;
  dueAt: string | null;
  inProgress: boolean;
  // A set from the class's daily practice, which belongs to its own day.
  isDaily: boolean;
}

export interface TodayLesson {
  classId: string;
  lessonId: string;
  versionId: string;
  title: string;
  orderNo: number;
  availableAt: string;
}

export interface TodayInput {
  classes: readonly TodayClass[];
  // Open work only, already in due-urgency order.
  openAssignments: readonly TodayAssignment[];
  lessons: readonly TodayLesson[];
  readLessonIds: ReadonlySet<string>;
  dueCardCount: number;
  hasMoreDueCards: boolean;
}

export type TodayItem =
  | {
      kind: "session";
      classId: string;
      className: string;
      time: string;
      isLive: boolean;
      meetingUrl: string | null;
    }
  | {
      kind: "assignment";
      assignmentId: string;
      className: string;
      title: string;
      dueAt: string | null;
      isOverdue: boolean;
      inProgress: boolean;
    }
  | {
      kind: "lesson";
      classId: string;
      className: string;
      lessonId: string;
      versionId: string;
      title: string;
      openedAt: string;
      isSelfStudy: boolean;
    }
  | { kind: "review"; count: number; hasMore: boolean };

function todaySessions(classes: readonly TodayClass[], now: Date) {
  const today = toStudyDay(now);
  return classes
    .flatMap((item) => {
      const session = item.isSelfStudy ? null : findNextSession(item.slots, now);
      if (!session || toStudyDay(session.startsAt) !== today) {
        return [];
      }
      return [{ item, session }];
    })
    .sort((first, second) => first.session.startsAt.getTime() - second.session.startsAt.getTime())
    .map(({ item, session }): TodayItem => ({
      kind: "session",
      classId: item.id,
      className: item.name,
      time: describeSessionTime(session),
      isLive: session.isLive,
      meetingUrl: item.meetingUrl ?? null,
    }));
}

// Work already started, then work due before today ends, then late work the teacher still
// accepts. A daily set from an earlier day is skipped unless started: a learner who joins late
// would otherwise open the day with a week of old sets. Everything stays in the full list below.
// A daily set from an earlier day the learner never started: the teacher still accepts it late,
// but it is not today's news. The evening reminder email skips it for the same reason.
export function isStaleDailySet(
  item: Pick<TodayAssignment, "isDaily" | "inProgress" | "dueAt">,
  now: Date,
) {
  return (
    item.isDaily &&
    !item.inProgress &&
    item.dueAt !== null &&
    Date.parse(item.dueAt) <= now.getTime()
  );
}

export interface OpenWorkEntry {
  assignment: { id: string; classId: string; dueAt: string | null };
  status: string;
}

/**
 * Open work to list one by one, and the missed daily sets folded into a count per class: after a
 * missed week the list would otherwise start with seven identical rows above the teacher's work.
 */
export function foldMissedDailySets<Entry extends OpenWorkEntry>(
  entries: readonly Entry[],
  dailyIds: ReadonlySet<string>,
  now: Date,
) {
  const listed: Entry[] = [];
  const missed = new Map<string, number>();
  for (const entry of entries) {
    const isMissed = isStaleDailySet(
      {
        isDaily: dailyIds.has(entry.assignment.id),
        inProgress: entry.status === "in_progress",
        dueAt: entry.assignment.dueAt,
      },
      now,
    );
    if (isMissed) {
      missed.set(entry.assignment.classId, (missed.get(entry.assignment.classId) ?? 0) + 1);
    } else {
      listed.push(entry);
    }
  }
  return { listed, missed };
}

function todayAssignments(input: TodayInput, names: Map<string, string>, now: Date) {
  const endOfToday = studyDayStart(shiftStudyDay(toStudyDay(now), 1));
  const rank = (item: TodayAssignment) => {
    if (item.inProgress) {
      return 0;
    }
    return item.dueAt !== null && Date.parse(item.dueAt) <= now.getTime() ? 2 : 1;
  };
  const due = input.openAssignments
    .filter((item) => {
      if (item.inProgress) {
        return true;
      }
      if (item.dueAt === null || Date.parse(item.dueAt) >= endOfToday) {
        return false;
      }
      return !isStaleDailySet(item, now);
    })
    .toSorted((first, second) => rank(first) - rank(second));
  const items = due.slice(0, MAX_TODAY_ASSIGNMENTS).map((item): TodayItem => ({
    kind: "assignment",
    assignmentId: item.id,
    className: names.get(item.classId) ?? "",
    title: item.title,
    dueAt: item.dueAt,
    isOverdue: item.dueAt !== null && Date.parse(item.dueAt) <= now.getTime(),
    inProgress: item.inProgress,
  }));
  return { items, hiddenCount: due.length - items.length };
}

// A teacher's class: unread lessons opened this week, newest first. A self-study class holds the
// learner's own pick of lessons, often added at once, so only its next unread lesson counts.
function todayLessons(input: TodayInput, now: Date) {
  const weekAgo = now.getTime() - NEW_LESSON_DAYS * 24 * 60 * 60 * 1000;
  const unread = input.lessons.filter(
    (lesson) =>
      !input.readLessonIds.has(lesson.lessonId) && Date.parse(lesson.availableAt) <= now.getTime(),
  );
  const picks = input.classes.flatMap((item) => {
    const own = unread.filter((lesson) => lesson.classId === item.id);
    if (item.isSelfStudy) {
      const next = own.toSorted((first, second) => first.orderNo - second.orderNo)[0];
      return next ? [{ item, lesson: next }] : [];
    }
    return own
      .filter((lesson) => Date.parse(lesson.availableAt) >= weekAgo)
      .map((lesson) => ({ item, lesson }));
  });
  return picks
    .toSorted(
      (first, second) =>
        Number(first.item.isSelfStudy) - Number(second.item.isSelfStudy) ||
        Date.parse(second.lesson.availableAt) - Date.parse(first.lesson.availableAt) ||
        first.lesson.orderNo - second.lesson.orderNo,
    )
    .slice(0, MAX_TODAY_LESSONS)
    .map(({ item, lesson }): TodayItem => ({
      kind: "lesson",
      classId: item.id,
      className: item.name,
      lessonId: lesson.lessonId,
      versionId: lesson.versionId,
      title: lesson.title,
      openedAt: lesson.availableAt,
      isSelfStudy: item.isSelfStudy,
    }));
}

export interface TodayPlan {
  items: TodayItem[];
  // Work for today left out by the cap; the page points to the full list for it.
  moreAssignmentCount: number;
}

// Today's sessions come first because they are fixed in time, then work, new lessons and review.
export function buildTodayPlan(input: TodayInput, now: Date): TodayPlan {
  const names = new Map(input.classes.map((item) => [item.id, item.name]));
  const work = todayAssignments(input, names, now);
  const items = [...todaySessions(input.classes, now), ...work.items, ...todayLessons(input, now)];
  if (input.dueCardCount > 0) {
    items.push({ kind: "review", count: input.dueCardCount, hasMore: input.hasMoreDueCards });
  }
  return { items, moreAssignmentCount: work.hiddenCount };
}

type TodayAssignmentItem = Extract<TodayItem, { kind: "assignment" }>;

// Open work past its due time is late work the teacher still accepts; closed work never reaches
// the plan.
export function describeTodayAssignment(item: TodayAssignmentItem, now: Date) {
  let due = "";
  if (item.dueAt && item.isOverdue) {
    due = `Quá hạn từ ${formatStudyDateTime(item.dueAt)}, vẫn nộp được`;
  } else if (item.dueAt && toStudyDay(item.dueAt) === toStudyDay(now)) {
    due = `Hạn hôm nay, ${formatStudyTime(item.dueAt)}`;
  } else if (item.dueAt) {
    due = `Hạn ${formatStudyDateTime(item.dueAt)}`;
  }
  return [item.inProgress ? "Đang làm dở" : "", due].filter(Boolean).join(" · ");
}

// "Mở hôm nay", "Mở hôm qua" or "Mở ngày 02/11", by Vietnam calendar day.
export function describeLessonOpened(openedAt: string, now: Date) {
  const day = toStudyDay(openedAt);
  const today = toStudyDay(now);
  if (day === today) {
    return "Mở hôm nay";
  }
  if (day === shiftStudyDay(today, -1)) {
    return "Mở hôm qua";
  }
  const [, month, date] = day.split("-");
  return `Mở ngày ${date}/${month}`;
}

// One line of "Hôm nay học gì", ready to render on the server page or send to the home page.
export interface TodayRow {
  key: string;
  kind: string;
  title: string;
  href: string;
  meta: string;
  action: string;
  // A session later today is a reminder; everything else, and a live session, is a thing to do.
  isAction: boolean;
  /** Where the button goes when it differs from the title link, such as the class's Meet call. */
  actionHref?: string;
  isExternal?: boolean;
}

export function toTodayRows(items: readonly TodayItem[], now: Date, showClass: boolean) {
  const classPrefix = (name: string) => (showClass && name ? `${name} · ` : "");
  return items.map((item): TodayRow => {
    switch (item.kind) {
      case "session":
        // A live session with a Meet link opens the call itself; the title still opens the class.
        if (item.isLive && item.meetingUrl) {
          return {
            key: `session-${item.classId}`,
            kind: "Buổi học",
            title: item.className,
            href: `/classes/${item.classId}`,
            meta: `${item.time} · đang diễn ra`,
            action: "Vào Google Meet",
            isAction: true,
            actionHref: item.meetingUrl,
            isExternal: true,
          };
        }
        return {
          key: `session-${item.classId}`,
          kind: "Buổi học",
          title: item.className,
          href: `/classes/${item.classId}`,
          meta: `${item.time}${item.isLive ? " · đang diễn ra" : ""}`,
          action: item.isLive ? "Vào lớp" : "Xem lớp",
          isAction: item.isLive,
        };
      case "assignment":
        return {
          key: `assignment-${item.assignmentId}`,
          kind: "Bài tập",
          title: item.title,
          href: `/assignments/${item.assignmentId}`,
          meta: `${classPrefix(item.className)}${describeTodayAssignment(item, now)}`,
          action: item.inProgress ? "Làm tiếp" : "Làm bài",
          isAction: true,
        };
      case "lesson":
        return {
          key: `lesson-${item.classId}-${item.lessonId}`,
          kind: item.isSelfStudy ? "Bài tiếp theo" : "Bài mới mở",
          title: item.title,
          href: `/lessons/${item.lessonId}?version=${item.versionId}`,
          meta: item.isSelfStudy
            ? "Lớp tự học của bạn"
            : `${classPrefix(item.className)}${describeLessonOpened(item.openedAt, now)}`,
          action: "Đọc bài",
          isAction: true,
        };
      case "review":
        return {
          key: "review",
          kind: "Ôn tập",
          title: "Thẻ từ vựng đến hạn",
          href: "/review",
          meta: `${item.count}${item.hasMore ? "+" : ""} thẻ`,
          action: "Ôn tập",
          isAction: true,
        };
    }
  });
}

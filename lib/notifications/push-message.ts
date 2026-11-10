import { formatStudyDateTime } from "@/lib/study-days";

import type { ReminderAssignment } from "@/lib/notifications/templates";

// What a browser notification carries; public/sw.js shows it and opens url on a click.
export interface PushMessage {
  title: string;
  body: string;
  /** A path on this site; the service worker never opens another origin. */
  url: string;
  /** One notification per tag: a newer reminder replaces an unread older one. */
  tag: string;
}

export interface PushReminderWork {
  dueCards: number;
  openCount: number;
  assignments: readonly ReminderAssignment[];
}

const BODY_MAX = 160;

function describeAssignment(item: ReminderAssignment) {
  if (item.isOverdue) {
    return `${item.title} (đã quá hạn)`;
  }
  return item.dueAt ? `${item.title} (hạn ${formatStudyDateTime(item.dueAt)})` : item.title;
}

/** The evening reminder: the work in one short line, the same work the reminder email lists. */
export function describeReminderPush(work: PushReminderWork): PushMessage {
  const parts: string[] = [];
  if (work.openCount > 0) {
    const [first] = work.assignments;
    parts.push(
      first
        ? `${work.openCount} bài cần làm: ${describeAssignment(first)}`
        : `${work.openCount} bài cần làm`,
    );
  }
  if (work.dueCards > 0) {
    parts.push(`${work.dueCards} thẻ cần ôn`);
  }
  const body = parts.join(" · ");
  return {
    title: "Reng: việc học hôm nay",
    body: body.length > BODY_MAX ? `${body.slice(0, BODY_MAX - 1)}…` : body,
    url: "/classes",
    tag: "daily-reminder",
  };
}

export const TEST_PUSH_MESSAGE: PushMessage = {
  title: "Reng: thông báo thử",
  body: "Thiết bị này sẽ nhận nhắc học buổi tối khi bạn có bài cần làm hoặc thẻ cần ôn.",
  url: "/settings/notifications",
  tag: "test",
};

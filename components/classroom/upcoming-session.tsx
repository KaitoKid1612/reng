import { describeUpcomingSession } from "@/lib/class-schedule";

import type { ScheduleSlot } from "@/lib/class-schedule";

interface UpcomingSessionProps {
  slots: readonly ScheduleSlot[];
  now: Date;
}

// One line in a class list: the next session from the class timetable, if it has one.
export function UpcomingSession({ slots, now }: UpcomingSessionProps) {
  const text = describeUpcomingSession(slots, now);
  return text ? <p className="item-meta">Buổi tới: {text}</p> : null;
}

import { formatStudyDay } from "@/lib/study-days";

import type { StudyCalendar } from "@/lib/study-calendar";

interface StudyCalendarGridProps {
  calendar: StudyCalendar;
}

const WEEKDAY_LABELS = ["T2", "", "T4", "", "T6", "", "CN"];

function describeDay(day: string, count: number) {
  const date = formatStudyDay(day).slice(0, 5);
  return count ? `${date}: ${count} lượt học` : `${date}: chưa học`;
}

// Recent weeks as a grid of days, darker where more was studied. The summary line carries the
// figures, so colour is never the only cue; each day also has a tooltip.
export function StudyCalendarGrid({ calendar }: StudyCalendarGridProps) {
  const summary = `Có học ${calendar.activeDays} trên ${calendar.pastDays} ngày gần đây`;
  return (
    <figure className="study-calendar">
      <div className="study-calendar-body" role="img" aria-label={summary}>
        <div className="study-calendar-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
        <div className="study-calendar-grid">
          {calendar.weeks.flat().map((item) => (
            <span
              key={item.day}
              className="study-calendar-day"
              data-level={item.isFuture ? "future" : item.level}
              title={item.isFuture ? undefined : describeDay(item.day, item.count)}
            />
          ))}
        </div>
      </div>
      <figcaption className="small muted">
        {summary}.
        <span className="study-calendar-legend" aria-hidden="true">
          Ít
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="study-calendar-day" data-level={level} />
          ))}
          Nhiều
        </span>
      </figcaption>
    </figure>
  );
}

import Link from "next/link";

import { formatDayScore, formatDayScoreLabel, scoreBand } from "@/lib/learning-history-stats";
import { formatStudyDay } from "@/lib/study-days";

import type { HistoryDayScore } from "@/lib/learning-history-stats";

interface HistoryDayNavProps {
  days: HistoryDayScore[];
  selectedDate?: string;
  hrefForDate: (date: string) => string;
}

const BAND_LEGEND = [
  { band: "good", label: "từ 80%" },
  { band: "fair", label: "60–79%" },
  { band: "low", label: "dưới 60%" },
  { band: "none", label: "chưa có điểm" },
];

/** Newest month first; each month keeps its days newest first, like the source sheet view. */
function groupByMonth(days: HistoryDayScore[]) {
  const months = new Map<string, HistoryDayScore[]>();
  for (const day of [...days].reverse()) {
    const month = day.date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), day]);
  }
  return [...months];
}

export function HistoryDayNav({ days, selectedDate, hrefForDate }: HistoryDayNavProps) {
  return (
    <nav className="history-day-nav" aria-labelledby="history-day-nav">
      <h2 id="history-day-nav">Chọn ngày</h2>
      <ul className="history-band-legend small muted" aria-label="Màu theo điểm quy về %">
        {BAND_LEGEND.map((item) => (
          <li key={item.band}>
            <span className="history-band-dot" data-band={item.band} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
      {!days.length && <p className="muted">Sheet chưa có ngày học nào.</p>}
      {groupByMonth(days).map(([month, monthDays]) => {
        const [year, monthNumber] = month.split("-");
        return (
          <div key={month} className="history-month">
            <h3>
              Tháng {monthNumber}/{year}
            </h3>
            <ul className="history-day-chips">
              {monthDays.map((day) => (
                <li key={day.date}>
                  <Link
                    href={hrefForDate(day.date)}
                    className="history-day-chip"
                    aria-current={day.date === selectedDate ? "date" : undefined}
                    prefetch={false}
                    // Stay on the list so the next day is one tap away; the day below updates.
                    scroll={false}
                  >
                    <span
                      className="history-band-dot"
                      data-band={scoreBand(day.percent)}
                      aria-hidden="true"
                    />
                    <span className="history-day-number" aria-hidden="true">
                      {day.date.slice(8)}
                    </span>
                    <span className="history-day-score" aria-hidden="true">
                      {formatDayScore(day)}
                    </span>
                    {/* The full date and source score form the accessible name. */}
                    <span className="history-hidden">
                      {formatStudyDay(day.date)}, {formatDayScoreLabel(day)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

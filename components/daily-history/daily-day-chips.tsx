import Link from "next/link";

import { fullDayLabel, groupDaysByMonth, scoreBand, shortDayLabel } from "@/lib/daily-history";
import { formatStudyDay } from "@/lib/study-days";

import type { DailyDay } from "@/lib/daily-history";

interface DailyDayChipsProps {
  days: readonly DailyDay[];
  selectedDate?: string;
  hrefForDay: (day: DailyDay) => string;
  /** Month titles sit one level below the heading of the section holding the chips. */
  monthHeadingLevel: 3 | 4;
}

const BAND_LEGEND = [
  { band: "good", label: "từ 80%" },
  { band: "fair", label: "60–79%" },
  { band: "low", label: "dưới 60%" },
  { band: "none", label: "chưa có điểm" },
] as const;

/** One tile per daily set, coloured by score like the old sheet; the number is always shown. */
export function DailyDayChips({
  days,
  selectedDate,
  hrefForDay,
  monthHeadingLevel,
}: DailyDayChipsProps) {
  const MonthHeading = monthHeadingLevel === 3 ? "h3" : "h4";
  return (
    <>
      <ul className="band-legend small muted" aria-label="Màu theo điểm %">
        {BAND_LEGEND.map((item) => (
          <li key={item.band}>
            <span className="score-band-dot" data-band={item.band} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
      {groupDaysByMonth(days).map(({ month, days: monthDays }) => {
        const [year, monthNumber] = month.split("-");
        return (
          <div key={month} className="day-month">
            <MonthHeading>
              Tháng {Number(monthNumber)}/{year}
            </MonthHeading>
            <ul className="day-chips">
              {monthDays.map((day) => (
                <li key={day.date}>
                  <Link
                    href={hrefForDay(day)}
                    className="day-chip"
                    aria-current={day.date === selectedDate ? "date" : undefined}
                    prefetch={false}
                  >
                    <span
                      className="score-band-dot"
                      data-band={scoreBand(day.percent)}
                      aria-hidden="true"
                    />
                    <span className="day-chip-number" aria-hidden="true">
                      {day.date.slice(8)}
                    </span>
                    <span className="day-chip-score" aria-hidden="true">
                      {shortDayLabel(day)}
                    </span>
                    {/* The full date and result form the accessible name. */}
                    <span className="visually-hidden">
                      {formatStudyDay(day.date)}, {fullDayLabel(day)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

import Link from "next/link";

import {
  SCORE_TARGET_PERCENT,
  averagePercent,
  formatDayScoreLabel,
  formatPercentValue,
  scoredDays,
} from "@/lib/learning-history-stats";
import { formatStudyDay } from "@/lib/study-days";

import type { CSSProperties } from "react";
import type { HistoryDayScore } from "@/lib/learning-history-stats";

interface HistoryScoreChartProps {
  days: HistoryDayScore[];
  selectedDate?: string;
  hrefForDate: (date: string) => string;
}

// Thirty columns still leave a visible bar per day at 360px; the day list keeps every date.
export const CHART_DAYS = 30;
const GRID_TICKS = [0, 50, 100];

function shortDate(date: string) {
  return formatStudyDay(date).slice(0, 5);
}

// First, last and up to three evenly spaced days so labels never crowd at narrow widths.
function axisLabelIndexes(count: number) {
  const steps = Math.min(count - 1, 4);
  const indexes = Array.from({ length: steps + 1 }, (_, step) =>
    steps ? Math.round((step * (count - 1)) / steps) : 0,
  );
  return [...new Set(indexes)];
}

// With many columns the outer labels hug the plot edges so they never overflow the card.
function axisLabelStyle(index: number, count: number): CSSProperties {
  if (count > 6 && index === 0) {
    return { left: 0 };
  }
  if (count > 6 && index === count - 1) {
    return { right: 0 };
  }
  return { left: `${((index + 0.5) / count) * 100}%`, transform: "translateX(-50%)" };
}

export function HistoryScoreChart({ days, selectedDate, hrefForDate }: HistoryScoreChartProps) {
  const shown = days.slice(-CHART_DAYS);
  const scored = scoredDays(shown);
  const average = averagePercent(scored);
  if (average === null) {
    return <p className="muted">Chưa có ngày nào có điểm trong bảng tổng hợp.</p>;
  }
  const highest = scored.reduce((best, day) => (day.percent > best.percent ? day : best));
  const lowest = scored.reduce((worst, day) => (day.percent < worst.percent ? day : worst));
  const selected = days.find((day) => day.date === selectedDate);
  return (
    <figure className="history-chart">
      <p className="history-chart-readout" aria-hidden="true">
        {selected
          ? `Đang xem ${formatStudyDay(selected.date)}: ${formatDayScoreLabel(selected)}`
          : "Di chuột vào cột để xem điểm"}
      </p>
      <div className="history-chart-body">
        <div className="history-chart-yaxis" aria-hidden="true">
          {GRID_TICKS.map((tick) => (
            <span key={tick} style={{ bottom: `${tick}%` }}>
              {tick}%
            </span>
          ))}
          <span
            className="history-chart-target-label"
            style={{ bottom: `${SCORE_TARGET_PERCENT}%` }}
          >
            {SCORE_TARGET_PERCENT}%
          </span>
        </div>
        <div className="history-chart-grid" aria-hidden="true">
          {GRID_TICKS.map((tick) => (
            <span key={tick} style={{ bottom: `${tick}%` }} />
          ))}
          <span className="history-chart-target" style={{ bottom: `${SCORE_TARGET_PERCENT}%` }} />
        </div>
        <ol className="history-chart-columns" aria-label="Điểm từng ngày, quy về %">
          {shown.map((day) => {
            const label = `${formatStudyDay(day.date)}: ${formatDayScoreLabel(day)}`;
            return (
              <li key={day.date}>
                {/* Kept out of the tab order: the day list below offers the same dates as larger targets. */}
                <Link
                  href={`${hrefForDate(day.date)}#history-day`}
                  className="history-chart-column"
                  aria-label={label}
                  aria-current={day.date === selectedDate ? "date" : undefined}
                  tabIndex={-1}
                  prefetch={false}
                >
                  {day.percent === null ? (
                    <span className="history-chart-empty" />
                  ) : (
                    <span className="history-chart-bar" style={{ height: `${day.percent}%` }} />
                  )}
                  <span className="history-chart-tip" aria-hidden="true">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <div className="history-chart-xaxis" aria-hidden="true">
          {axisLabelIndexes(shown.length).flatMap((index) => {
            const day = shown[index];
            return day
              ? [
                  <span key={day.date} style={axisLabelStyle(index, shown.length)}>
                    {shortDate(day.date)}
                  </span>,
                ]
              : [];
          })}
        </div>
      </div>
      <figcaption className="small muted">
        {days.length > shown.length ? `${shown.length} ngày gần nhất` : `${shown.length} ngày học`}:
        trung bình {formatPercentValue(average)} trên {scored.length} ngày có điểm, cao nhất{" "}
        {formatPercentValue(highest.percent)} ({shortDate(highest.date)}), thấp nhất{" "}
        {formatPercentValue(lowest.percent)} ({shortDate(lowest.date)}). Đường đứt nét là mốc{" "}
        {SCORE_TARGET_PERCENT}%; vòng tròn rỗng là ngày chưa có điểm, không tính là 0.
      </figcaption>
    </figure>
  );
}

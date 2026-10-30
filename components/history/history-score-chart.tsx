import { ScoreColumnChart } from "@/components/charts/score-column-chart";
import {
  SCORE_TARGET_PERCENT,
  averagePercent,
  formatDayScoreLabel,
  formatPercentValue,
  scoredDays,
} from "@/lib/learning-history-stats";
import { formatStudyDay } from "@/lib/study-days";

import type { HistoryDayScore } from "@/lib/learning-history-stats";

interface HistoryScoreChartProps {
  days: HistoryDayScore[];
  selectedDate?: string;
  hrefForDate: (date: string) => string;
}

// Thirty columns still leave a visible bar per day at 360px; the day list keeps every date.
export const CHART_DAYS = 30;

function shortDate(date: string) {
  return formatStudyDay(date).slice(0, 5);
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
    <ScoreColumnChart
      columns={shown.map((day) => ({
        key: day.date,
        axisLabel: shortDate(day.date),
        label: `${formatStudyDay(day.date)}: ${formatDayScoreLabel(day)}`,
        percent: day.percent,
        href: `${hrefForDate(day.date)}#history-day`,
        current: day.date === selectedDate ? "date" : undefined,
      }))}
      readout={
        selected
          ? `Đang xem ${formatStudyDay(selected.date)}: ${formatDayScoreLabel(selected)}`
          : "Di chuột vào cột để xem điểm"
      }
      label="Điểm từng ngày, quy về %"
      targetPercent={SCORE_TARGET_PERCENT}
      caption={
        <>
          {days.length > shown.length
            ? `${shown.length} ngày gần nhất`
            : `${shown.length} ngày học`}
          : trung bình {formatPercentValue(average)} trên {scored.length} ngày có điểm, cao nhất{" "}
          {formatPercentValue(highest.percent)} ({shortDate(highest.date)}), thấp nhất{" "}
          {formatPercentValue(lowest.percent)} ({shortDate(lowest.date)}). Đường đứt nét là mốc{" "}
          {SCORE_TARGET_PERCENT}%; vòng tròn rỗng là ngày chưa có điểm, không tính là 0.
        </>
      }
    />
  );
}

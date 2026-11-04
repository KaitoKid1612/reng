import { ScoreColumnChart } from "@/components/charts/score-column-chart";
import {
  CHART_DAYS,
  formatDayPercent,
  fullDayLabel,
  SCORE_TARGET_PERCENT,
} from "@/lib/daily-history";
import { formatStudyDay } from "@/lib/study-days";

import type { DailyDay } from "@/lib/daily-history";

interface DailyScoreChartProps {
  days: readonly DailyDay[];
  selectedDate?: string;
  hrefForDay: (day: DailyDay) => string;
}

type ScoredDay = DailyDay & { percent: number };

function shortDate(date: string) {
  return formatStudyDay(date).slice(0, 5);
}

export function DailyScoreChart({ days, selectedDate, hrefForDay }: DailyScoreChartProps) {
  const shown = days.slice(-CHART_DAYS);
  const scored = shown.filter((day): day is ScoredDay => day.percent !== null);
  const [first] = scored;
  if (!first) {
    return <p className="muted">Chưa có ngày nào có điểm để vẽ biểu đồ.</p>;
  }
  const average = scored.reduce((sum, day) => sum + day.percent, 0) / scored.length;
  const highest = scored.reduce((best, day) => (day.percent > best.percent ? day : best), first);
  const lowest = scored.reduce((worst, day) => (day.percent < worst.percent ? day : worst), first);
  const selected = days.find((day) => day.date === selectedDate);
  return (
    <ScoreColumnChart
      columns={shown.map((day) => ({
        key: day.date,
        axisLabel: shortDate(day.date),
        label: `${formatStudyDay(day.date)}: ${fullDayLabel(day)}`,
        percent: day.percent,
        href: hrefForDay(day),
        current: day.date === selectedDate ? "date" : undefined,
      }))}
      readout={
        selected
          ? `Đang xem ${formatStudyDay(selected.date)}: ${fullDayLabel(selected)}`
          : "Di chuột vào cột để xem điểm"
      }
      label="Điểm bài tập hằng ngày, theo %"
      targetPercent={SCORE_TARGET_PERCENT}
      caption={
        <>
          {days.length > shown.length ? `${shown.length} ngày gần nhất` : `${shown.length} ngày`}:
          trung bình {formatDayPercent(average)} trên {scored.length} ngày có điểm, cao nhất{" "}
          {formatDayPercent(highest.percent)} ({shortDate(highest.date)}), thấp nhất{" "}
          {formatDayPercent(lowest.percent)} ({shortDate(lowest.date)}). Đường đứt nét là mốc{" "}
          {SCORE_TARGET_PERCENT}%; vòng tròn rỗng là ngày chưa có điểm, không tính là 0.
        </>
      }
    />
  );
}

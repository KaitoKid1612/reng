import { ScoreColumnChart } from "@/components/charts/score-column-chart";
import { formatPercent } from "@/lib/grading/grade";
import { formatStudyDay, shiftStudyDay } from "@/lib/study-days";

import type { WeekScore } from "@/lib/weekly-scores";

interface WeeklyScoreChartProps {
  weeks: WeekScore[];
}

function shortDate(day: string) {
  return formatStudyDay(day).slice(0, 5);
}

function describeWeek(week: WeekScore) {
  const range = `Tuần ${shortDate(week.weekStart)}–${shortDate(shiftStudyDay(week.weekStart, 6))}`;
  if (week.percent === null) {
    return `${range}: chưa có bài có điểm`;
  }
  return `${range}: ${formatPercent(week.percent)} (${week.count} bài)`;
}

export function WeeklyScoreChart({ weeks }: WeeklyScoreChartProps) {
  const scored = weeks.flatMap((week) =>
    week.percent === null ? [] : [{ percent: week.percent, count: week.count }],
  );
  const current = weeks.at(-1);
  if (!scored.length || !current) {
    return (
      <p className="muted">
        Chưa có bài tập nào có điểm hiển thị trong {weeks.length} tuần gần đây.
      </p>
    );
  }
  const workCount = scored.reduce((total, week) => total + week.count, 0);
  // Weighted by work, so a week with one assignment does not outweigh a busy week.
  const average = scored.reduce((total, week) => total + week.percent * week.count, 0) / workCount;
  return (
    <ScoreColumnChart
      columns={weeks.map((week) => ({
        key: week.weekStart,
        axisLabel: shortDate(week.weekStart),
        label: describeWeek(week),
        percent: week.percent,
        current: week === current ? "true" : undefined,
      }))}
      readout={`Tuần này: ${current.percent === null ? "chưa có bài có điểm" : `${formatPercent(current.percent)} (${current.count} bài)`}`}
      label={`Điểm bài tập ${weeks.length} tuần gần đây, quy về %`}
      caption={
        <>
          {weeks.length} tuần gần đây: trung bình {formatPercent(average)} trên {workCount} bài có
          điểm. Mỗi bài tính lượt nộp mới nhất theo tuần nộp (giờ Việt Nam); tuần không có bài có
          điểm là vòng tròn rỗng.
        </>
      }
    />
  );
}

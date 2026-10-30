import {
  averagePercent,
  formatPercentValue,
  formatScoreValue,
  historyDayScores,
  historyLatestScore,
  scoredDays,
} from "@/lib/learning-history-stats";
import { formatStudyDay } from "@/lib/study-days";

import type { HistorySession } from "@/lib/learning-history";

interface HistoryListStatsProps {
  sessions: HistorySession[] | null;
}

interface HistorySparklineProps {
  values: number[];
}

const TREND_DAYS = 10;
const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 36;
// Leaves room for the end dot and its ring at the top and bottom of the fixed 0–100% scale.
const SPARK_PADDING = 5;

// A fixed 0–100% scale keeps two learners' lines comparable side by side.
function HistorySparkline({ values }: HistorySparklineProps) {
  const step = (SPARK_WIDTH - SPARK_PADDING * 2) / (values.length - 1);
  const points = values.map((value, index) => ({
    x: SPARK_PADDING + index * step,
    y: SPARK_PADDING + (1 - value / 100) * (SPARK_HEIGHT - SPARK_PADDING * 2),
  }));
  const last = points.at(-1);
  return (
    <svg
      className="score-sparkline"
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      role="img"
      aria-label={`Điểm ${values.length} ngày gần nhất có điểm: ${values.map(formatPercentValue).join(", ")}`}
    >
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
      {last && <circle cx={last.x} cy={last.y} r={4} />}
    </svg>
  );
}

export function HistoryListStats({ sessions }: HistoryListStatsProps) {
  if (!sessions) {
    return null;
  }
  const days = scoredDays(historyDayScores({ sessions, answers: [] }));
  const average = averagePercent(days);
  const latest = historyLatestScore(sessions);
  if (average === null || !latest) {
    return <p className="small muted">Bảng tổng hợp chưa có điểm.</p>;
  }
  const trend = days.slice(-TREND_DAYS).map((day) => day.percent);
  return (
    <div className="history-list-stats">
      <p>
        <span>
          <strong>{days.length}</strong> ngày có điểm
        </span>
        <span>
          trung bình <strong>{formatPercentValue(average)}</strong>
        </span>
        <span>
          gần nhất{" "}
          <strong>
            {formatScoreValue(latest.score)} / {latest.session.scoreScale}
          </strong>{" "}
          ({formatStudyDay(latest.session.date).slice(0, 5)})
        </span>
      </p>
      {trend.length > 1 && <HistorySparkline values={trend} />}
    </div>
  );
}

import { formatPercent } from "@/lib/grading/grade";

import type { ClassReport } from "@/lib/server/reports";

interface ClassStatTilesProps {
  week: ClassReport["week"];
  summary: ClassReport["summary"];
}

/** This week's hand-in rate, the class average and the counts of passing and flagged learners. */
export function ClassStatTiles({ week, summary }: ClassStatTilesProps) {
  return (
    <div className="stat-tiles">
      <div className="stat-tile">
        <strong>{week.percent === null ? "—" : formatPercent(week.percent)}</strong>
        <span>nộp bài tuần này</span>
        <span className="stat-tile-detail">
          {week.expectedCount
            ? `${week.submittedCount}/${week.expectedCount} bài đến hạn từ thứ Hai`
            : "Chưa có bài đến hạn tuần này"}
        </span>
        <span className="stat-tile-detail">Tổng {summary.submittedCount} bài đã nộp</span>
      </div>
      <div className="stat-tile">
        <strong>
          {summary.averagePercent === null ? "—" : formatPercent(summary.averagePercent)}
        </strong>
        <span>điểm trung bình</span>
      </div>
      <div className="stat-tile">
        <strong>{summary.passingCount}</strong>
        <span>học viên đạt</span>
      </div>
      <div className="stat-tile">
        <strong>{summary.attentionCount}</strong>
        <span>cần chú ý</span>
      </div>
    </div>
  );
}

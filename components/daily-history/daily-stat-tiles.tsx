import {
  dailyOverview,
  describeDelta,
  formatDayPercent,
  SCORE_TARGET_PERCENT,
} from "@/lib/daily-history";
import { formatStudyDay } from "@/lib/study-days";

import type { DailyDay, DailyLatest } from "@/lib/daily-history";

interface DailyStatTilesProps {
  days: readonly DailyDay[];
  today: string;
}

interface LatestTileProps {
  latest: DailyLatest | null;
}

const TREND_ARROWS = { up: "▲", down: "▼" };

function dateRange(first: string | null, last: string | null) {
  if (!first || !last) {
    return "Chưa có ngày nào";
  }
  if (first === last) {
    return formatStudyDay(first);
  }
  const start = formatStudyDay(first);
  const end = formatStudyDay(last);
  // Drop the repeated year: "29/10 – 04/11/2026".
  return first.slice(0, 4) === last.slice(0, 4)
    ? `${start.slice(0, 5)} – ${end}`
    : `${start} – ${end}`;
}

// Worded for both readers: the learner and the teacher looking at the learner.
function streakDetail(days: readonly DailyDay[], today: string) {
  const newest = days.at(-1);
  if (newest?.date !== today) {
    return "Tính theo các ngày lớp có bài";
  }
  return newest.submitted ? "Gồm cả bài hôm nay" : "Bài hôm nay chưa nộp";
}

function LatestTile({ latest }: LatestTileProps) {
  if (!latest) {
    return (
      <div className="stat-tile">
        <strong>—</strong>
        <span>điểm gần nhất</span>
        <span className="stat-tile-detail">Chưa có ngày nào có điểm</span>
      </div>
    );
  }
  const delta = latest.deltaPercent === null ? null : describeDelta(latest.deltaPercent);
  let detail = <span className="stat-tile-detail">Ngày đầu tiên có điểm</span>;
  if (delta?.direction === "same") {
    detail = (
      <span className="stat-tile-detail">Bằng trung bình {latest.baselineCount} ngày trước</span>
    );
  } else if (delta) {
    detail = (
      <span className="stat-tile-detail" data-trend={delta.direction}>
        {TREND_ARROWS[delta.direction]} {delta.text} điểm % so với trung bình {latest.baselineCount}{" "}
        ngày trước
      </span>
    );
  }
  return (
    <div className="stat-tile">
      <strong>{formatDayPercent(latest.percent)}</strong>
      <span>điểm gần nhất</span>
      <span className="stat-tile-detail">Ngày {formatStudyDay(latest.date).slice(0, 5)}</span>
      {detail}
    </div>
  );
}

export function DailyStatTiles({ days, today }: DailyStatTilesProps) {
  const overview = dailyOverview(days, today);
  return (
    <div className="stat-tiles">
      <div className="stat-tile">
        <strong>
          {overview.doneCount}
          <small> / {overview.offeredCount}</small>
        </strong>
        <span>ngày đã làm</span>
        <span className="stat-tile-detail">{dateRange(overview.firstDate, overview.lastDate)}</span>
      </div>
      <div className="stat-tile">
        <strong>
          {overview.averagePercent === null ? "—" : formatDayPercent(overview.averagePercent)}
        </strong>
        <span>điểm trung bình</span>
        <span className="stat-tile-detail">
          {overview.scoredCount
            ? `${overview.goodCount} / ${overview.scoredCount} ngày từ ${SCORE_TARGET_PERCENT}% trở lên`
            : "Chưa có ngày nào có điểm"}
        </span>
      </div>
      <LatestTile latest={overview.latest} />
      <div className="stat-tile">
        <strong>{overview.streak}</strong>
        <span>ngày làm liên tiếp</span>
        <span className="stat-tile-detail">{streakDetail(days, today)}</span>
      </div>
    </div>
  );
}

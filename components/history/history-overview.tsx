import { HistoryScoreChart } from "@/components/history/history-score-chart";
import {
  MIN_RANKED_ANSWERS,
  describeScoreDelta,
  formatPercentValue,
  formatScoreValue,
  historyKindAccuracy,
  historyOverview,
} from "@/lib/learning-history-stats";
import { formatStudyDay } from "@/lib/study-days";

import type { HistoryArchive } from "@/lib/learning-history";
import type {
  HistoryDayScore,
  HistoryKindAccuracy,
  HistoryLatestScore,
} from "@/lib/learning-history-stats";

interface HistoryOverviewProps {
  archive: HistoryArchive;
  days: HistoryDayScore[];
  selectedDate?: string;
  hrefForDate: (date: string) => string;
}

interface LatestScoreTileProps {
  latest: HistoryLatestScore | null;
}

interface KindAccuracyProps {
  ranked: HistoryKindAccuracy[];
  sparse: HistoryKindAccuracy[];
}

const TREND_ARROWS = { up: "▲", down: "▼", same: "=" };

function dateRange(first: string | null, last: string | null) {
  if (!first || !last) {
    return "Chưa có ngày học";
  }
  if (first === last) {
    return formatStudyDay(first);
  }
  const start = formatStudyDay(first);
  const end = formatStudyDay(last);
  // Drop the repeated year: "02/10 – 29/10/2026".
  return first.slice(0, 4) === last.slice(0, 4)
    ? `${start.slice(0, 5)} – ${end}`
    : `${start} – ${end}`;
}

function kindName(kind: string) {
  return kind || "Chưa ghi dạng bài";
}

function LatestScoreTile({ latest }: LatestScoreTileProps) {
  if (!latest) {
    return (
      <div className="stat-tile">
        <strong>—</strong>
        <span>điểm gần nhất</span>
        <span className="stat-tile-detail">Bảng tổng hợp chưa có điểm</span>
      </div>
    );
  }
  const { session, score, deltaPercent, baselineCount } = latest;
  const delta = deltaPercent === null ? null : describeScoreDelta(deltaPercent, session.scoreScale);
  return (
    <div className="stat-tile">
      <strong>
        {formatScoreValue(score)}
        <small> / {session.scoreScale}</small>
      </strong>
      <span>điểm gần nhất · {formatStudyDay(session.date).slice(0, 5)}</span>
      {delta ? (
        <span className="stat-tile-detail" data-trend={delta.direction}>
          {TREND_ARROWS[delta.direction]} {delta.text} so với trung bình {baselineCount} lần trước
        </span>
      ) : (
        <span className="stat-tile-detail">Lần đầu có điểm</span>
      )}
    </div>
  );
}

function KindAccuracy({ ranked, sparse }: KindAccuracyProps) {
  if (!ranked.length && !sparse.length) {
    return <p className="muted">Chưa có câu đã chấm Đúng/Sai để so sánh dạng bài.</p>;
  }
  return (
    <>
      {ranked.length > 0 && (
        <ol className="history-kinds">
          {ranked.map((item) => (
            <li key={item.kind}>
              <span className="history-kind-name">{kindName(item.kind)}</span>
              <span className="score-meter" aria-hidden="true">
                <span style={{ width: `${item.percent}%` }} />
              </span>
              <span className="history-kind-value">
                <strong>{formatPercentValue(item.percent)}</strong> · {item.correct}/{item.graded}{" "}
                câu
              </span>
            </li>
          ))}
        </ol>
      )}
      {sparse.length > 0 && (
        <p className="small muted">
          Chưa xếp hạng vì dưới {MIN_RANKED_ANSWERS} câu đã chấm:{" "}
          {sparse
            .map((item) => `${kindName(item.kind)} (${item.correct}/${item.graded})`)
            .join(", ")}
          .
        </p>
      )}
    </>
  );
}

export function HistoryOverview({
  archive,
  days,
  selectedDate,
  hrefForDate,
}: HistoryOverviewProps) {
  const overview = historyOverview(archive);
  const kinds = historyKindAccuracy(archive.answers);
  const { outcomes } = overview;
  // "Cần đối chiếu" results were never recognised as graded, so they count as not graded yet.
  const pendingGrade = outcomes.ungraded + outcomes.unknown;
  const pendingParts: string[] = [];
  if (pendingGrade) {
    const unknownNote = outcomes.unknown ? ` (gồm ${outcomes.unknown} cần đối chiếu)` : "";
    pendingParts.push(`${pendingGrade} chưa chấm${unknownNote}`);
  }
  if (outcomes.unanswered) {
    pendingParts.push(`${outcomes.unanswered} chưa làm`);
  }
  let pendingDetail = pendingParts.join(" · ") || "Mọi câu đều đã có kết quả";
  if (!archive.answers.length) {
    pendingDetail = "Bảng câu chưa có dữ liệu";
  }
  return (
    <section className="section-block history-overview" aria-labelledby="history-overview">
      <h2 id="history-overview">Tổng quan</h2>
      <p className="small muted">
        Tính trên toàn bộ lịch sử: tỉ lệ đúng và dạng bài lấy từ bảng câu (
        {archive.sourceTabs.answers}), điểm lấy từ bảng tổng hợp ({archive.sourceTabs.summaries}).
      </p>
      <div className="stat-tiles history-stats">
        <div className="stat-tile">
          <strong>{overview.dayCount}</strong>
          <span>ngày học</span>
          <span className="stat-tile-detail">
            {dateRange(overview.firstDate, overview.lastDate)}
          </span>
        </div>
        <div className="stat-tile">
          <strong>
            {overview.accuracyPercent === null ? "—" : formatPercentValue(overview.accuracyPercent)}
          </strong>
          <span>câu trả lời đúng</span>
          <span className="stat-tile-detail">
            {overview.gradedCount
              ? `${outcomes.correct} / ${overview.gradedCount} câu đã chấm`
              : "Chưa có câu đã chấm"}
          </span>
        </div>
        <LatestScoreTile latest={overview.latest} />
        <div className="stat-tile">
          <strong>{pendingGrade + outcomes.unanswered}</strong>
          <span>câu chưa chấm / chưa làm</span>
          <span className="stat-tile-detail">{pendingDetail}</span>
        </div>
      </div>
      <div className="history-panels">
        <section className="chart-panel" aria-labelledby="history-score-title">
          <h3 id="history-score-title">Điểm theo ngày</h3>
          <p className="small muted">Điểm gốc quy về %; bấm vào cột để mở ngày đó.</p>
          <HistoryScoreChart days={days} selectedDate={selectedDate} hrefForDate={hrefForDate} />
        </section>
        <section className="chart-panel" aria-labelledby="history-kind-title">
          <h3 id="history-kind-title">Tỉ lệ đúng theo dạng bài</h3>
          <p className="small muted">Dạng thấp nhất ở trên; chỉ tính câu đã chấm Đúng/Sai.</p>
          <KindAccuracy ranked={kinds.ranked} sparse={kinds.sparse} />
        </section>
      </div>
    </section>
  );
}

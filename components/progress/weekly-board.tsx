import Link from "next/link";

import { formatStudyDay, shiftStudyDay } from "@/lib/study-days";

import type { WeeklyBoard } from "@/lib/server/weekly-board";

const MEDALS = ["🥇", "🥈", "🥉"];

type Entries = WeeklyBoard["entries"];

function describeViewerPlace(entries: Entries, viewer: Entries[number]) {
  if (viewer.points === 0) {
    return "Tuần này bạn chưa có điểm. Làm bài hôm nay để vào bảng.";
  }
  if (viewer.rank === 1) {
    return "Bạn đang dẫn đầu tuần này. Giữ vững nhé!";
  }
  const gap = (entries[viewer.rank - 2]?.points ?? viewer.points) - viewer.points;
  return `Bạn đang hạng ${viewer.rank}. Thêm ${gap} câu đúng nữa là bắt kịp hạng trên.`;
}

function describeTeaser(entries: Entries, viewer: Entries[number] | undefined) {
  const leader = entries[0];
  if (viewer && viewer.points > 0) {
    return `Bảng tuần: bạn đang hạng ${viewer.rank}/${entries.length} với ${viewer.points} câu đúng.`;
  }
  if (leader && leader.points > 0) {
    return `Bảng tuần: ${leader.name} đang dẫn đầu với ${leader.points} câu đúng.`;
  }
  return "Bảng tuần mới bắt đầu: ai làm bài trước sẽ dẫn đầu.";
}

/** One teacher's weekly board: rank, name, correct answers and study days this week. */
export function WeeklyBoardCard({ board }: { board: WeeklyBoard }) {
  const viewer = board.entries.find((entry) => entry.isViewer);
  const leader = board.entries[0];
  return (
    <section className="section-block weekly-board" aria-labelledby={`board-${board.teacherId}`}>
      <h2 id={`board-${board.teacherId}`}>Bảng xếp hạng tuần</h2>
      <p className="small muted">
        Các lớp của {board.teacherName} · tuần {formatStudyDay(board.week.start)}–
        {formatStudyDay(shiftStudyDay(board.week.end, -1))} · còn {board.daysLeft} ngày
      </p>
      {viewer && leader && (
        <p className="weekly-board-callout">{describeViewerPlace(board.entries, viewer)}</p>
      )}
      <table className="weekly-board-table">
        <caption className="visually-hidden">Xếp hạng tuần theo số câu đúng</caption>
        <thead>
          <tr>
            <th scope="col">Hạng</th>
            <th scope="col">Học viên</th>
            <th scope="col">Câu đúng</th>
            <th scope="col">Ngày nộp bài</th>
          </tr>
        </thead>
        <tbody>
          {board.entries.map((entry) => (
            <tr key={`${entry.rank}-${entry.name}`} data-viewer={entry.isViewer || undefined}>
              <td>
                {entry.points > 0 && MEDALS[entry.rank - 1] ? (
                  <span aria-label={`Hạng ${entry.rank}`}>{MEDALS[entry.rank - 1]}</span>
                ) : (
                  entry.rank
                )}
              </td>
              <th scope="row">
                {entry.name}
                {entry.isViewer && " (bạn)"}
                {entry.isHidden && <span className="small muted"> · chỉ bạn thấy</span>}
              </th>
              <td>{entry.points}</td>
              <td>{entry.activeDays}/7</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">
        {board.lastWeekLeader
          ? `Tuần trước: ${board.lastWeekLeader.name} dẫn đầu với ${board.lastWeekLeader.points} câu đúng. `
          : ""}
        Điểm là số câu đúng trong bài nộp tuần này, mỗi bài tính lượt có điểm cao nhất.{" "}
        <Link href="/settings/account#board-visibility-title">Ẩn tôi khỏi bảng</Link>
      </p>
    </section>
  );
}

/** One line on Lớp của tôi: the viewer's place this week, linking to the full board. */
export function WeeklyBoardTeaser({ board }: { board: WeeklyBoard }) {
  const viewer = board.entries.find((entry) => entry.isViewer);
  const leader = board.entries[0];
  if (!leader) {
    return null;
  }
  return (
    <p className="weekly-board-teaser">
      <span aria-hidden="true">🏆</span> {describeTeaser(board.entries, viewer)}{" "}
      <Link href={`/progress#board-${board.teacherId}`}>Xem bảng</Link>
    </p>
  );
}

import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AssignmentStatusBadge } from "@/components/classroom/assignment-labels";
import { HistoryListStats } from "@/components/history/history-list-stats";
import { WeeklyScoreChart } from "@/components/progress/weekly-score-chart";
import { buttonVariants } from "@/components/ui/button";
import { formatPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { listLearningHistory } from "@/lib/server/learning-history";
import { getProgressSummary } from "@/lib/server/learner";
import { formatStudyDateTime } from "@/lib/study-days";
import { weeklyScores } from "@/lib/weekly-scores";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tiến độ của tôi" };

// Eight weeks show about two months of class work without crowding a phone screen.
const PROGRESS_WEEKS = 8;

export default async function ProgressPage() {
  const account = await requireStudent("/progress");
  const now = new Date();
  const [summary, histories] = await Promise.all([
    getProgressSummary(account.id, now),
    listLearningHistory(),
  ]);
  // Teachers who also study see their own imported history here, not their learners'.
  const ownHistories = histories.filter((item) => item.learner_id === account.id);
  const weeks = weeklyScores(
    summary.assignments.map((item) => ({
      percent: item.latestPercent,
      submittedAt: item.submittedAt,
    })),
    now,
    PROGRESS_WEEKS,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tiến độ của tôi</h1>
          <p>Ba chỉ số tách riêng: đọc bài, điểm bài tập và thẻ ôn tập.</p>
        </div>
        <div className="button-row">
          <Link href="/history" className={buttonVariants({ variant: "outline" })}>
            Lịch sử từ Google Sheet
          </Link>
          <Link href="/settings/notifications" className={buttonVariants({ variant: "ghost" })}>
            Cài đặt email nhắc học
          </Link>
          <SignOutButton />
        </div>
      </div>
      <div className="stat-tiles">
        <div className="stat-tile">
          <strong>{summary.streak}</strong>
          <span>ngày học liên tiếp</span>
        </div>
        <div className="stat-tile">
          <strong>{summary.reading.length}</strong>
          <span>bài đã đọc xong</span>
        </div>
        <div className="stat-tile">
          <strong>
            {summary.averagePercent === null ? "—" : formatPercent(summary.averagePercent)}
          </strong>
          <span>điểm bài tập trung bình</span>
        </div>
        <div className="stat-tile">
          <strong>{summary.vocab.due + summary.mistakes.open}</strong>
          <span>thẻ đang cần ôn</span>
        </div>
      </div>
      <section className="section-block" aria-labelledby="reading-progress">
        <h2 id="reading-progress">Đọc bài</h2>
        {summary.reading.length ? (
          <ul className="item-list">
            {summary.reading.map((item) => (
              <li key={item.lessonId}>
                <span>{item.title}</span>
                <span className="item-meta">Xong lúc {formatStudyDateTime(item.completedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Mở một bài học trong lớp và bấm “Đánh dấu đã đọc xong” khi bạn đọc hết bài.
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="assignment-progress">
        <h2 id="assignment-progress">Bài tập</h2>
        {summary.assignments.length > 0 && (
          <section className="chart-panel" aria-labelledby="weekly-scores">
            <h3 id="weekly-scores">Điểm bài tập theo tuần</h3>
            <p className="small muted">Rê chuột hoặc dùng phím Tab trên cột để xem từng tuần.</p>
            <WeeklyScoreChart weeks={weeks} />
          </section>
        )}
        {summary.assignments.length ? (
          <ul className="item-list">
            {summary.assignments.map((item) => (
              <li key={item.assignment.id}>
                <div>
                  <Link href={`/assignments/${item.assignment.id}`}>{item.assignment.title}</Link>
                  <p className="item-meta">
                    {item.latestPercent === null
                      ? "Chưa có điểm hiển thị"
                      : `Lượt mới nhất ${formatPercent(item.latestPercent)}`}
                  </p>
                </div>
                <AssignmentStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Chưa có bài tập nào được giao.</p>
        )}
      </section>
      {ownHistories.length > 0 && (
        <section className="section-block" aria-labelledby="sheet-history">
          <h2 id="sheet-history">Lịch sử từ Google Sheet</h2>
          <ul className="item-list">
            {ownHistories.map((history) => (
              <li key={history.id}>
                <div>
                  <Link href={`/history/${history.id}`}>{history.course}</Link>
                  <HistoryListStats sessions={history.sessions} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="section-block" aria-labelledby="card-progress">
        <h2 id="card-progress">Thẻ ôn tập</h2>
        <p>
          {summary.vocab.total} thẻ từ vựng ({summary.vocab.due} đến hạn), {summary.mistakes.open}{" "}
          câu trong sổ lỗi đang mở, {summary.mistakes.resolved} câu đã giải quyết.
        </p>
        <Link href="/review">Ôn tập ngay</Link>
      </section>
    </>
  );
}

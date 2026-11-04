import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AssignmentStatusBadge } from "@/components/classroom/assignment-labels";
import { WeeklyScoreChart } from "@/components/progress/weekly-score-chart";
import { buttonVariants } from "@/components/ui/button";
import { formatPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { getProgressSummary, getQuestionKindStats } from "@/lib/server/learner";
import { weakestKind } from "@/lib/question-kinds";
import { formatStudyDateTime } from "@/lib/study-days";
import { weeklyScores } from "@/lib/weekly-scores";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tiến độ của tôi" };

// Eight weeks show about two months of class work without crowding a phone screen.
const PROGRESS_WEEKS = 8;
// Daily sets add one assignment a day; older ones fold away like on the class pages.
const RECENT_ASSIGNMENTS = 5;

type ProgressAssignment = Awaited<ReturnType<typeof getProgressSummary>>["assignments"][number];

interface ProgressAssignmentItemProps {
  item: ProgressAssignment;
}

function ProgressAssignmentItem({ item }: ProgressAssignmentItemProps) {
  return (
    <li>
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
  );
}

export default async function ProgressPage() {
  const account = await requireStudent("/progress");
  const now = new Date();
  const [summary, kindStats] = await Promise.all([
    getProgressSummary(account.id, now),
    getQuestionKindStats(account.id, now),
  ]);
  const weakest = weakestKind(kindStats);
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
          <>
            <ul className="item-list">
              {summary.assignments.slice(0, RECENT_ASSIGNMENTS).map((item) => (
                <ProgressAssignmentItem key={item.assignment.id} item={item} />
              ))}
            </ul>
            {summary.assignments.length > RECENT_ASSIGNMENTS && (
              <details className="older-assignments">
                <summary>Bài cũ hơn ({summary.assignments.length - RECENT_ASSIGNMENTS})</summary>
                <ul className="item-list">
                  {summary.assignments.slice(RECENT_ASSIGNMENTS).map((item) => (
                    <ProgressAssignmentItem key={item.assignment.id} item={item} />
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p className="muted">Chưa có bài tập nào được giao.</p>
        )}
      </section>
      <section className="section-block" aria-labelledby="kind-progress">
        <h2 id="kind-progress">Theo dạng câu</h2>
        {kindStats.length ? (
          <>
            {weakest && (
              <p>
                Dạng bạn hay sai nhất: <strong>{weakest.label}</strong> ({weakest.percent}% đúng).
                Ôn lại các câu sai trong <Link href="/mistakes">Sổ lỗi</Link>.
              </p>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Dạng câu</th>
                  <th scope="col" className="numeric">
                    Đã làm
                  </th>
                  <th scope="col" className="numeric">
                    Đúng
                  </th>
                  <th scope="col" className="numeric">
                    Tỉ lệ đúng
                  </th>
                </tr>
              </thead>
              <tbody>
                {kindStats.map((stat) => (
                  <tr key={stat.kind}>
                    <td>{stat.label}</td>
                    <td className="numeric" data-label="Đã làm">
                      {stat.answered}
                    </td>
                    <td className="numeric" data-label="Đúng">
                      {stat.correct}
                    </td>
                    <td className="numeric" data-label="Tỉ lệ đúng">
                      {stat.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">
              Tính trên tối đa 100 lượt nộp gần nhất. Bài kiểm tra chỉ được tính khi đã tới lúc xem
              kết quả.
            </p>
          </>
        ) : (
          <p className="muted">Chưa có câu trả lời nào để thống kê.</p>
        )}
      </section>
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

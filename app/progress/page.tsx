import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AssignmentStatusBadge } from "@/components/classroom/assignment-labels";
import { formatPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { getProgressSummary } from "@/lib/server/learner";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tiến độ của tôi" };

export default async function ProgressPage() {
  const account = await requireStudent("/progress");
  const summary = await getProgressSummary(account.id, new Date());
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tiến độ của tôi</h1>
          <p>Ba chỉ số tách riêng: đọc bài, điểm bài tập và thẻ ôn tập.</p>
        </div>
        <SignOutButton />
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

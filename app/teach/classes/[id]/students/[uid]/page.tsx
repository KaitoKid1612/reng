import Link from "next/link";

import { describeDue, MODE_LABELS } from "@/components/classroom/assignment-labels";
import { LEARNER_LABELS } from "@/lib/class-report";
import { formatPercent } from "@/lib/grading/grade";
import { requireTeacher } from "@/lib/server/account";
import { loadOrNotFound } from "@/lib/server/pages";
import { getStudentDetail } from "@/lib/server/reports";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chi tiết học viên" };

interface StudentDetailPageProps {
  params: Promise<{ id: string; uid: string }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id, uid } = await params;
  const account = await requireTeacher(`/teach/classes/${id}/students/${uid}`);
  const detail = await loadOrNotFound(getStudentDetail(account.id, id, uid, new Date()));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{detail.member.full_name || detail.member.email}</h1>
          <p>
            <Link href={`/teach/classes/${detail.classRow.id}`}>{detail.classRow.name}</Link>,{" "}
            {detail.member.email}
            {detail.hasLeft ? ", đã rời lớp" : ""}
          </p>
        </div>
        <span className="status-badge status-neutral">{LEARNER_LABELS[detail.report.label]}</span>
      </div>
      <p>
        Đã nộp {detail.report.submittedCount}/{detail.report.assignedCount} bài, điểm trung bình{" "}
        {detail.report.averagePercent === null ? "—" : formatPercent(detail.report.averagePercent)}
        {detail.report.averageListens !== null &&
          `, nghe trung bình ${detail.report.averageListens.toFixed(1)} lần mỗi câu nghe`}
        .
      </p>
      {detail.rows.map((row) => (
        <section key={row.assignment.id} className="section-block">
          <h2>{row.assignment.title}</h2>
          <p className="item-meta">
            {MODE_LABELS[row.assignment.mode]}, {describeDue(row.assignment.dueAt)},{" "}
            {row.attemptCount} lượt
            {row.latest?.submittedAt
              ? `, nộp lúc ${formatStudyDateTime(row.latest.submittedAt)}${row.latest.isLate ? " (muộn)" : ""}`
              : ", chưa nộp"}
            {row.percent !== null ? `, ${formatPercent(row.percent)}` : ""}
          </p>
          {row.items.map((item, index) => (
            <div key={item.view.id} className="result-row" data-correct={item.isCorrect}>
              <p className="small muted">
                Câu {index + 1}: {item.isCorrect ? "đúng" : "sai"}
              </p>
              <p lang="ja">{item.view.prompt}</p>
              <p>
                Trả lời: <span lang="ja">{item.answerText || "(bỏ trống)"}</span>; đáp án:{" "}
                <span lang="ja">{item.correctText}</span>
                {item.listenCount !== null && `; nghe ${item.listenCount} lần`}
              </p>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

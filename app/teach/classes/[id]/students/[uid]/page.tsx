import Link from "next/link";

import { describeDue, MODE_LABELS } from "@/components/classroom/assignment-labels";
import { OutcomeFilter } from "@/components/ui/outcome-filter";
import {
  ANSWER_OUTCOME_LABELS,
  countOutcomes,
  matchesOutcome,
  numberAnswers,
  parseAnswerOutcome,
} from "@/lib/answer-outcome";
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
  searchParams: Promise<{ outcome?: string }>;
}

export default async function StudentDetailPage({ params, searchParams }: StudentDetailPageProps) {
  const { id, uid } = await params;
  const outcome = parseAnswerOutcome((await searchParams).outcome);
  const path = `/teach/classes/${id}/students/${uid}`;
  const account = await requireTeacher(path);
  const detail = await loadOrNotFound(getStudentDetail(account.id, id, uid, new Date()));
  // Without a filter only the newest graded assignment is open; with one, every assignment that
  // has matching answers opens so they can be read in one pass.
  const newestGraded = detail.rows.findIndex((row) => row.items.length > 0);
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
      <section className="section-block" aria-labelledby="student-answers">
        <h2 id="student-answers">Bài đã giao và câu trả lời</h2>
        <OutcomeFilter
          path={path}
          outcome={outcome}
          counts={countOutcomes(detail.rows.flatMap((row) => row.items))}
        />
        <p className="small muted">
          Bộ lọc áp dụng cho mọi bài, chỉ tính lượt nộp mới nhất. Bấm tên bài để mở hoặc thu gọn.
        </p>
        {detail.rows.map((row, rowIndex) => {
          const counts = countOutcomes(row.items);
          const visible = numberAnswers(row.items).filter(({ item }) =>
            matchesOutcome(item.isCorrect, outcome),
          );
          return (
            <details
              key={row.assignment.id}
              className="collapse-card student-assignment"
              open={outcome ? visible.length > 0 : rowIndex === newestGraded}
            >
              <summary>
                <span>{row.assignment.title}</span>
                <span className="item-meta">
                  {row.items.length ? `${counts.wrong} sai / ${counts.all} câu` : "chưa nộp"}
                </span>
              </summary>
              <div className="student-assignment-body">
                <p className="item-meta">
                  {MODE_LABELS[row.assignment.mode]}, {describeDue(row.assignment.dueAt)},{" "}
                  {row.attemptCount} lượt
                  {row.latest?.submittedAt
                    ? `, nộp lúc ${formatStudyDateTime(row.latest.submittedAt)}${row.latest.isLate ? " (muộn)" : ""}`
                    : ", chưa nộp"}
                  {row.percent !== null ? `, ${formatPercent(row.percent)}` : ""}
                </p>
                {outcome && row.items.length > 0 && !visible.length && (
                  <p className="muted">
                    Không có câu {ANSWER_OUTCOME_LABELS[outcome].toLowerCase()} trong bài này.
                  </p>
                )}
                {visible.map(({ item, number }) => (
                  <div key={item.view.id} className="result-row" data-correct={item.isCorrect}>
                    <p className="result-row-meta">
                      <span
                        className={`status-badge ${item.isCorrect ? "status-correct" : "status-wrong"}`}
                      >
                        {item.isCorrect ? "Đúng" : "Sai"}
                      </span>{" "}
                      Câu {number}
                      {item.listenCount !== null && ` · nghe ${item.listenCount} lần`}
                    </p>
                    <p lang="ja" className="result-row-prompt">
                      {item.view.prompt}
                    </p>
                    <p>
                      Trả lời: <strong lang="ja">{item.answerText || "(bỏ trống)"}</strong>
                    </p>
                    {!item.isCorrect && (
                      <p>
                        Đáp án: <strong lang="ja">{item.correctText}</strong>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </section>
    </>
  );
}

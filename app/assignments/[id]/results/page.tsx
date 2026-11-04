import Link from "next/link";

import { MODE_LABELS } from "@/components/classroom/assignment-labels";
import { ResultRow } from "@/components/classroom/result-row";
import { buttonVariants } from "@/components/ui/button";
import { OutcomeFilter } from "@/components/ui/outcome-filter";
import {
  countOutcomes,
  matchesOutcome,
  numberAnswers,
  parseAnswerOutcome,
} from "@/lib/answer-outcome";
import { formatPercent, toPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { getStudentResults } from "@/lib/server/assignments";
import { findDailyRunDate } from "@/lib/server/daily-history";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kết quả bài tập" };

interface ResultsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ outcome?: string }>;
}

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const { id } = await params;
  const outcome = parseAnswerOutcome((await searchParams).outcome);
  const account = await requireStudent(`/assignments/${id}/results`);
  const [view, dailyDate] = await Promise.all([
    loadOrNotFound(getStudentResults(account.id, id, new Date())),
    findDailyRunDate(id),
  ]);
  const { assignment, attempt } = view;
  const visibleItems = numberAnswers(view.items).filter(({ item }) =>
    matchesOutcome(item.isCorrect, outcome),
  );
  const canRetry =
    assignment.status === "published" &&
    !view.hasOpenAttempt &&
    view.attemptsUsed < assignment.maxAttempts;
  return (
    <div className="results-page">
      <div className="page-heading">
        <div>
          <h1>Kết quả: {assignment.title}</h1>
          <p>
            <Link href={`/classes/${assignment.classId}`}>{view.className}</Link>,{" "}
            {MODE_LABELS[assignment.mode]}
          </p>
        </div>
      </div>
      {!attempt && (
        <p>
          Bạn chưa nộp lượt nào. <Link href={`/assignments/${assignment.id}`}>Làm bài</Link>
        </p>
      )}
      {attempt && !view.isFeedbackAvailable && (
        <div className="form-card" role="status">
          <h2>Đã nộp bài</h2>
          <p>
            Reng đã nhận bài lúc {formatStudyDateTime(attempt.submittedAt ?? attempt.savedAt)}
            {attempt.isLate ? " (nộp muộn)" : ""}.
          </p>
          <p>
            Điểm và đáp án sẽ công bố sau{" "}
            {assignment.dueAt ? formatStudyDateTime(assignment.dueAt) : "hạn nộp"}.
          </p>
        </div>
      )}
      {attempt && view.isFeedbackAvailable && attempt.score !== null && attempt.maxScore && (
        <>
          <div className="form-card">
            <p className="result-score">
              {formatPercent(toPercent(attempt.score, attempt.maxScore))}
              <span>
                {" "}
                ({attempt.score}/{attempt.maxScore} điểm)
              </span>
            </p>
            <p>
              {attempt.passed ? (
                <span className="status-badge status-correct">Đạt</span>
              ) : (
                <span className="status-badge status-wrong">Chưa đạt</span>
              )}{" "}
              Lượt {attempt.attemptNo}, nộp lúc{" "}
              {formatStudyDateTime(attempt.submittedAt ?? attempt.savedAt)}
              {attempt.isLate ? " (nộp muộn)" : ""}.
            </p>
          </div>
          <section className="section-block" aria-labelledby="answer-review">
            <h2 id="answer-review">Xem lại từng câu</h2>
            <OutcomeFilter
              path={`/assignments/${assignment.id}/results`}
              outcome={outcome}
              counts={countOutcomes(view.items)}
            />
            <p role="status" className="small muted">
              Hiển thị {visibleItems.length} / {view.items.length} câu.
            </p>
            {visibleItems.map(({ item, number }) => (
              <ResultRow key={item.view.id} item={item} number={number} />
            ))}
          </section>
        </>
      )}
      <div className="button-row">
        {canRetry && (
          <Link href={`/assignments/${assignment.id}`} className={buttonVariants()}>
            Làm lượt mới
          </Link>
        )}
        <Link href="/mistakes" className={buttonVariants({ variant: "outline" })}>
          Mở sổ lỗi
        </Link>
        {dailyDate && (
          <Link
            href={`/classes/${assignment.classId}/daily-practice?day=${dailyDate}#daily-day`}
            className={buttonVariants({ variant: "outline" })}
          >
            Xem điểm các ngày
          </Link>
        )}
      </div>
    </div>
  );
}

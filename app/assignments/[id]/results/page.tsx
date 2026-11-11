import { cache } from "react";
import Link from "next/link";

import { describeAssignmentKind } from "@/components/classroom/assignment-labels";
import { JlptResult } from "@/components/classroom/jlpt-result";
import { QuestionCredits } from "@/components/classroom/question-credits";
import { ResultRow } from "@/components/classroom/result-row";
import { buttonVariants } from "@/components/ui/button";
import { OutcomeFilter } from "@/components/ui/outcome-filter";
import {
  countOutcomes,
  matchesOutcome,
  numberAnswers,
  parseAnswerOutcome,
} from "@/lib/answer-outcome";
import { getDeadlineState, isHandedInAtDeadline } from "@/lib/assignment";
import { formatPercent, toPercent } from "@/lib/grading/grade";
import { isHandedInAtTimeLimit } from "@/lib/jlpt";
import { getCurrentAccount, requireStudent } from "@/lib/server/account";
import { getStudentResults } from "@/lib/server/assignments";
import { findDailyRunDate } from "@/lib/server/daily-history";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

// Request-scoped, so the tab title and the page share one read.
const loadResults = cache((userId: string, id: string) =>
  getStudentResults(userId, id, new Date()),
);

export async function generateMetadata({ params }: ResultsPageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (account) {
    try {
      return { title: `Kết quả: ${(await loadResults(account.id, id)).assignment.title}` };
    } catch {
      // Not a member, or no such assignment: the generic title reveals nothing.
    }
  }
  return { title: "Kết quả bài tập" };
}

interface ResultsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ outcome?: string }>;
}

export default async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const { id } = await params;
  const outcome = parseAnswerOutcome((await searchParams).outcome);
  const account = await requireStudent(`/assignments/${id}/results`);
  const [view, dailyDate] = await Promise.all([
    loadOrNotFound(loadResults(account.id, id)),
    findDailyRunDate(id),
  ]);
  const { assignment, attempt } = view;
  const visibleItems = numberAnswers(view.items).filter(({ item }) =>
    matchesOutcome(item.isCorrect, outcome),
  );
  const now = new Date();
  // A closed or past-due assignment would only answer a retry with its blocker message.
  const isAccepting =
    assignment.status === "published" &&
    getDeadlineState(assignment.dueAt, assignment.allowLate, now) !== "past_due";
  const canRetry =
    isAccepting && !view.hasOpenAttempt && view.attemptsUsed < assignment.maxAttempts;
  const { exam } = assignment;
  // Reng hands an attempt in when its deadline passes, or when a mock exam's time runs out.
  const handedInAtDeadline =
    isHandedInAtDeadline(attempt?.submittedAt ?? null, assignment.dueAt) ||
    (exam !== null &&
      attempt !== null &&
      isHandedInAtTimeLimit(attempt.submittedAt, attempt.startedAt, exam.timeLimitMinutes));
  const handInEnd = exam ? "hết giờ" : "hết hạn";
  const actions = (
    <div className="button-row">
      {isAccepting && view.hasOpenAttempt && (
        <Link href={`/assignments/${assignment.id}`} className={buttonVariants()}>
          Làm tiếp lượt đang làm
        </Link>
      )}
      {canRetry && (
        <Link href={`/assignments/${assignment.id}`} className={buttonVariants()}>
          Làm lại lượt mới
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
  );
  return (
    <div className="results-page">
      <div className="page-heading">
        <div>
          <h1>Kết quả: {assignment.title}</h1>
          <p>
            <Link href={`/classes/${assignment.classId}`}>{view.className}</Link>,{" "}
            {describeAssignmentKind(assignment)}
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
            {handedInAtDeadline
              ? `Bạn chưa bấm Nộp bài nên Reng tự nộp lúc ${handInEnd}, `
              : "Reng đã nhận bài lúc "}
            {formatStudyDateTime(attempt.submittedAt ?? attempt.savedAt)}
            {attempt.isLate ? " (nộp muộn)" : ""}
            {handedInAtDeadline ? `, với các câu đã lưu trước khi ${handInEnd}` : ""}.
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
              {/* A mock exam is judged by its JLPT estimate below, with the section minimums. */}
              {!exam &&
                (attempt.passed ? (
                  <span className="status-badge status-correct">Đạt</span>
                ) : (
                  <span className="status-badge status-wrong">Chưa đạt</span>
                ))}{" "}
              Lượt {attempt.attemptNo},{" "}
              {handedInAtDeadline ? `Reng tự nộp lúc ${handInEnd}` : "nộp lúc"}{" "}
              {formatStudyDateTime(attempt.submittedAt ?? attempt.savedAt)}
              {attempt.isLate ? " (nộp muộn)" : ""}
              {handedInAtDeadline ? " với các câu đã lưu, vì bài chưa được bấm Nộp" : ""}.
            </p>
          </div>
          {exam && <JlptResult level={exam.level} items={view.items} now={now} />}
          {/* The next step sits above a long answer list, not after it. */}
          {actions}
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
            <QuestionCredits credits={view.items.map((item) => item.view.credit)} />
          </section>
        </>
      )}
      {!(attempt && view.isFeedbackAvailable && attempt.score !== null && attempt.maxScore) &&
        actions}
    </div>
  );
}

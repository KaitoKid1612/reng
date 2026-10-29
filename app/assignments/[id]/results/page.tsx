import Link from "next/link";

import { MODE_LABELS } from "@/components/classroom/assignment-labels";
import { buttonVariants } from "@/components/ui/button";
import { formatPercent, toPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { getStudentResults } from "@/lib/server/assignments";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kết quả bài tập" };

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const account = await requireStudent(`/assignments/${id}/results`);
  const view = await loadOrNotFound(getStudentResults(account.id, id, new Date()));
  const { assignment, attempt } = view;
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
            {view.items.map((item, index) => (
              <div key={item.view.id} className="result-row" data-correct={item.isCorrect}>
                <p className="small muted">
                  Câu {index + 1}: {item.isCorrect ? "đúng" : "sai"}, {item.pointsEarned}/
                  {item.view.points} điểm
                </p>
                <p lang="ja" className="question-prompt">
                  {item.view.prompt}
                </p>
                <p>
                  Bạn trả lời: <strong lang="ja">{item.answerText || "(bỏ trống)"}</strong>
                </p>
                {!item.isCorrect && (
                  <p>
                    Đáp án: <strong lang="ja">{item.correctText}</strong>
                  </p>
                )}
                {item.transcript !== null && (
                  <p className="transcript">
                    Transcript: <span lang="ja">{item.transcript}</span> (bạn đã nghe{" "}
                    {item.listenCount} lần)
                  </p>
                )}
                <p className="muted">{item.explain}</p>
              </div>
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
      </div>
    </div>
  );
}

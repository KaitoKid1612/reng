"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AnswerFeedback } from "@/components/classroom/answer-feedback";
import { QuestionField } from "@/components/classroom/question-field";
import { useDraftSync } from "@/components/classroom/use-draft-sync";
import { Button } from "@/components/ui/button";
import { countBlankAnswers, describeCorrectAnswer } from "@/lib/assignment";
import { signInPath } from "@/lib/auth-paths";
import { gradeQuestion } from "@/lib/grading/grade";
import { isBlankAnswer } from "@/lib/grading/raw-answer";
import { formatStudyDateTime } from "@/lib/study-days";

import type { SyncStatus } from "@/components/classroom/use-draft-sync";
import type { AssignmentMode, AttemptDraft, AttemptItem } from "@/lib/assignment";
import type { RawAnswer } from "@/lib/grading/raw-answer";

export interface AttemptRunnerProps {
  userId: string;
  assignmentId: string;
  submissionId: string;
  mode: AssignmentMode;
  items: AttemptItem[];
  initialDraft: AttemptDraft;
  initialRevision: number;
  initialSavedAt: string;
}

const STATUS_TEXT: Record<SyncStatus, string> = {
  saved: "Đã lưu",
  pending: "Có thay đổi chưa lưu",
  saving: "Đang lưu…",
  offline: "Mất kết nối. Câu trả lời được giữ trên máy này và sẽ lưu khi có mạng.",
  error: "Chưa lưu được lên máy chủ.",
  conflict: "Có bản lưu mới hơn từ tab hoặc thiết bị khác.",
  signed_out: "Phiên đăng nhập đã hết. Câu trả lời vẫn được giữ trên máy này.",
  submitted: "Lượt này đã được nộp.",
  closed: "Giảng viên đã đóng bài này.",
  past_due: "Đã quá hạn nộp.",
};

const READ_ONLY_STATUSES: readonly SyncStatus[] = ["conflict", "submitted", "closed", "past_due"];

export function AttemptRunner({
  userId,
  assignmentId,
  submissionId,
  mode,
  items,
  initialDraft,
  initialRevision,
  initialSavedAt,
}: AttemptRunnerProps) {
  const router = useRouter();
  const views = items.map((item) => item.view);
  const sync = useDraftSync({
    userId,
    submissionId,
    views,
    initialDraft,
    initialRevision,
    initialSavedAt,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const isReadOnly = READ_ONLY_STATUSES.includes(sync.status) || isSubmitting;
  const blankCount = countBlankAnswers(views, sync.draft);
  const assignmentPath = `/assignments/${assignmentId}`;

  function handleAnswerChange(questionId: string, value: RawAnswer) {
    sync.updateDraft({ ...sync.draft, answers: { ...sync.draft.answers, [questionId]: value } });
  }

  function handleCheck(questionId: string) {
    sync.updateDraft({ ...sync.draft, checked: [...sync.draft.checked, questionId] });
  }

  function handleMove(nextIndex: number) {
    setCurrentIndex(nextIndex);
    void sync.flush();
  }

  function handleReload() {
    sync.discardLocalCopy();
    router.refresh();
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitMessage("");
    const outcome = await sync.submit();
    if (outcome.isSubmitted && outcome.resultsUrl) {
      router.push(outcome.resultsUrl);
      return;
    }
    setIsSubmitting(false);
    setIsConfirming(false);
    setSubmitMessage(outcome.message ?? "");
  }

  return (
    <div className="attempt-runner">
      {sync.notice && <p className="notice-panel">{sync.notice}</p>}
      {sync.status === "conflict" && (
        <div className="notice-panel" role="alert">
          <p>
            Bài làm vừa được lưu từ tab hoặc thiết bị khác. Tải bản mới nhất để tiếp tục, tránh ghi
            đè câu trả lời mới hơn.
          </p>
          <Button onClick={handleReload}>Tải bản mới nhất</Button>
        </div>
      )}
      {sync.status === "submitted" && (
        <p className="notice-panel" role="status">
          Lượt này đã được nộp. <Link href={`${assignmentPath}/results`}>Xem kết quả</Link>
        </p>
      )}
      {sync.status === "signed_out" && (
        <p className="notice-panel" role="alert">
          Phiên đăng nhập đã hết. <Link href={signInPath(assignmentPath)}>Đăng nhập lại</Link> để
          lưu tiếp; câu trả lời vẫn ở trên máy này.
        </p>
      )}
      <ol className="attempt-questions" aria-label="Câu hỏi">
        {items.map((item, index) => {
          const raw = sync.draft.answers[item.view.id];
          const isChecked = sync.draft.checked.includes(item.view.id);
          const answerKey = item.answerKey;
          return (
            <li key={item.view.id} className="question-card" data-current={index === currentIndex}>
              <QuestionField
                view={item.view}
                position={index + 1}
                total={items.length}
                value={raw}
                isLocked={isReadOnly || isChecked}
                onAnswerChange={(value) => handleAnswerChange(item.view.id, value)}
              />
              {mode === "practice" && answerKey && isChecked && (
                <AnswerFeedback
                  isCorrect={gradeQuestion(answerKey, raw).isCorrect}
                  correctText={describeCorrectAnswer(answerKey)}
                  explain={answerKey.explain}
                />
              )}
              {mode === "practice" && answerKey && !isChecked && (
                <Button
                  variant="outline"
                  disabled={isReadOnly || isBlankAnswer(raw)}
                  onClick={() => handleCheck(item.view.id)}
                >
                  Kiểm tra câu này
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      <div className="question-nav">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => handleMove(currentIndex - 1)}
        >
          Câu trước
        </Button>
        <span className="small muted">
          {currentIndex + 1} / {items.length}
        </span>
        <Button
          variant="outline"
          disabled={currentIndex === items.length - 1}
          onClick={() => handleMove(currentIndex + 1)}
        >
          Câu sau
        </Button>
      </div>
      <div className="attempt-toolbar">
        {isConfirming && (
          <section className="submit-confirm" aria-labelledby="confirm-title">
            <h2 id="confirm-title">Nộp bài?</h2>
            <p>
              {blankCount > 0
                ? `Còn ${blankCount} câu chưa trả lời; câu trống tính 0 điểm.`
                : "Bạn đã trả lời tất cả câu hỏi."}{" "}
              {mode === "test"
                ? "Sau khi nộp không sửa được câu trả lời."
                : "Sau khi nộp sẽ xem được điểm và giải thích."}
            </p>
            <div className="button-row">
              <Button autoFocus disabled={isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? "Đang nộp…" : "Xác nhận nộp"}
              </Button>
              <Button
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => setIsConfirming(false)}
              >
                Làm tiếp
              </Button>
            </div>
          </section>
        )}
        <p className="save-status" data-state={sync.status} role="status" aria-live="polite">
          {STATUS_TEXT[sync.status]}
          {sync.status === "saved" && ` lúc ${formatStudyDateTime(sync.savedAt)}`}
        </p>
        <div className="button-row">
          {(sync.status === "offline" || sync.status === "error") && (
            <Button variant="ghost" onClick={sync.retry}>
              Thử lưu lại
            </Button>
          )}
          {!isConfirming && (
            <Button disabled={isReadOnly} onClick={() => setIsConfirming(true)}>
              Nộp bài
            </Button>
          )}
        </div>
      </div>
      {submitMessage && (
        <p className="error-text" role="alert">
          {submitMessage}
        </p>
      )}
    </div>
  );
}

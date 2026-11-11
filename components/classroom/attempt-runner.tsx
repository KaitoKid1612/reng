"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { AnswerFeedback } from "@/components/classroom/answer-feedback";
import { QuestionField } from "@/components/classroom/question-field";
import { QuestionMap } from "@/components/classroom/question-map";
import { useDraftSync } from "@/components/classroom/use-draft-sync";
import { DeadlineCountdown } from "@/components/classroom/deadline-countdown";
import { ExamTimer } from "@/components/classroom/exam-timer";
import { QuestionCredits } from "@/components/classroom/question-credits";
import { Button } from "@/components/ui/button";
import {
  answerLang,
  correctChoiceIndexes,
  countBlankAnswers,
  describeCorrectAnswer,
  isListeningQuestion,
  MAX_RECORDED_LISTENS,
} from "@/lib/assignment";
import { signInPath } from "@/lib/auth-paths";
import { gradeQuestion } from "@/lib/grading/grade";
import { isBlankAnswer } from "@/lib/grading/raw-answer";
import { formatStudyDateTime } from "@/lib/study-days";

import type { ExamPacingStep } from "@/lib/jlpt";
import type { QuestionMapItem } from "@/components/classroom/question-map";
import type { SyncStatus } from "@/components/classroom/use-draft-sync";
import type { AssignmentMode, AttemptDraft, AttemptItem } from "@/lib/assignment";
import type { RawAnswer } from "@/lib/grading/raw-answer";
import type { KeyboardEvent } from "react";

export interface AttemptRunnerProps {
  userId: string;
  assignmentId: string;
  submissionId: string;
  mode: AssignmentMode;
  items: AttemptItem[];
  initialDraft: AttemptDraft;
  initialRevision: number;
  initialSavedAt: string;
  dueAt?: string | null;
  allowLate?: boolean;
  // A timed mock exam: when the page hands the attempt in, and the server's clock at render.
  // pacing: the real test's time split over the exam's sections, a guide shown under the clock.
  exam?: { handInAt: string; serverNow: string; pacing?: ExamPacingStep[] } | null;
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
  closed: "Giáo viên đã đóng bài này.",
  past_due: "Đã quá hạn nộp.",
};

const READ_ONLY_STATUSES: readonly SyncStatus[] = ["conflict", "submitted", "closed", "past_due"];

// Short sets fit on one screen; the question map helps from this many questions on.
const QUESTION_MAP_MIN = 6;

type FocusTarget = "card" | "field";

export function AttemptRunner({
  userId,
  assignmentId,
  submissionId,
  mode,
  items,
  initialDraft,
  initialRevision,
  initialSavedAt,
  dueAt = null,
  allowLate = true,
  exam = null,
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
  const listRef = useRef<HTMLOListElement>(null);
  const isReadOnly = READ_ONLY_STATUSES.includes(sync.status) || isSubmitting;
  const blankCount = countBlankAnswers(views, sync.draft);
  const assignmentPath = `/assignments/${assignmentId}`;

  function isAnswerCorrect(item: AttemptItem) {
    return (
      item.answerKey !== null &&
      gradeQuestion(item.answerKey, sync.draft.answers[item.view.id]).isCorrect
    );
  }

  function describeMapItem(item: AttemptItem): QuestionMapItem {
    const isChecked = sync.draft.checked.includes(item.view.id);
    if (mode === "practice" && item.answerKey && isChecked) {
      return { id: item.view.id, state: isAnswerCorrect(item) ? "correct" : "wrong" };
    }
    const isBlank = isBlankAnswer(sync.draft.answers[item.view.id]);
    return { id: item.view.id, state: isBlank ? "blank" : "answered" };
  }

  function handleAnswerChange(questionId: string, value: RawAnswer) {
    sync.updateDraft((current) => ({
      ...current,
      answers: { ...current.answers, [questionId]: value },
    }));
  }

  function handleCheck(questionId: string) {
    sync.updateDraft((current) => ({ ...current, checked: [...current.checked, questionId] }));
  }

  function handleListen(questionId: string) {
    sync.updateDraft((current) => ({
      ...current,
      listens: {
        ...current.listens,
        [questionId]: Math.min(MAX_RECORDED_LISTENS, (current.listens[questionId] ?? 0) + 1),
      },
    }));
  }

  // Phones show one question at a time, so the card is rendered before it can take focus. Focus
  // goes to the card for jumps (no keyboard pops up) and to the answer field for Enter. Without a
  // focus target (the Câu trước/Câu sau buttons) focus stays on the button, but a new card whose
  // top is above the screen is brought into view so the learner does not scroll back up.
  function handleMove(nextIndex: number, focus?: FocusTarget) {
    flushSync(() => setCurrentIndex(nextIndex));
    void sync.flush();
    const card = listRef.current?.children[nextIndex];
    if (!(card instanceof HTMLElement)) {
      return;
    }
    const field = card.querySelector<HTMLElement>("input:not(:disabled)");
    if (focus === "field" && field) {
      field.focus();
      return;
    }
    if (focus) {
      card.focus({ preventScroll: true });
    }
    card.scrollIntoView({ block: card.getBoundingClientRect().top < 0 ? "start" : "nearest" });
  }

  // The check button gives way to the feedback, which would drop focus back to the page; it goes
  // to the card instead, as after Enter, without scrolling away from the feedback just shown.
  function handleCheckButton(index: number) {
    flushSync(() => handleCheck(items[index].view.id));
    const card = listRef.current?.children[index];
    if (card instanceof HTMLElement) {
      card.focus({ preventScroll: true });
    }
  }

  // Enter checks a practice answer, then a second Enter (on the locked card) moves to the next
  // question. The last question never opens the submit dialog, so Enter cannot submit by accident.
  function handleEnter(index: number) {
    const item = items[index];
    const canCheck =
      mode === "practice" &&
      item.answerKey !== null &&
      !isReadOnly &&
      !sync.draft.checked.includes(item.view.id) &&
      !isBlankAnswer(sync.draft.answers[item.view.id]);
    if (canCheck) {
      flushSync(() => handleCheck(item.view.id));
      handleMove(index, "card");
      return;
    }
    if (index < items.length - 1) {
      handleMove(index + 1, "field");
    }
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLLIElement>, index: number) {
    if (event.key === "Enter" && event.target === event.currentTarget) {
      event.preventDefault();
      handleEnter(index);
    }
  }

  function handleFirstBlank() {
    const firstBlank = items.findIndex((item) => isBlankAnswer(sync.draft.answers[item.view.id]));
    setIsConfirming(false);
    if (firstBlank >= 0) {
      handleMove(firstBlank, "card");
    }
  }

  function handleReload() {
    sync.discardLocalCopy();
    router.refresh();
  }

  // The last saved and unsaved answers go in a minute before a deadline that refuses late work.
  function handleAutoSubmit() {
    if (isReadOnly) {
      return;
    }
    setIsConfirming(false);
    void handleSubmit();
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitMessage("");
    // Practice keys are on the page already; with a wrong answer the review opens on the
    // mistakes. Test answers stay hidden, so their results open unfiltered.
    const hasWrongPractice =
      mode === "practice" && items.some((item) => item.answerKey && !isAnswerCorrect(item));
    const outcome = await sync.submit();
    if (outcome.isSubmitted && outcome.resultsUrl) {
      router.push(hasWrongPractice ? `${outcome.resultsUrl}?outcome=wrong` : outcome.resultsUrl);
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
      {items.length >= QUESTION_MAP_MIN && (
        <QuestionMap
          items={items.map(describeMapItem)}
          currentIndex={currentIndex}
          onSelect={(index) => handleMove(index, "card")}
        />
      )}
      <ol ref={listRef} className="attempt-questions" aria-label="Câu hỏi">
        {items.map((item, index) => {
          const raw = sync.draft.answers[item.view.id];
          const isChecked = sync.draft.checked.includes(item.view.id);
          const answerKey = item.answerKey;
          return (
            <li
              key={item.view.id}
              className="question-card"
              data-current={index === currentIndex}
              tabIndex={-1}
              onKeyDown={(event) => handleCardKeyDown(event, index)}
            >
              <QuestionField
                view={item.view}
                position={index + 1}
                total={items.length}
                value={raw}
                isLocked={isReadOnly || isChecked}
                onAnswerChange={(value) => handleAnswerChange(item.view.id, value)}
                listenCount={sync.draft.listens[item.view.id] ?? 0}
                onListen={() => handleListen(item.view.id)}
                isSinglePassListening={exam !== null}
                onEnter={() => handleEnter(index)}
                revealedChoices={
                  mode === "practice" && answerKey && isChecked
                    ? correctChoiceIndexes(answerKey)
                    : null
                }
              />
              {mode === "practice" && answerKey && isChecked && (
                <AnswerFeedback
                  isCorrect={gradeQuestion(answerKey, raw).isCorrect}
                  correctText={describeCorrectAnswer(answerKey)}
                  explain={answerKey.explain}
                  transcript={isListeningQuestion(answerKey) ? answerKey.transcript : undefined}
                  lang={answerLang(item.view)}
                  transcriptLang={item.view.lang}
                />
              )}
              {mode === "practice" && answerKey && !isChecked && (
                <Button
                  variant="outline"
                  disabled={isReadOnly || isBlankAnswer(raw)}
                  onClick={() => handleCheckButton(index)}
                >
                  Kiểm tra câu này
                </Button>
              )}
              {/* On a phone the next step takes the check button's place, so a long daily set
                  needs no scrolling down to Câu sau and back up to the next prompt. */}
              {mode === "practice" && answerKey && isChecked && (
                <div className="question-next">
                  {index < items.length - 1 ? (
                    <Button onClick={() => handleMove(index + 1, "card")}>Câu sau ›</Button>
                  ) : (
                    !isReadOnly && <Button onClick={() => setIsConfirming(true)}>Nộp bài</Button>
                  )}
                </div>
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
      <QuestionCredits credits={views.map((view) => view.credit)} />
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
              {blankCount > 0 && (
                <Button variant="outline" disabled={isSubmitting} onClick={handleFirstBlank}>
                  Đến câu chưa làm
                </Button>
              )}
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
        {exam ? (
          <ExamTimer
            handInAt={exam.handInAt}
            serverNow={exam.serverNow}
            pacing={exam.pacing}
            onJump={(position) => handleMove(position - 1, "card")}
            onAutoSubmit={handleAutoSubmit}
          />
        ) : (
          <DeadlineCountdown dueAt={dueAt} allowLate={allowLate} onAutoSubmit={handleAutoSubmit} />
        )}
        <p className="save-status" data-state={sync.status} role="status" aria-live="polite">
          {exam && sync.status === "past_due" ? "Đã hết giờ làm bài." : STATUS_TEXT[sync.status]}
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

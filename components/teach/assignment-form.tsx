"use client";

import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { publishAssignmentAction } from "@/app/actions/classes";
import { MODE_LABELS } from "@/components/classroom/assignment-labels";
import { TestQuestionEditor } from "@/components/teach/test-question-editor";
import { Button } from "@/components/ui/button";
import { assignmentSettingsSchema, MAX_ASSIGNMENT_QUESTIONS, MAX_ATTEMPTS } from "@/lib/assignment";
import { formatStudyDateTime } from "@/lib/study-days";
import {
  createQuestionDraft,
  describeQuestionProblem,
  toTestQuestionInput,
} from "@/lib/test-question-draft";
import { fromVietnamInput } from "@/lib/vietnam-time";

import type { AssignableQuestion, AssignmentMode, FeedbackPolicy } from "@/lib/assignment";
import type { TeachingLanguageTag } from "@/lib/teaching-language";
import type { TestQuestionDraft } from "@/lib/test-question-draft";

const FEEDBACK_SUMMARIES: Record<FeedbackPolicy, string> = {
  after_due: ", công bố kết quả sau hạn",
  after_submit: ", công bố kết quả ngay sau khi nộp",
};

const QUESTION_TYPE_LABELS: Record<AssignableQuestion["type"], string> = {
  choice: "trắc nghiệm",
  fill: "điền từ",
  listen: "nghe",
  dictation: "chính tả",
};

export interface AssignableLesson {
  lessonId: string;
  title: string;
  versionNo: number;
  questions: { id: string; type: AssignableQuestion["type"]; prompt: string; points: number }[];
}

interface AssignmentFormProps {
  classId: string;
  classPassScore: number;
  languageTag: TeachingLanguageTag;
  lessons: AssignableLesson[];
}

export function AssignmentForm({
  classId,
  classPassScore,
  languageTag,
  lessons,
}: AssignmentFormProps) {
  const [lessonId, setLessonId] = useState(lessons[0]?.lessonId ?? "");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<AssignmentMode>("practice");
  const [dueInput, setDueInput] = useState("");
  const [allowLate, setAllowLate] = useState(false);
  const [passScore, setPassScore] = useState(classPassScore);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [feedbackPolicy, setFeedbackPolicy] = useState<FeedbackPolicy>("after_submit");
  const [practiceIds, setPracticeIds] = useState<string[]>([]);
  const [testQuestions, setTestQuestions] = useState<TestQuestionDraft[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const nextKeyRef = useRef(1);
  // Lessons can arrive after the first render (added to the class on this page), so the
  // selection falls back to the first available lesson instead of an empty value.
  const lesson = lessons.find((item) => item.lessonId === lessonId) ?? lessons[0];

  const settings = {
    title: title.trim(),
    mode,
    dueAt: dueInput ? fromVietnamInput(dueInput) || null : null,
    allowLate,
    passScore,
    maxAttempts: mode === "test" ? 1 : maxAttempts,
    feedbackPolicy: mode === "practice" ? "after_submit" : feedbackPolicy,
  };
  const questionCount = mode === "practice" ? practiceIds.length : testQuestions.length;

  function handleModeChange(nextMode: AssignmentMode) {
    setMode(nextMode);
    setFeedbackPolicy(nextMode === "test" ? "after_due" : "after_submit");
    setIsReviewing(false);
  }

  function handleLessonChange(nextLessonId: string) {
    setLessonId(nextLessonId);
    setPracticeIds([]);
    setIsReviewing(false);
    setError("");
  }

  function handleAddQuestion(type: "choice" | "fill") {
    const key = nextKeyRef.current;
    nextKeyRef.current += 1;
    setTestQuestions((current) => [...current, createQuestionDraft(key, type, languageTag)]);
  }

  // The server also rejects deadlines in the past, using its own clock.
  function findProblem() {
    if (!lesson) {
      return "Thêm bài học vào lớp trước khi giao bài.";
    }
    if (!settings.title) {
      return "Nhập tiêu đề bài giao.";
    }
    if (dueInput && !settings.dueAt) {
      return "Hạn nộp chưa đúng định dạng.";
    }
    if (settings.feedbackPolicy === "after_due" && !settings.dueAt) {
      return "Công bố kết quả sau hạn thì cần đặt hạn nộp.";
    }
    if (!assignmentSettingsSchema.safeParse(settings).success) {
      return "Kiểm tra lại điểm đạt (0–100) và số lượt làm.";
    }
    if (questionCount === 0 || questionCount > MAX_ASSIGNMENT_QUESTIONS) {
      return `Chọn từ 1 đến ${MAX_ASSIGNMENT_QUESTIONS} câu hỏi.`;
    }
    if (mode === "test" && testQuestions.some((draft) => describeQuestionProblem(draft))) {
      return "Một số câu kiểm tra chưa hợp lệ. Xem ghi chú dưới từng câu.";
    }
    return null;
  }

  function handleReview() {
    const problem = findProblem();
    setShowProblems(true);
    setError(problem ?? "");
    setIsReviewing(problem === null);
  }

  function handlePublish() {
    setError("");
    startTransition(async () => {
      let result;
      try {
        result = await publishAssignmentAction({
          classId,
          lessonId: lesson?.lessonId ?? "",
          settings,
          practiceQuestionIds: mode === "practice" ? practiceIds : [],
          testQuestions: mode === "test" ? testQuestions.map(toTestQuestionInput) : [],
        });
      } catch (error) {
        // A successful publish redirects; anything else keeps the form so nothing is retyped.
        unstable_rethrow(error);
        setError(
          "Chưa gửi được tới máy chủ (mất mạng hoặc trang vừa được cập nhật). Câu hỏi vẫn còn trên trang, bạn thử giao lại.",
        );
        setIsReviewing(false);
        return;
      }
      if (result.error) {
        setError(result.error);
        setIsReviewing(false);
      }
    });
  }

  if (!lessons.length) {
    return (
      <p className="notice-panel">
        Lớp chưa có bài học nào. Thêm bài học vào lớp ở phần trên trước khi giao bài.
      </p>
    );
  }

  return (
    <div className="assignment-form">
      <div className="form-card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="assignment-lesson">Bài học</label>
            <select
              id="assignment-lesson"
              value={lesson?.lessonId}
              onChange={(event) => handleLessonChange(event.target.value)}
            >
              {lessons.map((item) => (
                <option key={item.lessonId} value={item.lessonId}>
                  {item.title} (phiên bản {item.versionNo})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="assignment-title">Tiêu đề</label>
            <input
              id="assignment-title"
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                languageTag === "ja-JP" ? "Luyện trợ từ bài 1" : "Luyện chữ Hán và pinyin bài 1"
              }
            />
          </div>
        </div>
        <fieldset>
          <legend>Loại bài</legend>
          <div className="option-row">
            {(["practice", "test"] as const).map((item) => (
              <label key={item} className="choice-label">
                <input
                  type="radio"
                  name="assignment-mode"
                  checked={mode === item}
                  onChange={() => handleModeChange(item)}
                />
                {MODE_LABELS[item]}
              </label>
            ))}
          </div>
          <p className="small muted">
            {mode === "practice"
              ? "Dùng câu luyện công khai của bài, học viên được chấm từng câu ngay."
              : "Nhập câu hỏi riêng, chỉ một lượt; đáp án không gửi xuống trình duyệt trước khi công bố."}
          </p>
        </fieldset>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="assignment-due">Hạn nộp (giờ Việt Nam)</label>
            <input
              id="assignment-due"
              type="datetime-local"
              value={dueInput}
              onChange={(event) => setDueInput(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="assignment-pass">Điểm đạt (%)</label>
            <input
              id="assignment-pass"
              type="number"
              min={0}
              max={100}
              value={passScore}
              onChange={(event) => setPassScore(Number(event.target.value))}
            />
          </div>
          {mode === "practice" ? (
            <div className="field">
              <label htmlFor="assignment-attempts">Số lượt làm tối đa</label>
              <input
                id="assignment-attempts"
                type="number"
                min={1}
                max={MAX_ATTEMPTS}
                value={maxAttempts}
                onChange={(event) => setMaxAttempts(Number(event.target.value))}
              />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="assignment-feedback">Công bố kết quả</label>
              <select
                id="assignment-feedback"
                value={feedbackPolicy}
                onChange={(event) =>
                  setFeedbackPolicy(
                    event.target.value === "after_submit" ? "after_submit" : "after_due",
                  )
                }
              >
                <option value="after_due">Sau hạn nộp</option>
                <option value="after_submit">Ngay sau khi nộp</option>
              </select>
            </div>
          )}
          <label className="choice-label">
            <input
              type="checkbox"
              checked={allowLate}
              onChange={(event) => setAllowLate(event.target.checked)}
            />
            Cho phép nộp muộn
          </label>
        </div>
      </div>
      {mode === "practice" && lesson && (
        <fieldset className="form-card">
          <legend>Câu luyện từ phiên bản {lesson.versionNo}</legend>
          {lesson.questions.length === 0 && (
            <p className="muted">
              Bài này chưa có câu luyện giao được (trắc nghiệm, điền từ, nghe).
            </p>
          )}
          {lesson.questions.map((question) => (
            <label key={question.id} className="choice-option">
              <input
                type="checkbox"
                checked={practiceIds.includes(question.id)}
                onChange={() =>
                  setPracticeIds((current) =>
                    current.includes(question.id)
                      ? current.filter((id) => id !== question.id)
                      : [...current, question.id],
                  )
                }
              />
              <span lang={languageTag === "ja-JP" ? "ja" : "vi"}>{question.prompt}</span>
              <span className="small muted">
                {QUESTION_TYPE_LABELS[question.type]}, {question.points} điểm
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {mode === "test" && (
        <section aria-labelledby="test-questions-title">
          <h3 id="test-questions-title">Câu hỏi kiểm tra riêng</h3>
          {testQuestions.map((draft, index) => (
            <TestQuestionEditor
              key={draft.key}
              draft={draft}
              languageTag={languageTag}
              position={index + 1}
              showProblems={showProblems}
              onChange={(next) =>
                setTestQuestions((current) =>
                  current.map((item) => (item.key === draft.key ? next : item)),
                )
              }
              onRemove={() =>
                setTestQuestions((current) => current.filter((item) => item.key !== draft.key))
              }
            />
          ))}
          <div className="button-row">
            <Button variant="outline" onClick={() => handleAddQuestion("choice")}>
              Thêm câu trắc nghiệm
            </Button>
            <Button variant="outline" onClick={() => handleAddQuestion("fill")}>
              Thêm câu điền từ
            </Button>
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {isReviewing ? (
        <section className="notice-panel" aria-labelledby="publish-review-title">
          <h3 id="publish-review-title">Xem lại trước khi xuất bản</h3>
          <p>
            “{settings.title}”: {MODE_LABELS[mode]}, {questionCount} câu, đạt từ {passScore}%,{" "}
            {settings.maxAttempts} lượt,{" "}
            {settings.dueAt ? `hạn ${formatStudyDateTime(settings.dueAt)}` : "không có hạn"}
            {allowLate ? ", cho nộp muộn" : ""}
            {mode === "test" && FEEDBACK_SUMMARIES[settings.feedbackPolicy]}.
          </p>
          <p>
            Sau khi xuất bản, đề và điều kiện không sửa được; chỉ đổi tiêu đề hoặc đóng bài rồi giao
            bài mới.
          </p>
          <div className="button-row">
            <Button onClick={handlePublish} disabled={isPending}>
              {isPending ? "Đang xuất bản…" : "Xuất bản bài giao"}
            </Button>
            <Button variant="ghost" onClick={() => setIsReviewing(false)} disabled={isPending}>
              Sửa tiếp
            </Button>
          </div>
        </section>
      ) : (
        <Button onClick={handleReview}>Xem lại và xuất bản</Button>
      )}
    </div>
  );
}

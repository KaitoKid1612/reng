"use client";

import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { publishAssignmentAction } from "@/app/actions/classes";
import { MODE_LABELS } from "@/components/classroom/assignment-labels";
import { PracticeQuestionPicker } from "@/components/teach/practice-question-picker";
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
import type { TestQuestionDraft, TestQuestionType } from "@/lib/test-question-draft";

// A title the teacher can keep or change: the kind of work and the lesson it comes from.
function suggestTitle(mode: AssignmentMode, lessonTitle: string) {
  return `${mode === "test" ? "Kiểm tra" : "Luyện tập"} – ${lessonTitle}`.slice(0, 160);
}

const FEEDBACK_SUMMARIES: Record<FeedbackPolicy, string> = {
  after_due: ", công bố kết quả sau hạn",
  after_submit: ", công bố kết quả ngay sau khi nộp",
};

export interface AssignableLesson {
  lessonId: string;
  title: string;
  // What the lesson select shows; differs from the title only for two lessons of the same title.
  label: string;
  versionNo: number;
  // A newer published version the class does not use yet; its new questions are not offered.
  newerVersionNo?: number | null;
  questions: {
    id: string;
    type: AssignableQuestion["type"];
    prompt: string;
    points: number;
    tags: string[];
  }[];
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
  const [title, setTitle] = useState(() =>
    lessons[0] ? suggestTitle("practice", lessons[0].title) : "",
  );
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
  // The field the error is about: it is marked invalid and gets focus, since the message sits by
  // the buttons at the end of a long form.
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nextKeyRef = useRef(1);
  // Lessons can arrive after the first render (added to the class on this page), so the
  // selection falls back to the first available lesson instead of an empty value.
  const lesson = lessons.find((item) => item.lessonId === lessonId) ?? lessons[0];
  const listeningIds = (lesson?.questions ?? [])
    .filter((question) => question.type === "listen" || question.type === "dictation")
    .map((question) => question.id);

  // A title still as suggested follows the lesson and the kind of work; a typed one is kept.
  const isSuggestedTitle =
    !title.trim() || (lesson !== undefined && title === suggestTitle(mode, lesson.title));

  // A listening set beside the day's daily practice: its questions, and a title if none is typed.
  function handlePickListening() {
    setPracticeIds(listeningIds);
    if (isSuggestedTitle && lesson) {
      setTitle(`Luyện nghe – ${lesson.title}`.slice(0, 160));
    }
    setIsReviewing(false);
  }

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
    if (isSuggestedTitle && lesson) {
      setTitle(suggestTitle(nextMode, lesson.title));
    }
    setMode(nextMode);
    setFeedbackPolicy(nextMode === "test" ? "after_due" : "after_submit");
    setIsReviewing(false);
  }

  function handleLessonChange(nextLessonId: string) {
    const next = lessons.find((item) => item.lessonId === nextLessonId);
    if (isSuggestedTitle && next) {
      setTitle(suggestTitle(mode, next.title));
    }
    setLessonId(nextLessonId);
    setPracticeIds([]);
    setIsReviewing(false);
    setError("");
  }

  // A question for the same reading passage goes right after the one it extends.
  function handleAddQuestion(type: TestQuestionType, from?: TestQuestionDraft) {
    const key = nextKeyRef.current;
    nextKeyRef.current += 1;
    const draft = createQuestionDraft(key, type, languageTag, from?.passage);
    setTestQuestions((current) => {
      const after = current.findIndex((item) => item.key === from?.key);
      const position = after === -1 ? current.length : after + 1;
      return [...current.slice(0, position), draft, ...current.slice(position)];
    });
  }

  // The server also rejects deadlines in the past, using its own clock.
  function findProblem(): { message: string; field?: string } | null {
    if (!lesson) {
      return { message: "Thêm bài học vào lớp trước khi giao bài." };
    }
    if (!settings.title) {
      return { message: "Nhập tiêu đề bài giao.", field: "assignment-title" };
    }
    if (dueInput && !settings.dueAt) {
      return { message: "Hạn nộp chưa đúng định dạng.", field: "assignment-due" };
    }
    if (settings.feedbackPolicy === "after_due" && !settings.dueAt) {
      return { message: "Công bố kết quả sau hạn thì cần đặt hạn nộp.", field: "assignment-due" };
    }
    if (!assignmentSettingsSchema.safeParse(settings).success) {
      return { message: "Kiểm tra lại điểm đạt (0–100) và số lượt làm.", field: "assignment-pass" };
    }
    if (questionCount === 0 || questionCount > MAX_ASSIGNMENT_QUESTIONS) {
      return { message: `Chọn từ 1 đến ${MAX_ASSIGNMENT_QUESTIONS} câu hỏi.` };
    }
    if (mode === "test" && testQuestions.some((draft) => describeQuestionProblem(draft))) {
      return { message: "Một số câu kiểm tra chưa hợp lệ. Xem ghi chú dưới từng câu." };
    }
    return null;
  }

  function handleReview() {
    const problem = findProblem();
    setShowProblems(true);
    setError(problem?.message ?? "");
    setInvalidField(problem?.field ?? null);
    setIsReviewing(problem === null);
    if (problem?.field) {
      document.getElementById(problem.field)?.focus();
    }
  }

  function fieldState(id: string) {
    return invalidField === id
      ? { "aria-invalid": true, "aria-describedby": "assignment-error" }
      : {};
  }

  function handlePublish() {
    setError("");
    setInvalidField(null);
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
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="assignment-title">Tiêu đề</label>
            <input
              id="assignment-title"
              {...fieldState("assignment-title")}
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
              ? "Dùng câu luyện của bài; học viên được chấm từng câu ngay."
              : "Nhập câu hỏi riêng; học viên làm một lượt và không xem được đáp án trước khi bạn công bố."}
          </p>
        </fieldset>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="assignment-due">Hạn nộp (giờ Việt Nam)</label>
            <input
              id="assignment-due"
              {...fieldState("assignment-due")}
              type="datetime-local"
              value={dueInput}
              onChange={(event) => setDueInput(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="assignment-pass">Điểm đạt (%)</label>
            <input
              id="assignment-pass"
              {...fieldState("assignment-pass")}
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
          <legend>Câu luyện của bài</legend>
          {lesson.questions.length === 0 ? (
            <p className="muted">
              Bài này chưa có câu luyện giao được (trắc nghiệm, điền từ, sắp xếp, ghép đôi, nghe,
              chính tả).
            </p>
          ) : (
            // A starter lesson has about 50 questions; ticking each one is not a task.
            <PracticeQuestionPicker
              questions={lesson.questions}
              selectedIds={practiceIds}
              onSelectedIdsChange={setPracticeIds}
              languageTag={languageTag}
              listeningCount={listeningIds.length}
              onPickListening={handlePickListening}
            />
          )}
          {lesson.newerVersionNo && (
            <p className="notice-panel small">
              Lớp đang dùng bản cũ của bài. Bản mới nhất có câu mới (ví dụ câu nghe vừa thêm) chỉ
              hiện ở đây sau khi cập nhật lớp lên bản mới nhất ở mục Nội dung lớp phía trên.
            </p>
          )}
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
              onAddSamePassage={() => handleAddQuestion("choice", draft)}
            />
          ))}
          <div className="button-row">
            <Button variant="outline" onClick={() => handleAddQuestion("choice")}>
              Thêm câu trắc nghiệm
            </Button>
            <Button variant="outline" onClick={() => handleAddQuestion("fill")}>
              Thêm câu điền từ
            </Button>
            <Button variant="outline" onClick={() => handleAddQuestion("order")}>
              Thêm câu sắp xếp
            </Button>
            <Button variant="outline" onClick={() => handleAddQuestion("match")}>
              Thêm câu ghép đôi
            </Button>
          </div>
        </section>
      )}
      {error && (
        <p id="assignment-error" role="alert" className="error-text">
          {error}
        </p>
      )}
      {isReviewing ? (
        <section className="notice-panel" aria-labelledby="publish-review-title">
          <h3 id="publish-review-title">Xem lại trước khi giao</h3>
          <p>
            “{settings.title}”: {MODE_LABELS[mode]}, {questionCount} câu, đạt từ {passScore}%,{" "}
            {settings.maxAttempts} lượt,{" "}
            {settings.dueAt ? `hạn ${formatStudyDateTime(settings.dueAt)}` : "không có hạn"}
            {allowLate ? ", cho nộp muộn" : ""}
            {mode === "test" && FEEDBACK_SUMMARIES[settings.feedbackPolicy]}.
          </p>
          <p>
            Sau khi giao, câu hỏi, đáp án và điều kiện không đổi được; câu chữ và furigana của đề
            vẫn sửa được ở trang Sửa lỗi hiển thị. Muốn đổi thêm, đóng bài rồi giao bài mới.
          </p>
          <div className="button-row">
            <Button onClick={handlePublish} disabled={isPending}>
              {isPending ? "Đang giao bài…" : "Giao bài cho lớp"}
            </Button>
            <Button variant="ghost" onClick={() => setIsReviewing(false)} disabled={isPending}>
              Sửa tiếp
            </Button>
          </div>
        </section>
      ) : (
        <Button onClick={handleReview}>Xem lại trước khi giao</Button>
      )}
    </div>
  );
}

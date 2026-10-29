"use client";

import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import Link from "next/link";

import {
  publishTeachingLessonAction,
  saveTeachingDraftAction,
} from "@/app/actions/teaching-lessons";
import { LessonVisibilityForm } from "@/components/editor/lesson-visibility-form";
import { GoalStep } from "@/components/teaching/goal-step";
import { QuestionStep } from "@/components/teaching/question-step";
import { SlidesStep } from "@/components/teaching/slides-step";
import { StructureStep } from "@/components/teaching/structure-step";
import { TeachingReader } from "@/components/teaching/teaching-reader";
import { VocabularyStep } from "@/components/teaching/vocabulary-step";
import { Button } from "@/components/ui/button";
import { reviewTeachingDraft } from "@/lib/teaching-content";
import {
  createReviewedQuestions,
  isQuestionReviewed,
  teachingReducer,
  toPreviewLesson,
} from "@/lib/teaching-draft";

import type { TeachingEditorData } from "@/lib/server/teaching-lessons";
import type { TeachingDraft } from "@/lib/teaching-content";
import type { ReviewedQuestions } from "@/lib/teaching-draft";

const STEPS = ["Mục tiêu", "Từ vựng", "Mẫu câu & hội thoại", "Câu luyện", "Slide & xuất bản"];
const LAST_STEP = STEPS.length - 1;

interface SavedState {
  revision: number;
  savedAt: string;
  snapshot: string;
  reviewed: ReviewedQuestions;
}

interface EditorStatus {
  tone: "idle" | "busy" | "success" | "error";
  message: string;
}

// Moving between steps is saved with the draft but never counts as unsaved work.
function toSnapshot(draft: TeachingDraft) {
  return JSON.stringify({ ...draft, authoring: { ...draft.authoring, step: 0 } });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export interface TeachingEditorProps {
  lessonId: string;
  initialDraft: TeachingDraft;
  initialRevision: number;
  initialSavedAt: string;
  initialReviewedIds: string[];
  initialPublishedVersionId: string | null;
  initialVersionCount: number;
  visibility: "public" | "class";
}

export function TeachingEditor({
  lessonId,
  initialDraft,
  initialRevision,
  initialSavedAt,
  initialReviewedIds,
  initialPublishedVersionId,
  initialVersionCount,
  visibility,
}: TeachingEditorProps) {
  const [draft, dispatch] = useReducer(teachingReducer, initialDraft);
  const [saved, setSaved] = useState<SavedState>(() => ({
    revision: initialRevision,
    savedAt: initialSavedAt,
    snapshot: toSnapshot(initialDraft),
    reviewed: createReviewedQuestions(initialDraft, initialReviewedIds),
  }));
  const [status, setStatus] = useState<EditorStatus>({ tone: "idle", message: "" });
  const [serverProblems, setServerProblems] = useState<string[]>([]);
  const [published, setPublished] = useState({
    versionId: initialPublishedVersionId,
    count: initialVersionCount,
  });
  const [isPending, startTransition] = useTransition();
  const draftRef = useRef(draft);
  const isDirty = toSnapshot(draft) !== saved.snapshot;
  const step = draft.authoring.step;
  const report = reviewTeachingDraft(draft);
  const unreviewedCount = draft.content.questions.filter(
    (question) => !isQuestionReviewed(question, saved.reviewed),
  ).length;

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function applySaved(editor: TeachingEditorData, sentSnapshot: string) {
    const next: TeachingDraft = {
      title: editor.title,
      order: editor.order,
      content: editor.content,
      authoring: editor.authoring,
    };
    // Edits typed while the request was in flight stay local and remain unsaved.
    if (toSnapshot(draftRef.current) === sentSnapshot) {
      dispatch({ type: "replace", draft: next });
    }
    setSaved({
      revision: editor.revision,
      savedAt: editor.savedAt,
      snapshot: toSnapshot(next),
      reviewed: createReviewedQuestions(next, editor.reviewedIds),
    });
  }

  // Returns the new revision, or null when nothing was saved.
  async function save(confirmedIds: string[] = []) {
    const sentSnapshot = toSnapshot(draft);
    setStatus({
      tone: "busy",
      message: confirmedIds.length ? "Đang lưu và xác nhận đáp án…" : "Đang lưu…",
    });
    const result = await saveTeachingDraftAction({
      lessonId,
      revision: saved.revision,
      draft,
      confirmedIds,
    });
    if (result.status === "saved") {
      applySaved(result.editor, sentSnapshot);
      setStatus({
        tone: "success",
        message: confirmedIds.length
          ? "Đã lưu và xác nhận đáp án."
          : `Đã lưu lúc ${formatTime(result.editor.savedAt)}.`,
      });
      return result.editor.revision;
    }
    if (result.status === "conflict") {
      setStatus({
        tone: "error",
        message: `Bài đã được sửa ở tab hoặc máy khác (bản ${result.revision}). Tải lại trang để lấy bản mới nhất; tab này không ghi đè lên bản đó.`,
      });
      return null;
    }
    setStatus({ tone: "error", message: result.message });
    return null;
  }

  function handleSave() {
    startTransition(async () => {
      await save();
    });
  }

  function handleConfirm(questionId: string) {
    startTransition(async () => {
      await save([questionId]);
    });
  }

  function handlePublish() {
    startTransition(async () => {
      let revision = saved.revision;
      if (isDirty) {
        const next = await save();
        if (next === null) {
          return;
        }
        revision = next;
      }
      setStatus({ tone: "busy", message: "Đang xuất bản…" });
      const result = await publishTeachingLessonAction({ lessonId, revision });
      if (result.status === "published") {
        setServerProblems([]);
        setPublished((current) => ({ versionId: result.versionId, count: current.count + 1 }));
        setSaved((current) => ({ ...current, revision: result.revision }));
        setStatus({
          tone: "success",
          message:
            "Đã xuất bản phiên bản mới. Bài vẫn riêng tư; giao cho lớp ở trang lớp khi bạn sẵn sàng.",
        });
        return;
      }
      if (result.status === "invalid") {
        setServerProblems(result.problems);
        setStatus({ tone: "error", message: "Chưa xuất bản được. Xem các mục cần sửa bên dưới." });
        return;
      }
      if (result.status === "conflict") {
        setStatus({
          tone: "error",
          message: `Bài đã được sửa ở nơi khác (bản ${result.revision}). Tải lại trang rồi xuất bản.`,
        });
        return;
      }
      setStatus({ tone: "error", message: result.message });
    });
  }

  function goToStep(index: number) {
    dispatch({ type: "setAuthoring", patch: { step: Math.min(LAST_STEP, Math.max(0, index)) } });
  }

  const statusMessage =
    status.message ||
    (isDirty ? "Có thay đổi chưa lưu." : `Đã lưu lúc ${formatTime(saved.savedAt)}.`);
  return (
    <div className="teaching-editor">
      <div className="editor-toolbar">
        <nav aria-label="Các bước soạn bài">
          <ol className="teaching-steps">
            {STEPS.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  className="teaching-step"
                  aria-current={index === step ? "step" : undefined}
                  onClick={() => goToStep(index)}
                >
                  {index + 1}. {label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <p className="editor-status" role="status" data-tone={status.tone}>
          {statusMessage}
          {status.message && isDirty ? " Có thay đổi chưa lưu." : ""}
        </p>
        <Button type="button" onClick={handleSave} disabled={isPending || !isDirty}>
          Lưu nháp
        </Button>
      </div>
      {step === 0 && <GoalStep draft={draft} dispatch={dispatch} />}
      {step === 1 && <VocabularyStep draft={draft} dispatch={dispatch} />}
      {step === 2 && <StructureStep draft={draft} dispatch={dispatch} />}
      {step === 3 && (
        <QuestionStep
          draft={draft}
          dispatch={dispatch}
          reviewed={saved.reviewed}
          isBusy={isPending}
          onConfirm={handleConfirm}
        />
      )}
      {step === LAST_STEP && (
        <>
          <SlidesStep draft={draft} dispatch={dispatch} lessonId={lessonId} />
          <section className="editor-section" aria-labelledby="publish-title">
            <h2 id="publish-title">Xem trước và xuất bản</h2>
            {report.problems.length > 0 && (
              <div className="notice-panel" role="region" aria-label="Cần sửa trước khi xuất bản">
                <p>Cần sửa trước khi xuất bản:</p>
                <ul>
                  {report.problems.map((problem, index) => (
                    <li key={index}>{problem}</li>
                  ))}
                </ul>
              </div>
            )}
            {unreviewedCount > 0 && (
              <p className="status-attention">
                {unreviewedCount} câu luyện chưa xác nhận đáp án sau lần sửa cuối.
              </p>
            )}
            {report.warnings.length > 0 && (
              <div className="notice-panel" role="region" aria-label="Nên kiểm tra lại">
                <p>Nên kiểm tra lại:</p>
                <ul>
                  {report.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {serverProblems.length > 0 && (
              <div className="notice-panel" role="alert">
                <ul>
                  {serverProblems.map((problem, index) => (
                    <li key={index}>{problem}</li>
                  ))}
                </ul>
              </div>
            )}
            <details className="teaching-preview">
              <summary>Xem trước trang đọc của học viên</summary>
              <TeachingReader lesson={toPreviewLesson(draft, lessonId)} progress={null} isPreview />
            </details>
            <p className="small muted">
              Xuất bản tạo một phiên bản cố định để giao cho lớp. Không tự công khai, không tự giao
              bài và không gửi email.
            </p>
            <Button type="button" onClick={handlePublish} disabled={isPending}>
              Lưu và xuất bản
            </Button>
            <p className="small">
              {published.count
                ? `${published.count} phiên bản đã xuất bản.`
                : "Chưa xuất bản phiên bản nào."}{" "}
              {published.versionId && (
                <>
                  <Link href={`/lessons/${lessonId}?version=${published.versionId}`}>
                    Xem bản đã xuất bản
                  </Link>
                  {" · "}
                  <Link href={`/lessons/${lessonId}/slide?version=${published.versionId}#1`}>
                    Trình chiếu
                  </Link>
                  {" · "}
                  <Link href="/teach/classes">Giao cho lớp</Link>
                </>
              )}
            </p>
            <LessonVisibilityForm lessonId={lessonId} visibility={visibility} />
          </section>
        </>
      )}
      <div className="button-row">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => goToStep(step - 1)}
        >
          Bước trước
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={step === LAST_STEP}
          onClick={() => goToStep(step + 1)}
        >
          Bước tiếp
        </Button>
      </div>
    </div>
  );
}

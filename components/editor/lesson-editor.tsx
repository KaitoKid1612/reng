"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useState, useTransition } from "react";

import {
  loadLessonDraftAction,
  publishLessonAction,
  saveLessonDraftAction,
} from "@/app/actions/lessons";
import { GrammarFields, VocabularyFields } from "@/components/editor/content-fields";
import { LessonVisibilityForm } from "@/components/editor/lesson-visibility-form";
import { QuestionFields } from "@/components/editor/question-fields";
import { SlideFields } from "@/components/editor/slide-fields";
import { SLIDE_TYPE_LABELS, SLIDE_TYPES } from "@/components/editor/slide-labels";
import { SlideList } from "@/components/editor/slide-list";
import { SlidePreview } from "@/components/editor/slide-preview";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AUDIO_COMMAND,
  countMissingAudio,
  countMissingListeningAudio,
  createItemId,
} from "@/lib/lesson-draft";
import { createEditorState, editorReducer } from "@/lib/lesson-editor";
import { formatStudyDateTime } from "@/lib/study-days";

import type { ItemKind, LessonDraftState, PublishProblem, SlideType } from "@/lib/lesson-draft";

export interface LessonEditorProps {
  lessonId: string;
  initialDraft: LessonDraftState;
  initialRevision: number;
  initialSavedAt: string;
  publishedVersionId: string | null;
  versionCount: number;
  visibility: "public" | "class";
}

interface EditorStatus {
  tone: "status-neutral" | "status-correct" | "status-attention" | "status-wrong";
  text: string;
}

const SECTION_LABELS: Record<PublishProblem["section"], string> = {
  info: "Thông tin bài",
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  questions: "Câu luyện",
  slides: "Slide",
};

export function LessonEditor({
  lessonId,
  initialDraft,
  initialRevision,
  initialSavedAt,
  publishedVersionId,
  versionCount,
  visibility,
}: LessonEditorProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(editorReducer, initialDraft, createEditorState);
  const [revision, setRevision] = useState(initialRevision);
  const [savedChange, setSavedChange] = useState(0);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const [problems, setProblems] = useState<PublishProblem[]>([]);
  const [newSlideType, setNewSlideType] = useState<SlideType>("vocab");
  const [status, setStatus] = useState<EditorStatus>({
    tone: "status-neutral",
    text: `Bản nháp lưu lúc ${formatStudyDateTime(initialSavedAt)}.`,
  });
  const [isPending, startTransition] = useTransition();
  const { draft } = state;
  const isDirty = state.changeCount !== savedChange;
  const selectedIndex = draft.content.slides.findIndex(
    (slide) => slide.id === state.selectedSlideId,
  );
  const selectedSlide = draft.content.slides[selectedIndex];
  const missingAudio = countMissingAudio(draft.content);
  const missingListeningAudio = countMissingListeningAudio(draft.content);

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

  function createId(kind: ItemKind) {
    return createItemId(kind, draft.content);
  }

  function handleSave(expectedRevision: number) {
    const change = state.changeCount;
    startTransition(async () => {
      const outcome = await saveLessonDraftAction({ lessonId, revision: expectedRevision, draft });
      if (outcome.status === "saved") {
        setRevision(outcome.revision);
        setSavedChange(change);
        setConflictRevision(null);
        setStatus({
          tone: "status-correct",
          text: `Đã lưu nháp lúc ${formatStudyDateTime(outcome.savedAt)}.`,
        });
        return;
      }
      if (outcome.status === "conflict") {
        setConflictRevision(outcome.revision);
        setStatus({ tone: "status-attention", text: "Bài vừa được lưu ở tab hoặc thiết bị khác." });
        return;
      }
      setStatus({ tone: "status-wrong", text: outcome.message });
    });
  }

  function handlePublish() {
    const change = state.changeCount;
    startTransition(async () => {
      const outcome = await publishLessonAction({ lessonId, revision, draft });
      if (outcome.status === "published") {
        setRevision(outcome.revision);
        setSavedChange(change);
        setProblems([]);
        setConflictRevision(null);
        setStatus({
          tone: "status-correct",
          text: "Đã xuất bản phiên bản mới. Lớp đang ghim phiên bản cũ giữ nguyên tới khi bạn nâng phiên bản.",
        });
        router.refresh();
        return;
      }
      if (outcome.status === "invalid") {
        setProblems(outcome.problems);
        setStatus({
          tone: "status-wrong",
          text: `Chưa xuất bản: còn ${outcome.problems.length} chỗ cần sửa.`,
        });
        return;
      }
      if (outcome.status === "conflict") {
        setConflictRevision(outcome.revision);
        setStatus({ tone: "status-attention", text: "Bài vừa được lưu ở tab hoặc thiết bị khác." });
        return;
      }
      setStatus({ tone: "status-wrong", text: outcome.message });
    });
  }

  function handleReload() {
    startTransition(async () => {
      const outcome = await loadLessonDraftAction(lessonId);
      if (outcome.status === "error") {
        setStatus({ tone: "status-wrong", text: outcome.message });
        return;
      }
      dispatch({ type: "replace", draft: outcome.draft });
      setSavedChange(state.changeCount + 1);
      setRevision(outcome.revision);
      setConflictRevision(null);
      setProblems([]);
      setStatus({
        tone: "status-neutral",
        text: `Đã tải bản lưu lúc ${formatStudyDateTime(outcome.savedAt)}.`,
      });
    });
  }

  function handleProblemClick(problem: PublishProblem) {
    if (problem.section === "slides" && problem.itemId) {
      dispatch({ type: "selectSlide", id: problem.itemId });
    }
  }

  return (
    <div className="editor-layout">
      <div className="editor-form">
        <div className="editor-toolbar">
          <p className={`editor-status ${status.tone}`} role="status">
            {isPending ? "Đang xử lý… " : ""}
            {isDirty ? "Có thay đổi chưa lưu. " : ""}
            {status.text}
          </p>
          <div className="button-row">
            {/* aria-disabled keeps keyboard focus on the button while a request runs. */}
            <Button
              variant="outline"
              aria-disabled={isPending}
              onClick={() => !isPending && handleSave(revision)}
            >
              Lưu nháp
            </Button>
            <Button aria-disabled={isPending} onClick={() => !isPending && handlePublish()}>
              Xuất bản
            </Button>
          </div>
        </div>
        {conflictRevision !== null && (
          <div className="notice-panel" role="alert">
            <p>
              Bản trên máy chủ đã được lưu từ nơi khác. Tải bản đó (bỏ thay đổi ở đây) hoặc ghi đè
              bằng bản bạn đang sửa.
            </p>
            <div className="button-row">
              <Button variant="outline" onClick={handleReload}>
                Tải bản trên máy chủ
              </Button>
              <Button variant="ghost" onClick={() => handleSave(conflictRevision)}>
                Ghi đè bằng bản này
              </Button>
            </div>
          </div>
        )}
        {problems.length > 0 && (
          <section className="notice-panel" aria-labelledby="publish-problems">
            <h2 id="publish-problems">Cần sửa trước khi xuất bản</h2>
            <ul>
              {problems.map((problem, index) => (
                <li key={index}>
                  <strong>{SECTION_LABELS[problem.section]}:</strong>{" "}
                  {problem.section === "slides" && problem.itemId ? (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleProblemClick(problem)}
                    >
                      {problem.message}
                    </button>
                  ) : (
                    problem.message
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {missingAudio > 0 && (
          <p className="small muted">
            {missingAudio} từ/câu ví dụ chưa có audio; học viên sẽ nghe giọng thiết bị cho tới khi
            chạy script sinh audio.
          </p>
        )}
        {missingListeningAudio > 0 && (
          <p className="small muted">
            {missingListeningAudio} câu nghe chưa có audio nên chưa xuất bản được. Lưu nháp rồi chạy{" "}
            <code>{AUDIO_COMMAND}</code>, sau đó tải lại trang.
          </p>
        )}
        <details className="editor-section" open>
          <summary>Thông tin bài</summary>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="lesson-title">Tiêu đề tiếng Việt</label>
              <input
                id="lesson-title"
                maxLength={160}
                value={draft.metadata.title}
                onChange={(event) =>
                  dispatch({ type: "metadata", patch: { title: event.target.value } })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="lesson-title-ja">Tiêu đề tiếng Nhật</label>
              <input
                id="lesson-title-ja"
                lang="ja"
                maxLength={160}
                value={draft.metadata.titleJa}
                onChange={(event) =>
                  dispatch({ type: "metadata", patch: { titleJa: event.target.value } })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="lesson-order">Thứ tự trong khóa</label>
              <input
                id="lesson-order"
                type="number"
                min={1}
                max={999}
                value={draft.metadata.order}
                onChange={(event) =>
                  dispatch({ type: "metadata", patch: { order: Number(event.target.value) || 0 } })
                }
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="lesson-summary">Tóm tắt</label>
            <textarea
              id="lesson-summary"
              maxLength={500}
              value={draft.metadata.summary}
              onChange={(event) =>
                dispatch({ type: "metadata", patch: { summary: event.target.value } })
              }
            />
          </div>
        </details>
        <details className="editor-section">
          <summary>Từ vựng ({draft.content.vocab.length})</summary>
          <VocabularyFields content={draft.content} dispatch={dispatch} createId={createId} />
          <p className="small">
            <Link href={`/teach/import-csv?lesson=${lessonId}`}>Nhập nhiều từ từ CSV/Excel</Link>{" "}
            (lưu nháp trước khi nhập).
          </p>
        </details>
        <details className="editor-section">
          <summary>Ngữ pháp ({draft.content.grammar.length})</summary>
          <GrammarFields content={draft.content} dispatch={dispatch} createId={createId} />
        </details>
        <details className="editor-section">
          <summary>Câu luyện ({draft.content.questions.length})</summary>
          <QuestionFields
            content={draft.content}
            dispatch={dispatch}
            createId={() => createId("question")}
          />
        </details>
        <section className="editor-section" aria-labelledby="slides-title">
          <h2 id="slides-title">Slide ({draft.content.slides.length})</h2>
          <SlideList
            content={draft.content}
            selectedSlideId={state.selectedSlideId}
            onSelect={(id) => dispatch({ type: "selectSlide", id })}
            onMove={(from, to) => dispatch({ type: "moveSlide", from, to })}
          />
          <div className="button-row add-slide">
            <label htmlFor="new-slide-type" className="small">
              Loại slide mới
            </label>
            <select
              id="new-slide-type"
              value={newSlideType}
              onChange={(event) => {
                const type = SLIDE_TYPES.find((item) => item === event.target.value);
                if (type) {
                  setNewSlideType(type);
                }
              }}
            >
              {SLIDE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SLIDE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={() =>
                dispatch({ type: "addSlide", slideType: newSlideType, id: createId("slide") })
              }
            >
              Thêm slide
            </Button>
          </div>
          {selectedSlide && (
            <SlideFields
              key={selectedSlide.id}
              slide={selectedSlide}
              position={selectedIndex + 1}
              content={draft.content}
              onChange={(slide) => dispatch({ type: "updateSlide", slide })}
              onRemove={() => dispatch({ type: "removeSlide", id: selectedSlide.id })}
            />
          )}
        </section>
      </div>
      <aside className="editor-preview" aria-label="Xem trước">
        <LessonVisibilityForm lessonId={lessonId} visibility={visibility} />
        <SlidePreview lessonId={lessonId} draft={draft} slideId={state.selectedSlideId} />
        <p className="small muted">
          {versionCount ? `${versionCount} phiên bản đã xuất bản.` : "Chưa xuất bản phiên bản nào."}{" "}
          {publishedVersionId && (
            <Link
              href={`/lessons/${lessonId}?version=${publishedVersionId}`}
              className={buttonVariants({ variant: "ghost" })}
            >
              Mở bản đang xuất bản
            </Link>
          )}
        </p>
      </aside>
    </div>
  );
}

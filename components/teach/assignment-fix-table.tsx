"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { fixQuestionAction } from "@/app/actions/assignment-fixes";
import { PassageDetails } from "@/components/classroom/passage-details";
import { FuriganaText } from "@/components/lessons/japanese-text";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { QuestionFixForm, toFixDrafts } from "@/components/teach/question-fix-form";
import { Button } from "@/components/ui/button";
import { formatStudyDateTime } from "@/lib/study-days";

import type { FixQuestionState } from "@/app/actions/assignment-fixes";
import type { FixDrafts } from "@/components/teach/question-fix-form";
import type { DisplayFix } from "@/lib/assignment-fix";

export interface FixRow {
  questionId: string;
  position: number;
  hash: string;
  typeLabel: string;
  /**
   * Where readings may go: everywhere; only after answering (a kanji reading question, whose
   * prompt and options would otherwise show the answer); or nowhere (not Japanese).
   */
  furigana: "all" | "after-answer" | "none";
  lang: string;
  answerLang: string;
  answerText: string;
  correctOptions: number[];
  current: DisplayFix;
  edits: { at: string; beforePrompt: string; afterPrompt: string }[];
  /** Kanji words in the prompt and options that have no reading yet. */
  unreadCount: number;
}

type Filter = "all" | "unread" | "edited";

interface CurrentQuestionProps {
  row: FixRow;
}

/** The "Trước" side of a fix: the question as learners see it now. */
function CurrentQuestion({ row }: CurrentQuestionProps) {
  const { current } = row;
  return (
    <>
      <PassageDetails passage={current.passage} lang={row.lang} />
      <p lang={row.lang} className="question-prompt">
        <FuriganaText text={current.prompt} />
      </p>
      {current.options && (
        <ol className="fix-options">
          {current.options.map((option, index) => (
            <li key={index} lang={row.lang}>
              <FuriganaText text={option} />
              {row.correctOptions.includes(index) && (
                <span className="fix-correct"> (đáp án đúng)</span>
              )}
            </li>
          ))}
        </ol>
      )}
      <p>
        Đáp án:{" "}
        <strong lang={row.answerLang}>
          <FuriganaText text={row.answerText} />
        </strong>
      </p>
      <p className="muted">
        <FuriganaText text={current.explain} />
      </p>
    </>
  );
}

interface FixRowItemsProps {
  assignmentId: string;
  row: FixRow;
}

function FixRowItems({ assignmentId, row }: FixRowItemsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedHash, setOpenedHash] = useState(row.hash);
  const [drafts, setDrafts] = useState<FixDrafts>(() => toFixDrafts(row.current));
  const [shouldFocusButton, setShouldFocusButton] = useState(false);
  // The version a save started from; once the page brings a newer one, the editor closes.
  const [savedFrom, setSavedFrom] = useState<string | null>(null);
  const [state, action, isPending] = useActionState(
    async (previous: FixQuestionState, formData: FormData) => {
      const next = await fixQuestionAction(previous, formData);
      if (next.isSaved) {
        setSavedFrom(String(formData.get("hash")));
      }
      return next;
    },
    {},
  );
  const closedBySave = savedFrom !== null && row.hash !== savedFrom;
  const isEditorOpen = isOpen && !closedBySave;
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isEditorOpen && (closedBySave || shouldFocusButton)) {
      button.current?.focus();
    }
  }, [isEditorOpen, closedBySave, shouldFocusButton]);
  const editorId = `fix-editor-${row.questionId}`;
  const feedback = <ActionFeedback state={{ error: state.error, notice: state.notice }} />;

  function open() {
    // Start from the saved text, which may have changed since this row was last opened.
    setDrafts(toFixDrafts(row.current));
    setOpenedHash(row.hash);
    setSavedFrom(null);
    setShouldFocusButton(false);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setShouldFocusButton(true);
  }

  const lastEdit = row.edits.at(-1);
  return (
    <>
      <tr className="fix-row" data-open={isEditorOpen} id={`question-${row.questionId}`}>
        <th scope="row" className="fix-cell-number">
          {row.position}
        </th>
        <td className="fix-cell-question">
          <span className="fix-type">
            <span className="fix-mobile-label">Câu {row.position} · </span>
            {row.typeLabel}
            {row.furigana === "after-answer" ? " · hỏi cách đọc" : ""}
          </span>
          <span lang={row.lang} className="fix-prompt">
            <FuriganaText text={row.current.prompt} />
          </span>
        </td>
        <td className="fix-cell-answer">
          <span className="fix-mobile-label">Đáp án: </span>
          <span lang={row.answerLang}>
            <FuriganaText text={row.answerText} />
          </span>
        </td>
        <td className="fix-cell-action">
          <div className="fix-actions">
            {lastEdit && <span className="status-badge status-correct">Đã sửa</span>}
            {row.unreadCount > 0 && (
              <span className="status-badge status-neutral">
                {row.unreadCount} chữ Hán chưa có cách đọc
              </span>
            )}
            <Button
              ref={button}
              variant={isEditorOpen ? "ghost" : "outline"}
              aria-expanded={isEditorOpen}
              aria-controls={editorId}
              aria-label={`${isEditorOpen ? "Đóng" : "Sửa"} câu ${row.position}`}
              onClick={isEditorOpen ? close : open}
            >
              {isEditorOpen ? "Đóng" : "Sửa"}
            </Button>
          </div>
          {!isEditorOpen && feedback}
        </td>
      </tr>
      {isEditorOpen && (
        <tr className="fix-editor-row" id={editorId}>
          <td colSpan={4}>
            <div className="fix-compare">
              <section className="fix-before" aria-label={`Câu ${row.position}, trước khi sửa`}>
                <h2 className="fix-compare-title">
                  Trước<span className="visually-hidden">, câu {row.position}</span>
                </h2>
                <CurrentQuestion row={row} />
                {lastEdit && (
                  <details className="fix-history">
                    <summary>
                      Đã sửa {row.edits.length} lần, gần nhất {formatStudyDateTime(lastEdit.at)}
                    </summary>
                    <ol>
                      {row.edits.map((edit, index) => (
                        <li key={index}>
                          {formatStudyDateTime(edit.at)}: đề trước{" "}
                          <span lang={row.lang}>
                            «<FuriganaText text={edit.beforePrompt} />»
                          </span>
                          , sau{" "}
                          <span lang={row.lang}>
                            «<FuriganaText text={edit.afterPrompt} />»
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </section>
              <section className="fix-after" aria-label={`Câu ${row.position}, sau khi sửa`}>
                <h2 className="fix-compare-title">
                  Sau<span className="visually-hidden">, câu {row.position}</span>
                </h2>
                <QuestionFixForm
                  assignmentId={assignmentId}
                  row={row}
                  openedHash={openedHash}
                  drafts={drafts}
                  setDrafts={setDrafts}
                  action={action}
                  isPending={isPending}
                  feedback={feedback}
                  onCancel={close}
                />
              </section>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const FILTER_LABELS: Record<Filter, string> = {
  all: "Tất cả",
  unread: "Có chữ Hán chưa có cách đọc",
  edited: "Đã sửa",
};

interface AssignmentFixTableProps {
  assignmentId: string;
  rows: FixRow[];
}

/** Every question of a given assignment in one compact table; a row opens Trước | Sau below it. */
export function AssignmentFixTable({ assignmentId, rows }: AssignmentFixTableProps) {
  const [filter, setFilter] = useState<Filter>("all");
  // The rows a filter matched when it was chosen: a question fixed meanwhile stays in view, so
  // the teacher sees the result instead of the row vanishing.
  const [shown, setShown] = useState<readonly string[] | null>(null);
  const matches: Record<Filter, (row: FixRow) => boolean> = {
    all: () => true,
    unread: (row) => row.unreadCount > 0,
    edited: (row) => row.edits.length > 0,
  };
  const visible = shown ? rows.filter((row) => shown.includes(row.questionId)) : rows;

  function choose(next: Filter) {
    setFilter(next);
    setShown(next === "all" ? null : rows.filter(matches[next]).map((row) => row.questionId));
  }
  return (
    <>
      <div className="filter-pills" role="group" aria-label="Lọc câu">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => choose(key)}>
            {FILTER_LABELS[key]}{" "}
            <span className="filter-pill-count">{rows.filter(matches[key]).length}</span>
          </button>
        ))}
      </div>
      {visible.length ? (
        <table className="fix-table">
          <caption className="visually-hidden">
            Câu hỏi của bài giao; bấm Sửa để mở bản trước và bản sửa
          </caption>
          <thead>
            <tr>
              <th scope="col">Câu</th>
              <th scope="col">Đề bài</th>
              <th scope="col">Đáp án</th>
              <th scope="col">
                <span className="visually-hidden">Sửa</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <FixRowItems key={row.questionId} assignmentId={assignmentId} row={row} />
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Không có câu nào trong nhóm này.</p>
      )}
    </>
  );
}

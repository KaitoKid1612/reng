"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { fixQuestionAction } from "@/app/actions/assignment-fixes";
import { PassageDetails } from "@/components/classroom/passage-details";
import { FuriganaText } from "@/components/lessons/japanese-text";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { hasInvalidReading, ReadingFields } from "@/components/teach/reading-fields";
import { Button } from "@/components/ui/button";
import { carryReadings, fromFuriganaDraft, toFuriganaDraft } from "@/lib/furigana-units";
import { formatStudyDateTime } from "@/lib/study-days";

import type { FixQuestionState } from "@/app/actions/assignment-fixes";
import type { DisplayFix } from "@/lib/assignment-fix";
import type { FuriganaDraft } from "@/lib/furigana-units";
import type { FormEvent } from "react";

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

interface Drafts {
  prompt: FuriganaDraft;
  explain: FuriganaDraft;
  passage: FuriganaDraft | null;
  transcript: FuriganaDraft | null;
  options: FuriganaDraft[] | null;
  tokens: FuriganaDraft[] | null;
  unmatched: number;
}

function toDrafts(fix: DisplayFix): Drafts {
  const parts = [
    fix.prompt,
    fix.explain,
    fix.passage,
    fix.transcript,
    ...(fix.options ?? []),
    ...(fix.tokens ?? []),
  ];
  const draft = (value: string) => {
    const { text, readings } = toFuriganaDraft(value);
    return { text, readings };
  };
  return {
    prompt: draft(fix.prompt),
    explain: draft(fix.explain),
    passage: fix.passage === undefined ? null : draft(fix.passage),
    transcript: fix.transcript === undefined ? null : draft(fix.transcript),
    options: fix.options ? fix.options.map(draft) : null,
    tokens: fix.tokens ? fix.tokens.map(draft) : null,
    unmatched: parts.reduce(
      (total, part) => total + (part === undefined ? 0 : toFuriganaDraft(part).unmatched),
      0,
    ),
  };
}

function allReadings(drafts: Drafts) {
  return [
    drafts.prompt,
    drafts.explain,
    drafts.passage,
    drafts.transcript,
    ...(drafts.options ?? []),
    ...(drafts.tokens ?? []),
  ].flatMap((draft) => draft?.readings ?? []);
}

function CurrentQuestion({ row }: { row: FixRow }) {
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

interface EditorProps {
  assignmentId: string;
  row: FixRow;
  openedHash: string;
  drafts: Drafts;
  setDrafts: (update: (current: Drafts) => Drafts) => void;
  action: (formData: FormData) => void;
  isPending: boolean;
  feedback: React.ReactNode;
  onCancel: () => void;
}

function Editor({
  assignmentId,
  row,
  openedHash,
  drafts,
  setDrafts,
  action,
  isPending,
  feedback,
  onCancel,
}: EditorProps) {
  const prompt = useRef<HTMLTextAreaElement>(null);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    prompt.current?.focus();
  }, []);
  const id = `fix-${row.questionId}`;
  const built = {
    prompt: fromFuriganaDraft(drafts.prompt),
    explain: fromFuriganaDraft(drafts.explain),
    options: drafts.options?.map(fromFuriganaDraft),
  };

  function editText(key: "prompt" | "explain", text: string) {
    setDrafts((current) => ({
      ...current,
      [key]: { text, readings: carryReadings(current[key], text) },
    }));
  }

  function setReadings(key: "prompt" | "explain" | "passage" | "transcript", readings: string[]) {
    setDrafts((current) => {
      const draft = current[key];
      return draft ? { ...current, [key]: { ...draft, readings } } : current;
    });
  }

  function setListReadings(key: "options" | "tokens", index: number, readings: string[]) {
    setDrafts((current) => ({
      ...current,
      [key]: current[key]?.map((draft, item) => (item === index ? { ...draft, readings } : draft)),
    }));
  }

  // Readings must be kana and the text cannot carry the furigana braces itself.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (hasInvalidReading(allReadings(drafts))) {
      event.preventDefault();
      setProblem("Cách đọc chỉ gõ hiragana hoặc katakana; gõ romaji sẽ tự đổi sang hiragana.");
      return;
    }
    if (/[{}]/.test(`${drafts.prompt.text}${drafts.explain.text}`)) {
      event.preventDefault();
      setProblem("Đề bài và giải thích không dùng dấu ngoặc nhọn { }.");
      return;
    }
    setProblem("");
  }

  const shownReadings = row.furigana === "all";
  const laterReadings = row.furigana !== "none";
  const kanjiNote =
    row.furigana === "after-answer" ? (
      <p className="small muted fix-note">
        Câu hỏi cách đọc chữ Hán: không thêm cách đọc ở đề và lựa chọn, vì học viên sẽ thấy đáp án.
      </p>
    ) : null;
  const optionReadings =
    shownReadings && drafts.options
      ? drafts.options.flatMap((draft, index) =>
          /[\p{Script=Han}]/u.test(draft.text) ? [{ draft, index }] : [],
        )
      : [];
  const tokenReadings =
    shownReadings && drafts.tokens
      ? drafts.tokens.flatMap((draft, index) =>
          /[\p{Script=Han}]/u.test(draft.text) ? [{ draft, index }] : [],
        )
      : [];

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className="question-fix-form"
      aria-label={`Sửa câu ${row.position}`}
    >
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="questionId" value={row.questionId} />
      <input type="hidden" name="hash" value={openedHash} />
      <input type="hidden" name="prompt" value={built.prompt} />
      <input type="hidden" name="explain" value={built.explain} />
      {drafts.passage && (
        <input type="hidden" name="passage" value={fromFuriganaDraft(drafts.passage)} />
      )}
      {drafts.transcript && (
        <input type="hidden" name="transcript" value={fromFuriganaDraft(drafts.transcript)} />
      )}
      {built.options?.map((option, index) => (
        <input key={index} type="hidden" name="option" value={option} />
      ))}
      {drafts.tokens?.map((token, index) => (
        <input key={index} type="hidden" name="token" value={fromFuriganaDraft(token)} />
      ))}

      {drafts.unmatched > 0 && (
        <p className="small notice-panel" role="note">
          {drafts.unmatched} chỗ furigana cũ chỉ phủ một phần cụm chữ Hán nên không hiện trong ô
          cách đọc. Lưu lại sẽ bỏ các chỗ đó: hãy gõ lại cách đọc cho cả cụm trước khi lưu.
        </p>
      )}
      <div className="field">
        <label htmlFor={`${id}-prompt`}>Đề bài</label>
        <textarea
          ref={prompt}
          id={`${id}-prompt`}
          rows={3}
          maxLength={400}
          required
          lang={row.lang}
          value={drafts.prompt.text}
          onChange={(event) => editText("prompt", event.target.value)}
        />
      </div>
      {kanjiNote}
      {shownReadings && (
        <ReadingFields
          idPrefix={`${id}-prompt-reading`}
          caption="Cách đọc chữ Hán trong đề (để trống chữ nào không cần):"
          text={drafts.prompt.text}
          readings={drafts.prompt.readings}
          lang={row.lang}
          onChange={(readings) => setReadings("prompt", readings)}
        />
      )}

      {optionReadings.length > 0 && (
        <fieldset className="fix-reading-group">
          <legend>Cách đọc chữ Hán trong lựa chọn</legend>
          {optionReadings.map(({ draft, index }) => (
            <div key={index} className="fix-reading-line">
              <span className="small muted">Lựa chọn {index + 1}</span>
              <ReadingFields
                idPrefix={`${id}-option-${index}`}
                text={draft.text}
                readings={draft.readings}
                lang={row.lang}
                onChange={(readings) => setListReadings("options", index, readings)}
              />
            </div>
          ))}
        </fieldset>
      )}
      {tokenReadings.length > 0 && (
        <fieldset className="fix-reading-group">
          <legend>Cách đọc chữ Hán trong mảnh câu</legend>
          {tokenReadings.map(({ draft, index }) => (
            <div key={index} className="fix-reading-line">
              <span className="small muted">Mảnh {index + 1}</span>
              <ReadingFields
                idPrefix={`${id}-token-${index}`}
                text={draft.text}
                readings={draft.readings}
                lang={row.lang}
                onChange={(readings) => setListReadings("tokens", index, readings)}
              />
            </div>
          ))}
        </fieldset>
      )}
      {shownReadings && drafts.passage && /[\p{Script=Han}]/u.test(drafts.passage.text) && (
        <details className="fix-reading-group">
          <summary>Cách đọc chữ Hán trong đoạn văn</summary>
          <ReadingFields
            idPrefix={`${id}-passage`}
            text={drafts.passage.text}
            readings={drafts.passage.readings}
            lang={row.lang}
            onChange={(readings) => setReadings("passage", readings)}
          />
        </details>
      )}
      {laterReadings && drafts.transcript && /[\p{Script=Han}]/u.test(drafts.transcript.text) && (
        <details className="fix-reading-group">
          <summary>Cách đọc chữ Hán trong lời nghe</summary>
          <ReadingFields
            idPrefix={`${id}-transcript`}
            text={drafts.transcript.text}
            readings={drafts.transcript.readings}
            lang={row.lang}
            onChange={(readings) => setReadings("transcript", readings)}
          />
        </details>
      )}

      <div className="field">
        <label htmlFor={`${id}-explain`}>Giải thích</label>
        <textarea
          id={`${id}-explain`}
          rows={3}
          maxLength={800}
          required
          value={drafts.explain.text}
          onChange={(event) => editText("explain", event.target.value)}
        />
      </div>
      {laterReadings && /[\p{Script=Han}]/u.test(drafts.explain.text) && (
        <details className="fix-reading-group">
          <summary>Cách đọc chữ Hán trong giải thích</summary>
          <ReadingFields
            idPrefix={`${id}-explain-reading`}
            text={drafts.explain.text}
            readings={drafts.explain.readings}
            lang={row.lang}
            onChange={(readings) => setReadings("explain", readings)}
          />
        </details>
      )}

      <div className="question-fix-preview">
        <p className="small muted">Học viên sẽ thấy:</p>
        <p lang={row.lang} className="question-prompt">
          <FuriganaText text={built.prompt} />
        </p>
        {built.options && (
          <ol>
            {built.options.map((option, index) => (
              <li key={index} lang={row.lang}>
                <FuriganaText text={option} />
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="small muted">
        Đáp án, lựa chọn và thứ tự câu giữ nguyên.
        {laterReadings
          ? " Gõ romaji trong ô cách đọc sẽ tự đổi sang hiragana; để trống nếu không cần furigana."
          : ""}
      </p>
      {problem && (
        <p role="alert" className="error-text">
          {problem}
        </p>
      )}
      <div className="button-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu sửa"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Hủy
        </Button>
      </div>
      {feedback}
    </form>
  );
}

function FixRowItems({ assignmentId, row }: { assignmentId: string; row: FixRow }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openedHash, setOpenedHash] = useState(row.hash);
  const [drafts, setDrafts] = useState<Drafts>(() => toDrafts(row.current));
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
    setDrafts(toDrafts(row.current));
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
                <Editor
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

/** Every question of a given assignment in one compact table; a row opens Trước | Sau below it. */
export function AssignmentFixTable({
  assignmentId,
  rows,
}: {
  assignmentId: string;
  rows: FixRow[];
}) {
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

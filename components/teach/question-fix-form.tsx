"use client";

import { useEffect, useRef, useState } from "react";

import { FuriganaText } from "@/components/lessons/japanese-text";
import { hasInvalidReading, ReadingFields } from "@/components/teach/reading-fields";
import { Button } from "@/components/ui/button";
import { carryReadings, fromFuriganaDraft, toFuriganaDraft } from "@/lib/furigana-units";
import { containsKanji } from "@/lib/japanese-text";

import type { FixRow } from "@/components/teach/assignment-fix-table";
import type { DisplayFix } from "@/lib/assignment-fix";
import type { FuriganaDraft } from "@/lib/furigana-units";
import type { FormEvent, ReactNode } from "react";

/** The texts of one question being fixed, each split into its text and kanji readings. */
export interface FixDrafts {
  prompt: FuriganaDraft;
  explain: FuriganaDraft;
  passage: FuriganaDraft | null;
  transcript: FuriganaDraft | null;
  options: FuriganaDraft[] | null;
  tokens: FuriganaDraft[] | null;
  unmatched: number;
}

export function toFixDrafts(fix: DisplayFix): FixDrafts {
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

function allReadings(drafts: FixDrafts) {
  return [
    drafts.prompt,
    drafts.explain,
    drafts.passage,
    drafts.transcript,
    ...(drafts.options ?? []),
    ...(drafts.tokens ?? []),
  ].flatMap((draft) => draft?.readings ?? []);
}

// The options or order pieces that contain kanji, each with its place in the list.
function withKanji(drafts: FuriganaDraft[] | null) {
  return (drafts ?? []).flatMap((draft, index) =>
    containsKanji(draft.text) ? [{ draft, index }] : [],
  );
}

interface QuestionFixFormProps {
  assignmentId: string;
  row: FixRow;
  openedHash: string;
  drafts: FixDrafts;
  setDrafts: (update: (current: FixDrafts) => FixDrafts) => void;
  action: (formData: FormData) => void;
  isPending: boolean;
  feedback: ReactNode;
  onCancel: () => void;
}

/** The "Sau" side of a fix: the editable prompt, explanation and readings, with a preview. */
export function QuestionFixForm({
  assignmentId,
  row,
  openedHash,
  drafts,
  setDrafts,
  action,
  isPending,
  feedback,
  onCancel,
}: QuestionFixFormProps) {
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
  const optionReadings = shownReadings ? withKanji(drafts.options) : [];
  const tokenReadings = shownReadings ? withKanji(drafts.tokens) : [];

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
      {shownReadings && drafts.passage && containsKanji(drafts.passage.text) && (
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
      {laterReadings && drafts.transcript && containsKanji(drafts.transcript.text) && (
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
      {laterReadings && containsKanji(drafts.explain.text) && (
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

"use client";

import { useState } from "react";

import { ExampleFields } from "@/components/teaching/example-fields";
import { Button } from "@/components/ui/button";
import { parseVocabularyTable, TABLE_COLUMNS } from "@/lib/teaching-table";

import type { TeachingDraft, TeachingVocab } from "@/lib/teaching-content";
import type { TeachingDispatch } from "@/lib/teaching-draft";
import type { TableParseResult, TableRow } from "@/lib/teaching-table";

interface VocabularyPasteProps {
  existing: readonly TeachingVocab[];
  languageTag: TeachingDraft["content"]["context"]["languageTag"];
  onAdd: (rows: readonly TableRow[]) => void;
}

const ROW_TONES: Record<TableRow["status"], string> = {
  valid: "status-correct",
  invalid: "status-wrong",
  duplicate: "status-attention",
};

function describeRow(row: TableRow) {
  if (row.status !== "valid") {
    return row.problems.join(" ");
  }
  return row.warnings.length ? `Thêm được. ${row.warnings.join(" ")}` : "Thêm được";
}

// Pasted rows are only previewed; nothing reaches the draft until the teacher confirms.
function VocabularyPaste({ existing, languageTag, onAdd }: VocabularyPasteProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<TableParseResult | null>(null);
  const validCount = result?.rows.filter((row) => row.status === "valid").length ?? 0;

  function handleAdd() {
    if (!result) {
      return;
    }
    onAdd(result.rows);
    setText("");
    setResult(null);
  }

  return (
    <details className="teaching-paste">
      <summary>Dán bảng từ Excel hoặc Google Sheets</summary>
      <p className="small muted">
        Thứ tự cột: {TABLE_COLUMNS.join(", ")}. Ba cột ví dụ có thể để trống; dòng tiêu đề được bỏ
        qua.
      </p>
      <div className="field">
        <label htmlFor="vocabulary-paste">Nội dung dán</label>
        <textarea
          id="vocabulary-paste"
          value={text}
          rows={5}
          onChange={(event) => {
            setText(event.target.value);
            setResult(null);
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={!text.trim()}
        onClick={() => setResult(parseVocabularyTable(text, existing))}
      >
        Xem trước bảng
      </Button>
      {result?.error && (
        <p role="alert" className="error-text">
          {result.error}
        </p>
      )}
      {result && !result.error && (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Dòng</th>
                  <th scope="col">Chữ Hán</th>
                  <th scope="col">Pinyin</th>
                  <th scope="col">Nghĩa</th>
                  <th scope="col">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td lang={languageTag}>{row.text}</td>
                    <td>{row.reading}</td>
                    <td>{row.meaning}</td>
                    <td>
                      <span className={`status-badge ${ROW_TONES[row.status]}`}>
                        {describeRow(row)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" disabled={!validCount} onClick={handleAdd}>
            Thêm {validCount} từ hợp lệ
          </Button>
        </>
      )}
    </details>
  );
}

interface VocabularyStepProps {
  draft: TeachingDraft;
  dispatch: TeachingDispatch;
}

export function VocabularyStep({ draft, dispatch }: VocabularyStepProps) {
  const { vocab, context } = draft.content;
  return (
    <section className="editor-section" aria-labelledby="vocabulary-step-title">
      <h2 id="vocabulary-step-title">Từ vựng</h2>
      <p className="small muted">
        Mỗi từ gồm chữ Hán, pinyin có dấu thanh và nghĩa tiếng Việt. Câu ví dụ được dựng thành slide
        riêng.
      </p>
      <VocabularyPaste
        existing={vocab}
        languageTag={context.languageTag}
        onAdd={(rows) => dispatch({ type: "addVocabRows", rows })}
      />
      {!vocab.length && <p className="muted">Chưa có từ nào. Dán bảng hoặc thêm từng từ.</p>}
      <ol className="teaching-items">
        {vocab.map((item, index) => {
          const label = `từ ${index + 1}`;
          return (
            <li key={item.id} className="teaching-item">
              <div className="teaching-word-grid">
                <input
                  aria-label={`Chữ Hán ${label}`}
                  lang={context.languageTag}
                  value={item.text}
                  maxLength={100}
                  placeholder="Chữ Hán"
                  onChange={(event) =>
                    dispatch({
                      type: "updateVocab",
                      id: item.id,
                      patch: { text: event.target.value },
                    })
                  }
                />
                <input
                  aria-label={`Pinyin ${label}`}
                  value={item.reading}
                  maxLength={200}
                  placeholder="Pinyin"
                  onChange={(event) =>
                    dispatch({
                      type: "updateVocab",
                      id: item.id,
                      patch: { reading: event.target.value },
                    })
                  }
                />
                <input
                  aria-label={`Nghĩa ${label}`}
                  value={item.meaning}
                  maxLength={300}
                  placeholder="Nghĩa tiếng Việt"
                  onChange={(event) =>
                    dispatch({
                      type: "updateVocab",
                      id: item.id,
                      patch: { meaning: event.target.value },
                    })
                  }
                />
              </div>
              {item.examples.map((example, exampleIndex) => (
                <ExampleFields
                  key={exampleIndex}
                  label={`Ví dụ ${exampleIndex + 1} của ${label}`}
                  example={example}
                  languageTag={context.languageTag}
                  onChange={(patch) =>
                    dispatch({
                      type: "updateExample",
                      collection: "vocab",
                      id: item.id,
                      index: exampleIndex,
                      patch,
                    })
                  }
                  onRemove={() =>
                    dispatch({
                      type: "removeExample",
                      collection: "vocab",
                      id: item.id,
                      index: exampleIndex,
                    })
                  }
                />
              ))}
              <div className="button-row">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={item.examples.length >= 10}
                  onClick={() => dispatch({ type: "addExample", collection: "vocab", id: item.id })}
                >
                  Thêm câu ví dụ
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Đưa ${label} lên`}
                  disabled={index === 0}
                  onClick={() =>
                    dispatch({ type: "moveItem", collection: "vocab", id: item.id, offset: -1 })
                  }
                >
                  Lên
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Đưa ${label} xuống`}
                  disabled={index === vocab.length - 1}
                  onClick={() =>
                    dispatch({ type: "moveItem", collection: "vocab", id: item.id, offset: 1 })
                  }
                >
                  Xuống
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Xóa ${label}`}
                  onClick={() => dispatch({ type: "removeItem", collection: "vocab", id: item.id })}
                >
                  Xóa
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        disabled={vocab.length >= 100}
        onClick={() => dispatch({ type: "addVocab" })}
      >
        Thêm từ
      </Button>
    </section>
  );
}

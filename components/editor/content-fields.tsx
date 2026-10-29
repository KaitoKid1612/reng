"use client";

import { FURIGANA_HINT } from "@/components/editor/slide-labels";
import { Button } from "@/components/ui/button";
import { findReferencingSlides } from "@/lib/lesson-draft";

import type { DraftContent } from "@/lib/lesson-draft";
import type { EditorAction } from "@/lib/lesson-editor";

interface ContentFieldsProps {
  content: DraftContent;
  dispatch: (action: EditorAction) => void;
  createId: (kind: "vocab" | "grammar") => string;
}

function describeUsage(content: DraftContent, itemId: string) {
  const slides = findReferencingSlides(content, itemId);
  if (!slides.length) {
    return undefined;
  }
  const positions = slides.map((slide) => content.slides.indexOf(slide) + 1);
  return `Đang dùng ở slide ${positions.join(", ")}; đổi slide trước khi xóa.`;
}

export function VocabularyFields({ content, dispatch, createId }: ContentFieldsProps) {
  return (
    <div>
      {content.vocab.map((item, index) => {
        const usage = describeUsage(content, item.id);
        const label = `từ ${index + 1}`;
        return (
          <div key={item.id} className="vocab-row">
            <input
              aria-label={`Cách đọc kana ${label}`}
              placeholder="いきます"
              lang="ja"
              maxLength={100}
              value={item.jp}
              onChange={(event) =>
                dispatch({ type: "updateVocab", id: item.id, patch: { jp: event.target.value } })
              }
            />
            <input
              aria-label={`Kanji ${label}`}
              placeholder="行きます"
              lang="ja"
              maxLength={100}
              value={item.kanji ?? ""}
              onChange={(event) =>
                dispatch({ type: "updateVocab", id: item.id, patch: { kanji: event.target.value } })
              }
            />
            <input
              aria-label={`Romaji ${label}`}
              placeholder="ikimasu"
              maxLength={100}
              value={item.romaji}
              onChange={(event) =>
                dispatch({
                  type: "updateVocab",
                  id: item.id,
                  patch: { romaji: event.target.value },
                })
              }
            />
            <input
              aria-label={`Nghĩa ${label}`}
              placeholder="đi"
              maxLength={200}
              value={item.vi}
              onChange={(event) =>
                dispatch({ type: "updateVocab", id: item.id, patch: { vi: event.target.value } })
              }
            />
            <span className="small muted">{item.audio ? "Có audio" : "Chưa có audio"}</span>
            <Button
              variant="ghost"
              aria-label={`Xóa ${label}`}
              disabled={Boolean(usage)}
              title={usage}
              onClick={() => dispatch({ type: "removeVocab", id: item.id })}
            >
              Xóa
            </Button>
          </div>
        );
      })}
      <Button
        variant="outline"
        onClick={() => dispatch({ type: "addVocab", id: createId("vocab") })}
      >
        Thêm từ
      </Button>
    </div>
  );
}

export function GrammarFields({ content, dispatch, createId }: ContentFieldsProps) {
  return (
    <div>
      {content.grammar.map((item, index) => {
        const usage = describeUsage(content, item.id);
        const id = `grammar-${item.id}`;
        return (
          <fieldset key={item.id} className="question-card">
            <legend className="question-meta">Mẫu câu {index + 1}</legend>
            <div className="form-grid">
              <div className="field">
                <label htmlFor={`${id}-pattern`}>Mẫu</label>
                <input
                  id={`${id}-pattern`}
                  lang="ja"
                  maxLength={200}
                  value={item.pattern}
                  onChange={(event) =>
                    dispatch({
                      type: "updateGrammar",
                      id: item.id,
                      patch: { pattern: event.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor={`${id}-vi`}>Nghĩa</label>
                <input
                  id={`${id}-vi`}
                  maxLength={300}
                  value={item.vi}
                  onChange={(event) =>
                    dispatch({
                      type: "updateGrammar",
                      id: item.id,
                      patch: { vi: event.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`${id}-explain`}>Giải thích</label>
              <textarea
                id={`${id}-explain`}
                maxLength={2000}
                value={item.explain}
                onChange={(event) =>
                  dispatch({
                    type: "updateGrammar",
                    id: item.id,
                    patch: { explain: event.target.value },
                  })
                }
              />
            </div>
            <div className="field">
              <label htmlFor={`${id}-mistake`}>Người Việt hay nhầm (tùy chọn)</label>
              <textarea
                id={`${id}-mistake`}
                maxLength={1000}
                value={item.viMistake ?? ""}
                onChange={(event) =>
                  dispatch({
                    type: "updateGrammar",
                    id: item.id,
                    patch: { viMistake: event.target.value },
                  })
                }
              />
            </div>
            <p className="small muted">Câu ví dụ. {FURIGANA_HINT}</p>
            {item.examples.map((example, exampleIndex) => (
              <div key={exampleIndex} className="example-row">
                <input
                  aria-label={`Câu ví dụ ${exampleIndex + 1} tiếng Nhật`}
                  lang="ja"
                  maxLength={300}
                  value={example.jp}
                  onChange={(event) =>
                    dispatch({
                      type: "updateExample",
                      grammarId: item.id,
                      index: exampleIndex,
                      patch: { jp: event.target.value },
                    })
                  }
                />
                <input
                  aria-label={`Câu ví dụ ${exampleIndex + 1} nghĩa`}
                  maxLength={300}
                  value={example.vi}
                  onChange={(event) =>
                    dispatch({
                      type: "updateExample",
                      grammarId: item.id,
                      index: exampleIndex,
                      patch: { vi: event.target.value },
                    })
                  }
                />
                <Button
                  variant="ghost"
                  aria-label={`Xóa ví dụ ${exampleIndex + 1}`}
                  onClick={() =>
                    dispatch({ type: "removeExample", grammarId: item.id, index: exampleIndex })
                  }
                >
                  Xóa
                </Button>
              </div>
            ))}
            <div className="button-row">
              <Button
                variant="outline"
                onClick={() => dispatch({ type: "addExample", grammarId: item.id })}
              >
                Thêm ví dụ
              </Button>
              <Button
                variant="ghost"
                disabled={Boolean(usage)}
                onClick={() => dispatch({ type: "removeGrammar", id: item.id })}
              >
                Xóa mẫu câu
              </Button>
            </div>
            {usage && <p className="small muted">{usage}</p>}
          </fieldset>
        );
      })}
      <Button
        variant="outline"
        onClick={() => dispatch({ type: "addGrammar", id: createId("grammar") })}
      >
        Thêm mẫu câu
      </Button>
    </div>
  );
}

"use client";

import { ExampleFields } from "@/components/teaching/example-fields";
import { Button } from "@/components/ui/button";

import type { TeachingDraft } from "@/lib/teaching-content";
import type { TeachingDispatch } from "@/lib/teaching-draft";

interface ItemControlsProps {
  label: string;
  index: number;
  count: number;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}

function ItemControls({ label, index, count, onMove, onRemove }: ItemControlsProps) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label={`Đưa ${label} lên`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        Lên
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-label={`Đưa ${label} xuống`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        Xuống
      </Button>
      <Button type="button" variant="ghost" aria-label={`Xóa ${label}`} onClick={onRemove}>
        Xóa
      </Button>
    </>
  );
}

interface StructureStepProps {
  draft: TeachingDraft;
  dispatch: TeachingDispatch;
}

export function StructureStep({ draft, dispatch }: StructureStepProps) {
  const { grammar, dialogue, context } = draft.content;
  return (
    <>
      <section className="editor-section" aria-labelledby="grammar-step-title">
        <h2 id="grammar-step-title">Mẫu câu</h2>
        <p className="small muted">
          Một mẫu câu ngắn, nghĩa tiếng Việt, giải thích dễ hiểu và một đến hai câu ví dụ.
        </p>
        <ol className="teaching-items">
          {grammar.map((item, index) => {
            const label = `mẫu câu ${index + 1}`;
            return (
              <li key={item.id} className="teaching-item">
                <div className="teaching-word-grid">
                  <input
                    aria-label={`Mẫu ${label}`}
                    lang={context.languageTag}
                    value={item.pattern}
                    maxLength={200}
                    placeholder="我叫 + tên"
                    onChange={(event) =>
                      dispatch({
                        type: "updateGrammar",
                        id: item.id,
                        patch: { pattern: event.target.value },
                      })
                    }
                  />
                  <input
                    aria-label={`Nghĩa ${label}`}
                    value={item.meaning}
                    maxLength={300}
                    placeholder="Tôi tên là …"
                    onChange={(event) =>
                      dispatch({
                        type: "updateGrammar",
                        id: item.id,
                        patch: { meaning: event.target.value },
                      })
                    }
                  />
                </div>
                <textarea
                  aria-label={`Giải thích ${label}`}
                  value={item.explain}
                  maxLength={1000}
                  placeholder="Giải thích ngắn bằng tiếng Việt"
                  onChange={(event) =>
                    dispatch({
                      type: "updateGrammar",
                      id: item.id,
                      patch: { explain: event.target.value },
                    })
                  }
                />
                {item.examples.map((example, exampleIndex) => (
                  <ExampleFields
                    key={exampleIndex}
                    label={`Ví dụ ${exampleIndex + 1} của ${label}`}
                    example={example}
                    languageTag={context.languageTag}
                    onChange={(patch) =>
                      dispatch({
                        type: "updateExample",
                        collection: "grammar",
                        id: item.id,
                        index: exampleIndex,
                        patch,
                      })
                    }
                    onRemove={() =>
                      dispatch({
                        type: "removeExample",
                        collection: "grammar",
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
                    onClick={() =>
                      dispatch({ type: "addExample", collection: "grammar", id: item.id })
                    }
                  >
                    Thêm câu ví dụ
                  </Button>
                  <ItemControls
                    label={label}
                    index={index}
                    count={grammar.length}
                    onMove={(offset) =>
                      dispatch({ type: "moveItem", collection: "grammar", id: item.id, offset })
                    }
                    onRemove={() =>
                      dispatch({ type: "removeItem", collection: "grammar", id: item.id })
                    }
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <Button
          type="button"
          variant="outline"
          disabled={grammar.length >= 50}
          onClick={() => dispatch({ type: "addGrammar" })}
        >
          Thêm mẫu câu
        </Button>
      </section>
      <section className="editor-section" aria-labelledby="dialogue-step-title">
        <h2 id="dialogue-step-title">Hội thoại</h2>
        <p className="small muted">
          Mỗi lượt lời một câu ngắn. Slide hiển thị tối đa ba lượt một trang.
        </p>
        <ol className="teaching-items">
          {dialogue.map((line, index) => {
            const label = `lượt thoại ${index + 1}`;
            return (
              <li key={line.id} className="teaching-item">
                <div className="teaching-dialogue-grid">
                  <input
                    aria-label={`Người nói ${label}`}
                    value={line.speaker}
                    maxLength={40}
                    placeholder="A"
                    onChange={(event) =>
                      dispatch({
                        type: "updateDialogue",
                        id: line.id,
                        patch: { speaker: event.target.value },
                      })
                    }
                  />
                  <input
                    aria-label={`Câu tiếng Trung ${label}`}
                    lang={context.languageTag}
                    value={line.text}
                    maxLength={300}
                    placeholder="你好！"
                    onChange={(event) =>
                      dispatch({
                        type: "updateDialogue",
                        id: line.id,
                        patch: { text: event.target.value },
                      })
                    }
                  />
                  <input
                    aria-label={`Pinyin ${label}`}
                    value={line.reading}
                    maxLength={300}
                    placeholder="Nǐ hǎo!"
                    onChange={(event) =>
                      dispatch({
                        type: "updateDialogue",
                        id: line.id,
                        patch: { reading: event.target.value },
                      })
                    }
                  />
                  <input
                    aria-label={`Nghĩa ${label}`}
                    value={line.meaning}
                    maxLength={300}
                    placeholder="Xin chào!"
                    onChange={(event) =>
                      dispatch({
                        type: "updateDialogue",
                        id: line.id,
                        patch: { meaning: event.target.value },
                      })
                    }
                  />
                </div>
                <div className="button-row">
                  <ItemControls
                    label={label}
                    index={index}
                    count={dialogue.length}
                    onMove={(offset) =>
                      dispatch({ type: "moveItem", collection: "dialogue", id: line.id, offset })
                    }
                    onRemove={() =>
                      dispatch({ type: "removeItem", collection: "dialogue", id: line.id })
                    }
                  />
                </div>
              </li>
            );
          })}
        </ol>
        <Button
          type="button"
          variant="outline"
          disabled={dialogue.length >= 100}
          onClick={() => dispatch({ type: "addDialogue" })}
        >
          Thêm lượt thoại
        </Button>
      </section>
    </>
  );
}

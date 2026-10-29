"use client";

import { Button } from "@/components/ui/button";
import {
  DIFFICULTY_LABELS,
  LANGUAGE_LABELS,
  LANGUAGE_TAGS,
  TEACHING_TEMPLATES,
  TEMPLATE_IDS,
} from "@/lib/teaching-content";
import { pickOption } from "@/lib/teaching-draft";

import type { TeachingDraft } from "@/lib/teaching-content";
import type { TeachingDispatch } from "@/lib/teaching-draft";

const DIFFICULTIES = ["beginner", "basic", "intermediate"] as const;

const MAX_OBJECTIVES = 5;

interface GoalStepProps {
  draft: TeachingDraft;
  dispatch: TeachingDispatch;
}

export function GoalStep({ draft, dispatch }: GoalStepProps) {
  const { authoring, content } = draft;
  const objectives = content.objectives.length ? content.objectives : [""];
  const template = TEACHING_TEMPLATES.find((item) => item.id === authoring.templateId);

  function handleObjectiveChange(index: number, value: string) {
    dispatch({
      type: "setObjectives",
      objectives: objectives.map((objective, position) => (position === index ? value : objective)),
    });
  }

  function handleTemplateChange(value: string) {
    const templateId = pickOption(TEMPLATE_IDS, value);
    if (templateId) {
      dispatch({ type: "setTemplate", templateId });
    }
  }

  function handleLanguageChange(value: string) {
    const languageTag = pickOption(LANGUAGE_TAGS, value);
    if (languageTag) {
      dispatch({ type: "setLanguage", languageTag });
    }
  }

  function handleDifficultyChange(value: string) {
    const difficulty = pickOption(DIFFICULTIES, value);
    if (difficulty) {
      dispatch({ type: "setAuthoring", patch: { difficulty } });
    }
  }

  function handleObjectiveRemove(index: number) {
    dispatch({
      type: "setObjectives",
      objectives: objectives.filter((_objective, position) => position !== index),
    });
  }

  return (
    <section className="editor-section" aria-labelledby="goal-step-title">
      <h2 id="goal-step-title">Mục tiêu và thông tin bài</h2>
      <div className="field">
        <label htmlFor="teaching-title">Tên bài</label>
        <input
          id="teaching-title"
          value={draft.title}
          maxLength={160}
          onChange={(event) => dispatch({ type: "setTitle", title: event.target.value })}
        />
      </div>
      <fieldset className="teaching-fieldset">
        <legend>Mục tiêu nhỏ học viên đạt được sau buổi học (tối đa {MAX_OBJECTIVES})</legend>
        {objectives.map((objective, index) => (
          <div key={index} className="teaching-inline-row">
            <input
              aria-label={`Mục tiêu ${index + 1}`}
              value={objective}
              maxLength={200}
              placeholder="Chào hỏi và nói tên mình bằng tiếng Trung"
              onChange={(event) => handleObjectiveChange(index, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`Xóa mục tiêu ${index + 1}`}
              onClick={() => handleObjectiveRemove(index)}
            >
              Xóa
            </Button>
          </div>
        ))}
        {objectives.length < MAX_OBJECTIVES && (
          <Button
            type="button"
            variant="outline"
            onClick={() => dispatch({ type: "setObjectives", objectives: [...objectives, ""] })}
          >
            Thêm mục tiêu
          </Button>
        )}
      </fieldset>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="teaching-template">Mẫu bài</label>
          <select
            id="teaching-template"
            value={authoring.templateId}
            onChange={(event) => handleTemplateChange(event.target.value)}
          >
            {TEACHING_TEMPLATES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="small muted">{template?.hint} Đổi mẫu chỉ đổi cách dựng slide của nháp.</p>
        </div>
        <div className="field">
          <label htmlFor="teaching-language">Chữ viết</label>
          <select
            id="teaching-language"
            value={content.context.languageTag}
            onChange={(event) => handleLanguageChange(event.target.value)}
          >
            {LANGUAGE_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {LANGUAGE_LABELS[tag]}
              </option>
            ))}
          </select>
          <p className="small muted">Hệ thống không tự đổi giản thể và phồn thể.</p>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="teaching-audience">Đối tượng</label>
          <input
            id="teaching-audience"
            value={authoring.audience}
            maxLength={300}
            onChange={(event) =>
              dispatch({ type: "setAuthoring", patch: { audience: event.target.value } })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="teaching-difficulty">Độ khó gợi ý</label>
          <select
            id="teaching-difficulty"
            value={authoring.difficulty}
            onChange={(event) => handleDifficultyChange(event.target.value)}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {DIFFICULTY_LABELS[difficulty]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="teaching-prerequisites">Kiến thức cần có trước</label>
          <textarea
            id="teaching-prerequisites"
            value={authoring.prerequisites}
            maxLength={500}
            placeholder="Bài đầu tiên có thể để trống."
            onChange={(event) =>
              dispatch({ type: "setAuthoring", patch: { prerequisites: event.target.value } })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="teaching-order">Thứ tự trong lộ trình</label>
          <input
            id="teaching-order"
            type="number"
            min={1}
            max={999}
            value={draft.order}
            onChange={(event) =>
              dispatch({
                type: "setOrder",
                order: Math.min(999, Math.max(1, Number(event.target.value) || 1)),
              })
            }
          />
          <p className="small muted">Chỉ là gợi ý thứ tự, không khóa học viên mở bài.</p>
        </div>
      </div>
    </section>
  );
}

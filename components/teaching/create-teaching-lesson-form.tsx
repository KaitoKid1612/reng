"use client";

import { useActionState } from "react";

import { createTeachingLessonAction } from "@/app/actions/teaching-lessons";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABELS, LANGUAGE_TAGS, TEACHING_TEMPLATES } from "@/lib/teaching-content";

interface CreateTeachingLessonFormProps {
  requestId: string;
  suggestedOrder: number;
}

export function CreateTeachingLessonForm({
  requestId,
  suggestedOrder,
}: CreateTeachingLessonFormProps) {
  const [state, action, isPending] = useActionState(createTeachingLessonAction, {});
  return (
    <form action={action} className="form-card">
      {/* One request ID per page load: a double submit opens the same draft. */}
      <input type="hidden" name="requestId" value={requestId} />
      <fieldset className="teaching-fieldset">
        <legend>Chọn mẫu bài</legend>
        <div className="template-options">
          {TEACHING_TEMPLATES.map((template, index) => (
            <label key={template.id} className="template-option">
              <input
                type="radio"
                name="templateId"
                value={template.id}
                defaultChecked={index === 0}
                required
              />
              <span>
                <strong>{template.label}</strong>
                <span className="small muted">{template.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="teaching-new-title">Tên bài</label>
        <input
          id="teaching-new-title"
          name="title"
          required
          maxLength={160}
          placeholder="Chào hỏi và giới thiệu tên"
        />
      </div>
      <div className="field">
        <label htmlFor="teaching-new-objective">Mục tiêu nhỏ đầu tiên</label>
        <input
          id="teaching-new-objective"
          name="objective"
          maxLength={200}
          placeholder="Nói được 你好 và tên của mình"
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="teaching-new-language">Chữ viết</label>
          <select id="teaching-new-language" name="languageTag" defaultValue="zh-Hans">
            {LANGUAGE_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {LANGUAGE_LABELS[tag]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="teaching-new-order">Thứ tự trong lộ trình</label>
          <input
            id="teaching-new-order"
            name="order"
            type="number"
            min={1}
            max={999}
            required
            defaultValue={suggestedOrder}
          />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        Tạo bài và bắt đầu soạn
      </Button>
    </form>
  );
}

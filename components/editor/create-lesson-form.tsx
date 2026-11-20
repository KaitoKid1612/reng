"use client";

import { useActionState } from "react";

import { createLessonAction } from "@/app/actions/lessons";
import { Button } from "@/components/ui/button";

interface CreateLessonFormProps {
  suggestedOrder: number;
}

// The lesson's ID is made on the server from its course and order; the teacher never types it.
export function CreateLessonForm({ suggestedOrder }: CreateLessonFormProps) {
  const [state, action, isPending] = useActionState(createLessonAction, {});
  const typed = state.values;
  return (
    // React resets the form after each action; remounting with the typed values keeps them.
    <form key={typed ? JSON.stringify(typed) : "new"} action={action} className="form-card">
      <div className="form-grid">
        <div className="field">
          <label htmlFor="lesson-order">Thứ tự trong khóa</label>
          <input
            id="lesson-order"
            name="order"
            type="number"
            min={1}
            max={999}
            required
            defaultValue={typed?.order ?? suggestedOrder}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lesson-title">Tiêu đề tiếng Việt</label>
        <input
          id="lesson-title"
          name="title"
          required
          maxLength={160}
          placeholder="Mua sắm"
          defaultValue={typed?.title}
        />
      </div>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        Tạo và mở editor
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";

import { createStarterLessonAction } from "@/app/actions/lessons";
import { Button } from "@/components/ui/button";

interface StarterLessonFormProps {
  starterId: string;
  requestId: string;
  label: string;
}

export function StarterLessonForm({ starterId, requestId, label }: StarterLessonFormProps) {
  const [state, action, isPending] = useActionState(createStarterLessonAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="starterId" value={starterId} />
      {/* One request ID per page load: a double submit opens the same draft. */}
      <input type="hidden" name="requestId" value={requestId} />
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {label}
      </Button>
    </form>
  );
}

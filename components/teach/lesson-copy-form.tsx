"use client";

import { useActionState } from "react";

import { copySharedLessonAction, duplicateLessonAction } from "@/app/actions/lesson-sharing";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

type LessonCopySource = { kind: "shared"; shareId: string } | { kind: "own"; lessonId: string };

interface LessonCopyFormProps {
  source: LessonCopySource;
  // Rendered by the server per page load, so a double submit opens the same copy.
  requestId: string;
  label: string;
  // On the teacher's own list copying is a side action shown like the links beside it; in the
  // shared library it is the main one.
  variant?: "outline" | "link";
}

export function LessonCopyForm({
  source,
  requestId,
  label,
  variant = "outline",
}: LessonCopyFormProps) {
  const [state, action, isPending] = useActionState(
    source.kind === "shared" ? copySharedLessonAction : duplicateLessonAction,
    {},
  );
  return (
    <form action={action}>
      <input type="hidden" name="requestId" value={requestId} />
      {source.kind === "shared" ? (
        <input type="hidden" name="shareId" value={source.shareId} />
      ) : (
        <input type="hidden" name="lessonId" value={source.lessonId} />
      )}
      {variant === "link" ? (
        <button type="submit" className="list-action" disabled={isPending}>
          {label}
        </button>
      ) : (
        <Button type="submit" variant="outline" disabled={isPending}>
          {label}
        </Button>
      )}
      <ActionFeedback state={state} />
    </form>
  );
}

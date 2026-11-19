"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { openLibraryExamAction } from "@/app/actions/exams";
import { Button } from "@/components/ui/button";

interface OpenExamFormProps {
  classId: string;
  lessonId: string;
}

function OpenExamButton({ onIdle }: { onIdle: () => void }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!pending) {
      onIdle();
    }
  }, [pending, onIdle]);
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Đang mở…" : "Mở đề này"}
    </Button>
  );
}

/**
 * "Mở đề này" in the exam library. Each submit opens one more exam, so a double click must not
 * send twice: the second submit arrives before the disabled button renders, hence the ref.
 */
export function OpenExamForm({ classId, lessonId }: OpenExamFormProps) {
  const submitting = useRef(false);
  const release = useCallback(() => {
    submitting.current = false;
  }, []);
  return (
    <form
      action={openLibraryExamAction}
      onSubmit={(event) => {
        if (submitting.current) {
          event.preventDefault();
          return;
        }
        submitting.current = true;
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <OpenExamButton onIdle={release} />
    </form>
  );
}

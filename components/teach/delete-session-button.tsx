"use client";

import { useActionState } from "react";

import { classSessionAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface DeleteSessionButtonProps {
  classId: string;
  sessionId: string;
}

export function DeleteSessionButton({ classId, sessionId }: DeleteSessionButtonProps) {
  const [state, action, isPending] = useActionState(classSessionAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <Button type="submit" name="operation" value="delete" variant="ghost" disabled={isPending}>
        Xóa
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

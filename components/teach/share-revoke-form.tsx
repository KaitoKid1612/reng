"use client";

import { useActionState } from "react";

import { revokeShareAction } from "@/app/actions/lesson-sharing";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface ShareRevokeFormProps {
  shareId: string;
  recipientLabel: string;
}

export function ShareRevokeForm({ shareId, recipientLabel }: ShareRevokeFormProps) {
  const [state, action, isPending] = useActionState(revokeShareAction, {});
  return (
    <form action={action}>
      <input type="hidden" name="shareId" value={shareId} />
      <Button
        type="submit"
        variant="outline"
        disabled={isPending}
        aria-label={`Thu hồi quyền của ${recipientLabel}`}
      >
        Thu hồi
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

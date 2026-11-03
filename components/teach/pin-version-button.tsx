"use client";

import { useActionState } from "react";

import { pinLatestVersionAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { useUsageAnnounce } from "@/components/teach/usage-notice";
import { Button } from "@/components/ui/button";

import type { ActionState } from "@/app/actions/classes";

interface PinVersionButtonProps {
  classId: string;
  className: string;
  lessonId: string;
  label: string;
  isPrimary: boolean;
}

export function PinVersionButton({
  classId,
  className,
  lessonId,
  label,
  isPrimary,
}: PinVersionButtonProps) {
  const announce = useUsageAnnounce();
  const [state, action, isPending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await pinLatestVersionAction(previous, formData);
      if (result.notice) {
        announce(`${className}: ${result.notice}`);
      }
      return result;
    },
    {},
  );
  return (
    <form action={action} className="pin-version-form">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Button type="submit" variant={isPrimary ? "default" : "outline"} disabled={isPending}>
        {isPending ? "Đang lưu…" : label}
      </Button>
      {state.error && <ActionFeedback state={state} />}
    </form>
  );
}

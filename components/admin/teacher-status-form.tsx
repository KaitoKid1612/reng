"use client";

import { useActionState } from "react";

import { setTeacherStatusAction } from "@/app/actions/admin";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface TeacherStatusFormProps {
  userId: string;
  status: "pending" | "active" | "suspended";
  // A rejected request was never activated; a paused teacher was.
  wasActivated: boolean;
  teacherLabel: string;
}

interface StatusAction {
  status: "active" | "suspended";
  label: string;
}

function listActions(status: TeacherStatusFormProps["status"], wasActivated: boolean) {
  const actions: Record<TeacherStatusFormProps["status"], StatusAction[]> = {
    pending: [
      { status: "active", label: "Duyệt" },
      { status: "suspended", label: "Từ chối" },
    ],
    active: [{ status: "suspended", label: "Tạm dừng" }],
    suspended: [{ status: "active", label: wasActivated ? "Mở lại" : "Duyệt" }],
  };
  return actions[status];
}

export function TeacherStatusForm({
  userId,
  status,
  wasActivated,
  teacherLabel,
}: TeacherStatusFormProps) {
  const [state, action, isPending] = useActionState(setTeacherStatusAction, {});
  return (
    <div>
      <div className="button-row">
        {listActions(status, wasActivated).map((next) => (
          <form key={next.status} action={action}>
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="status" value={next.status} />
            <Button
              type="submit"
              variant={next.status === "active" ? "default" : "outline"}
              disabled={isPending}
              aria-label={`${next.label} ${teacherLabel}`}
            >
              {next.label}
            </Button>
          </form>
        ))}
      </div>
      <ActionFeedback state={state} />
    </div>
  );
}

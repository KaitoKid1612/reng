"use client";

import { useActionState } from "react";

import { setTeacherStatusAction } from "@/app/actions/admin";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface TeacherStatusFormProps {
  userId: string;
  status: "pending" | "active" | "suspended";
  teacherLabel: string;
}

const NEXT_ACTION = {
  pending: { status: "active", label: "Duyệt" },
  active: { status: "suspended", label: "Tạm dừng" },
  suspended: { status: "active", label: "Mở lại" },
} as const;

export function TeacherStatusForm({ userId, status, teacherLabel }: TeacherStatusFormProps) {
  const [state, action, isPending] = useActionState(setTeacherStatusAction, {});
  const next = NEXT_ACTION[status];
  return (
    <form action={action}>
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
      <ActionFeedback state={state} />
    </form>
  );
}

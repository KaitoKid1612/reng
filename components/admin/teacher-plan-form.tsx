"use client";

import { useActionState } from "react";

import { updateTeacherPlanAction } from "@/app/actions/admin";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface TeacherPlanFormProps {
  userId: string;
  accessUntil: string | null;
  note: string;
  teacherLabel: string;
}

export function TeacherPlanForm({ userId, accessUntil, note, teacherLabel }: TeacherPlanFormProps) {
  const [state, action, isPending] = useActionState(updateTeacherPlanAction, {});
  return (
    <form action={action} className="admin-plan-form">
      <input type="hidden" name="userId" value={userId} />
      <div className="field">
        <label htmlFor={`${userId}-access`}>Hạn thuê của {teacherLabel}</label>
        <input
          id={`${userId}-access`}
          name="accessUntil"
          type="date"
          defaultValue={accessUntil ?? ""}
        />
      </div>
      <div className="field">
        <label htmlFor={`${userId}-note`}>Ghi chú của {teacherLabel}</label>
        <input id={`${userId}-note`} name="note" maxLength={500} defaultValue={note} />
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" disabled={isPending}>
        Lưu
      </Button>
    </form>
  );
}

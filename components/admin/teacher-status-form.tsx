"use client";

import { useActionState, useState } from "react";

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
  // Stopping someone's teaching is asked again first, like removing a learner from a class;
  // opening it runs at once.
  confirmation?: { text: string; confirmLabel: string };
}

function listActions(status: TeacherStatusFormProps["status"], wasActivated: boolean) {
  const actions: Record<TeacherStatusFormProps["status"], StatusAction[]> = {
    pending: [
      { status: "active", label: "Duyệt" },
      {
        status: "suspended",
        label: "Từ chối",
        confirmation: {
          text: "Người này sẽ không dạy được trên Reng nhưng vẫn học như học viên. Bạn có thể bấm Duyệt sau.",
          confirmLabel: "Xác nhận từ chối",
        },
      },
    ],
    active: [
      {
        status: "suspended",
        label: "Tạm dừng",
        confirmation: {
          text: "Giáo viên sẽ không dùng được trang Giảng dạy cho tới khi bạn bấm Mở lại. Lớp, bài học và điểm không bị xóa.",
          confirmLabel: "Xác nhận tạm dừng",
        },
      },
    ],
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
  const [confirming, setConfirming] = useState<StatusAction | null>(null);
  // The status changes once this succeeds, so the question must not come back afterwards.
  function handleConfirm(formData: FormData) {
    action(formData);
    setConfirming(null);
  }
  if (confirming?.confirmation) {
    return (
      <form action={handleConfirm} className="inline-form">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value={confirming.status} />
        <p className="small">{confirming.confirmation.text}</p>
        <div className="button-row">
          <Button
            type="submit"
            disabled={isPending}
            aria-label={`${confirming.confirmation.confirmLabel} ${teacherLabel}`}
          >
            {confirming.confirmation.confirmLabel}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(null)}>
            Giữ nguyên
          </Button>
        </div>
        <ActionFeedback state={state} />
      </form>
    );
  }
  return (
    <div>
      <div className="button-row">
        {listActions(status, wasActivated).map((next) =>
          next.confirmation ? (
            <Button
              key={next.status}
              variant="outline"
              disabled={isPending}
              aria-label={`${next.label} ${teacherLabel}`}
              onClick={() => setConfirming(next)}
            >
              {next.label}
            </Button>
          ) : (
            <form key={next.status} action={action}>
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="status" value={next.status} />
              <Button
                type="submit"
                disabled={isPending}
                aria-label={`${next.label} ${teacherLabel}`}
              >
                {next.label}
              </Button>
            </form>
          ),
        )}
      </div>
      <ActionFeedback state={state} />
    </div>
  );
}

"use client";

import { useActionState } from "react";

import { createClassAction, updateClassAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface ClassSettingsFormProps {
  classRow?: { id: string; name: string; pass_score: number; active: boolean };
}

export function ClassSettingsForm({ classRow }: ClassSettingsFormProps) {
  const [state, action, isPending] = useActionState(
    classRow ? updateClassAction : createClassAction,
    {},
  );
  return (
    <form action={action} className="form-card">
      {classRow && <input type="hidden" name="classId" value={classRow.id} />}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="class-name">Tên lớp</label>
          <input
            id="class-name"
            name="name"
            required
            maxLength={120}
            defaultValue={classRow?.name}
            placeholder="N5 tối thứ Ba – Năm"
          />
        </div>
        <div className="field">
          <label htmlFor="pass-score">Điểm đạt của lớp (%)</label>
          <input
            id="pass-score"
            name="passScore"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={classRow?.pass_score ?? 70}
          />
        </div>
      </div>
      {classRow && (
        <label className="choice-label">
          <input type="checkbox" name="active" defaultChecked={classRow.active} />
          Lớp đang hoạt động (bỏ chọn để lưu trữ: không vào lớp, không bắt đầu bài mới)
        </label>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        {classRow ? "Lưu cài đặt" : "Tạo lớp"}
      </Button>
    </form>
  );
}

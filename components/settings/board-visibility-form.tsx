"use client";

import { useActionState } from "react";

import { boardVisibilityAction } from "@/app/actions/weekly-board";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

/** "Ẩn tôi khỏi bảng tuần": the learner stays off every weekly board but still sees their points. */
export function BoardVisibilityForm({ isHidden }: { isHidden: boolean }) {
  const [state, action, isPending] = useActionState(boardVisibilityAction, {});
  return (
    <form action={action} className="form-card" aria-labelledby="board-visibility-title">
      <h2 id="board-visibility-title">Bảng xếp hạng tuần</h2>
      <p className="small muted">
        Khi giáo viên bật bảng tuần, học viên các lớp của giáo viên đó thấy họ tên và số câu đúng
        trong tuần của nhau.
      </p>
      <label className="choice-label">
        <input type="checkbox" name="hidden" defaultChecked={isHidden} />
        Ẩn tôi khỏi bảng tuần (chỉ tôi thấy điểm của mình)
      </label>
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Đang lưu…" : "Lưu bảng tuần"}
      </Button>
    </form>
  );
}

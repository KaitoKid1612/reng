"use client";

import { useActionState } from "react";

import { weeklyBoardAction } from "@/app/actions/weekly-board";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface WeeklyBoardFormProps {
  classId: string;
  isOnBoard: boolean;
}

/** Puts the class on, or takes it off, the weekly board shared by the teacher's classes. */
export function WeeklyBoardForm({ classId, isOnBoard }: WeeklyBoardFormProps) {
  const [state, action, isPending] = useActionState(weeklyBoardAction, {});
  return (
    <form action={action} className="form-card" aria-labelledby="weekly-board-title">
      <h3 id="weekly-board-title">Bảng xếp hạng tuần</h3>
      <p className="small muted">
        Học viên của mọi lớp bạn bật mục này xếp hạng chung theo số câu đúng trong tuần (thứ 2 đến
        chủ nhật, mỗi bài tính lần làm cao nhất). Bảng hiện ở trang Tiến độ với họ tên và điểm; ai
        không muốn có thể tự ẩn mình ở trang Tài khoản.
      </p>
      <input type="hidden" name="classId" value={classId} />
      <label className="choice-label">
        <input type="checkbox" name="enabled" defaultChecked={isOnBoard} />
        Đưa lớp này vào bảng tuần chung
      </label>
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Đang lưu…" : "Lưu bảng tuần"}
      </Button>
    </form>
  );
}

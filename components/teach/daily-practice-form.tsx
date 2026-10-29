"use client";

import { useActionState } from "react";

import { dailyPracticeAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";
import { DAILY_PRACTICE_SIZES } from "@/lib/daily-practice";

interface DailyPracticeFormProps {
  classId: string;
  size: number | null;
}

export function DailyPracticeForm({ classId, size }: DailyPracticeFormProps) {
  const [state, action, isPending] = useActionState(dailyPracticeAction, {});
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="classId" value={classId} />
      <div className="field">
        <label htmlFor="daily-practice-size">Mỗi ngày tự giao</label>
        <select id="daily-practice-size" name="size" defaultValue={size ?? ""}>
          <option value="">Tắt</option>
          {DAILY_PRACTICE_SIZES.map((count) => (
            <option key={count} value={count}>
              {count} câu
            </option>
          ))}
        </select>
      </div>
      <div className="button-row">
        <Button type="submit" name="operation" value="save" disabled={isPending}>
          Lưu
        </Button>
        <Button
          type="submit"
          name="operation"
          value="today"
          variant="outline"
          disabled={isPending || !size}
        >
          Giao bài hôm nay ngay
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

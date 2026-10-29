"use client";

import { useActionState } from "react";

import { saveNotificationPreferencesAction } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

import type { NotificationPreferences } from "@/lib/server/notifications";

interface NotificationPreferencesFormProps {
  role: "student" | "teacher";
  preferences: NotificationPreferences;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Hằng ngày lúc 20:00, chỉ khi có thẻ cần ôn hoặc bài chưa nộp" },
  { value: "due_only", label: "Chỉ khi bài tập sắp hết hạn trong 24 giờ" },
  { value: "off", label: "Không nhắc" },
] as const;

export function NotificationPreferencesForm({
  role,
  preferences,
}: NotificationPreferencesFormProps) {
  const [state, action, isPending] = useActionState(saveNotificationPreferencesAction, {});
  return (
    <form action={action} className="form-card">
      {preferences.pauseReason && (
        <p className="notice-panel" role="alert">
          Reng đã tạm dừng gửi email vì thư{" "}
          {preferences.pauseReason === "bounced" ? "bị trả lại" : "bị báo là spam"}. Kiểm tra địa
          chỉ email rồi lưu lại cài đặt để gửi tiếp.
        </p>
      )}
      <fieldset>
        <legend>Nhắc học qua email</legend>
        {FREQUENCY_OPTIONS.map((option) => (
          <label key={option.value} className="choice-label">
            <input
              type="radio"
              name="reminderFrequency"
              value={option.value}
              defaultChecked={preferences.reminderFrequency === option.value}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <label className="choice-label">
        <input type="checkbox" name="weeklyEnabled" defaultChecked={preferences.weeklyEnabled} />
        Tổng kết tuần vào tối Chủ nhật
      </label>
      {role === "teacher" && (
        <label className="choice-label">
          <input
            type="checkbox"
            name="teacherDigestEnabled"
            defaultChecked={preferences.teacherDigestEnabled}
          />
          Tóm tắt lớp lúc 06:00: bài nộp mới, câu sai nhiều, học viên cần chú ý
        </label>
      )}
      <p className="small muted">
        Email chỉ gửi khi có việc cần làm. Mọi thư đều có link hủy một chạm.
      </p>
      {state.error && (
        <p role="alert" className="error-text">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="form-notice">
          {state.notice}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        Lưu cài đặt
      </Button>
    </form>
  );
}

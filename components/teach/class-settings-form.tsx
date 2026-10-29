"use client";

import { useActionState } from "react";

import { createClassAction, updateClassAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface ClassSettingsFormProps {
  classRow?: {
    id: string;
    name: string;
    pass_score: number;
    active: boolean;
    capacity: number | null;
    meeting_url: string | null;
    language_tag: string;
    revision: number;
  };
}

export function ClassSettingsForm({ classRow }: ClassSettingsFormProps) {
  const [state, action, isPending] = useActionState(
    classRow ? updateClassAction : createClassAction,
    {},
  );
  return (
    <form action={action} className="form-card">
      {classRow && (
        <>
          <input type="hidden" name="classId" value={classRow.id} />
          <input type="hidden" name="revision" value={classRow.revision} />
        </>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="class-name">Tên lớp</label>
          <input
            id="class-name"
            name="name"
            required
            maxLength={120}
            defaultValue={classRow?.name}
            placeholder="Tiếng Trung nhập môn tối thứ Ba"
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
      <div className="form-grid">
        <div className="field">
          <label htmlFor="class-language">Ngôn ngữ học</label>
          <select
            id="class-language"
            name="languageTag"
            defaultValue={classRow?.language_tag ?? "zh-Hans"}
          >
            <option value="zh-Hans">Tiếng Trung giản thể</option>
            <option value="zh-Hant">Tiếng Trung phồn thể</option>
            <option value="ja-JP">Tiếng Nhật</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="class-capacity">Số học viên tối đa</label>
          <input
            id="class-capacity"
            name="capacity"
            type="number"
            min={1}
            max={1000}
            defaultValue={classRow?.capacity ?? ""}
          />
          <p className="small muted">Để trống nếu chưa giới hạn số chỗ.</p>
        </div>
      </div>
      <div className="field">
        <label htmlFor="class-meeting">Link Google Meet</label>
        <input
          id="class-meeting"
          name="meetingUrl"
          type="url"
          defaultValue={classRow?.meeting_url ?? ""}
          placeholder="https://meet.google.com/abc-defg-hij"
        />
        <p className="small muted">
          Chỉ học viên trong lớp thấy link. Giữ riêng cửa sổ ghi chú khi chia sẻ tab slide.
        </p>
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

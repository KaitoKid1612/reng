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
    self_study: boolean;
  };
}

export function ClassSettingsForm({ classRow }: ClassSettingsFormProps) {
  const [state, action, isPending] = useActionState(
    classRow ? updateClassAction : createClassAction,
    {},
  );
  const typed = state.values;
  return (
    // React resets the form after each action; remounting with the typed values keeps them.
    <form key={typed ? JSON.stringify(typed) : "saved"} action={action} className="form-card">
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
            defaultValue={typed?.name ?? classRow?.name}
            placeholder="Ví dụ: Lớp sơ cấp – tối thứ Ba"
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
            defaultValue={typed?.passScore ?? classRow?.pass_score ?? 70}
          />
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="class-language">Môn học</label>
          <select
            key={classRow?.language_tag ?? "new"}
            id="class-language"
            name="languageTag"
            defaultValue={typed?.languageTag ?? classRow?.language_tag ?? "ja-JP"}
          >
            <option value="ja-JP">Tiếng Nhật</option>
            <option value="zh-Hans">Tiếng Trung giản thể</option>
            <option value="zh-Hant">Tiếng Trung phồn thể</option>
          </select>
        </div>
        {classRow?.self_study ? (
          <input type="hidden" name="capacity" value="1" />
        ) : (
          <div className="field">
            <label htmlFor="class-capacity">Số học viên tối đa</label>
            <input
              id="class-capacity"
              name="capacity"
              type="number"
              min={1}
              max={1000}
              defaultValue={typed?.capacity ?? classRow?.capacity ?? ""}
            />
            <p className="small muted">
              Để trống nếu chưa giới hạn số chỗ.
              {classRow ? "" : " Lớp tự học luôn có một chỗ cho chính bạn."}
            </p>
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="class-meeting">Link Google Meet</label>
        <input
          id="class-meeting"
          name="meetingUrl"
          type="url"
          defaultValue={typed?.meetingUrl ?? classRow?.meeting_url ?? ""}
          placeholder="https://meet.google.com/abc-defg-hij"
        />
        <p className="small muted">
          Chỉ học viên trong lớp thấy link. Giữ riêng cửa sổ ghi chú khi chia sẻ tab slide.
        </p>
      </div>
      {!classRow && (
        <div className="field">
          <label className="choice-label">
            <input type="checkbox" name="selfStudy" />
            Lớp tự học của tôi: chỉ mình tôi là học viên
          </label>
          <p className="small muted">
            Dùng khi bạn vừa dạy vừa tự ôn: lớp không có mã mời, bài giao và bài luyện hằng ngày đến
            chính bạn ở mục Lớp của tôi, báo cáo là kết quả của bạn. Đừng tự vào lớp bạn đang dạy,
            vì Reng không tính chủ lớp là học viên.
          </p>
        </div>
      )}
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

"use client";

import { useActionState, useState } from "react";

import { shareLessonAction } from "@/app/actions/lesson-sharing";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";

interface LessonShareFormProps {
  lessonId: string;
  versions: { id: string; versionNo: number }[];
}

export function LessonShareForm({ lessonId, versions }: LessonShareFormProps) {
  const [state, action, isPending] = useActionState(shareLessonAction, {});
  const [permission, setPermission] = useState<"view" | "copy">("view");
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="share-version">Phiên bản chia sẻ</label>
          <select id="share-version" name="versionId" defaultValue={versions[0]?.id}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Phiên bản {version.versionNo}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="share-email">Email giáo viên nhận</label>
          <input id="share-email" name="email" type="email" required maxLength={320} />
        </div>
      </div>
      <fieldset className="teaching-fieldset">
        <legend>Quyền của giáo viên nhận</legend>
        <label className="choice-label">
          <input
            type="radio"
            name="permission"
            value="view"
            checked={permission === "view"}
            onChange={() => setPermission("view")}
          />
          Chỉ xem phiên bản này
        </label>
        <label className="choice-label">
          <input
            type="radio"
            name="permission"
            value="copy"
            checked={permission === "copy"}
            onChange={() => setPermission("copy")}
          />
          Xem và sao chép thành bài của họ
        </label>
      </fieldset>
      {permission === "copy" && (
        <label className="choice-label">
          <input type="checkbox" name="acknowledgeCopy" required />
          Tôi hiểu: bản sao thuộc về người nhận, thu hồi quyền chỉ chặn xem và sao chép mới, không
          xóa bản sao đã tạo.
        </label>
      )}
      <p className="small muted">
        Người nhận chỉ thấy đúng phiên bản đã chọn, không thấy ghi chú riêng, bản nháp, câu kiểm tra
        hay dữ liệu lớp của bạn.
      </p>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending || !versions.length}>
        Chia sẻ
      </Button>
    </form>
  );
}

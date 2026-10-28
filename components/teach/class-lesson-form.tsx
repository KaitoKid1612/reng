"use client";

import { useActionState, useState } from "react";

import { setClassLessonAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { DateTimeField } from "@/components/teach/date-time-field";
import { Button } from "@/components/ui/button";
import { formatStudyDateTime } from "@/lib/study-days";

import type { OwnedLesson } from "@/lib/server/classes";

interface ClassLessonFormProps {
  classId: string;
  lessons: OwnedLesson[];
  nextOrderNo: number;
  defaultAvailableAt: string;
}

export function ClassLessonForm({
  classId,
  lessons,
  nextOrderNo,
  defaultAvailableAt,
}: ClassLessonFormProps) {
  const [state, action, isPending] = useActionState(setClassLessonAction, {});
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lessons.length) {
    return (
      <p className="notice-panel">
        Tài khoản này chưa sở hữu bài học nào. Người vận hành xuất bản bài bằng script với chủ sở
        hữu là tài khoản của bạn.
      </p>
    );
  }
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="classId" value={classId} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="class-lesson">Bài học</label>
          <select
            id="class-lesson"
            name="lessonId"
            value={lessonId}
            onChange={(event) => setLessonId(event.target.value)}
          >
            {lessons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="class-lesson-version">Phiên bản dùng cho lớp</label>
          <select
            key={lessonId}
            id="class-lesson-version"
            name="versionId"
            defaultValue={lesson?.publishedVersionId ?? undefined}
          >
            {lesson?.versions.map((version) => (
              <option key={version.id} value={version.id}>
                Phiên bản {version.version_no}, xuất bản {formatStudyDateTime(version.published_at)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="class-lesson-order">Thứ tự trong lớp</label>
          <input
            id="class-lesson-order"
            name="orderNo"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={nextOrderNo}
          />
        </div>
        <DateTimeField
          id="class-lesson-available"
          name="availableAt"
          label="Mở cho học viên từ"
          initialValue={defaultAvailableAt}
          isRequired
        />
      </div>
      <p className="small muted">
        Chọn lại một bài đã có để đổi phiên bản, thứ tự hoặc lịch mở. Bài đã giao giữ phiên bản lúc
        giao.
      </p>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        Lưu vào lớp
      </Button>
    </form>
  );
}

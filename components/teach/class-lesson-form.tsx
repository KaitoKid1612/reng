"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { setClassLessonAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { DateTimeField } from "@/components/teach/date-time-field";
import { Button } from "@/components/ui/button";
import { lessonLanguage, teachingLanguageLabel } from "@/lib/teaching-language";
import { formatStudyDateTime } from "@/lib/study-days";

import type { TeachingLanguageTag } from "@/lib/teaching-language";
import type { ClassLesson, OwnedLesson } from "@/lib/server/classes";

interface ClassLessonFormProps {
  classId: string;
  classLanguageTag: TeachingLanguageTag;
  lessons: OwnedLesson[];
  classLessons: ClassLesson[];
  nextOrderNo: number;
  defaultAvailableAt: string;
}

export function ClassLessonForm({
  classId,
  classLanguageTag,
  lessons,
  classLessons,
  nextOrderNo,
  defaultAvailableAt,
}: ClassLessonFormProps) {
  const [state, action, isPending] = useActionState(setClassLessonAction, {});
  const publishedLessons = lessons.filter((item) => item.versions.length > 0);
  // Start with the first published lesson the class does not have yet.
  const [lessonId, setLessonId] = useState(
    () =>
      (
        publishedLessons.find((item) => !classLessons.some((row) => row.lessonId === item.id)) ??
        publishedLessons[0]
      )?.id ?? "",
  );
  const lesson = publishedLessons.find((item) => item.id === lessonId) ?? publishedLessons[0];
  // Saving a lesson already in the class rewrites its version, order and opening time, so
  // the fields start from the class's current values instead of "next position, now".
  const current = classLessons.find((row) => row.lessonId === lesson?.id);
  // Remounts the fields when another lesson is chosen or a save changes the class's values.
  const fieldsKey = `${lesson?.id}:${current?.versionId}:${current?.orderNo}:${current?.availableAt}`;
  if (!lessons.length) {
    return (
      <p className="notice-panel">
        Bạn chưa có bài học nào. <Link href="/teach/lessons/new">Tạo bài đầu tiên</Link> từ mẫu hoặc
        soạn mới, kiểm tra rồi xuất bản. Sau đó quay lại đây để lưu bài vào lớp.
      </p>
    );
  }
  if (!publishedLessons.length) {
    return (
      <p className="notice-panel">
        Các bài của bạn vẫn là bản nháp. <Link href="/teach">Mở bài để soạn và xuất bản</Link>, sau
        đó quay lại đây để lưu bài vào lớp.
      </p>
    );
  }
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="classId" value={classId} />
      <p className="small muted">
        Ngôn ngữ lớp: {teachingLanguageLabel(classLanguageTag)}. Kiểm tra ngôn ngữ của phiên bản
        trước khi lưu; hệ thống không tự dịch hoặc đổi giản thể/phồn thể.
      </p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="class-lesson">Bài học</label>
          <select
            id="class-lesson"
            name="lessonId"
            value={lesson?.id ?? ""}
            onChange={(event) => setLessonId(event.target.value)}
          >
            {publishedLessons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} — {teachingLanguageLabel(item.languageTag)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="class-lesson-version">Phiên bản dùng cho lớp</label>
          <select
            key={fieldsKey}
            id="class-lesson-version"
            name="versionId"
            defaultValue={current?.versionId ?? lesson?.publishedVersionId ?? undefined}
          >
            {lesson?.versions.map((version) => (
              <option key={version.id} value={version.id}>
                Phiên bản {version.version_no} —{" "}
                {teachingLanguageLabel(
                  lessonLanguage(version.schema_version, version.language_tag),
                )}
                , xuất bản {formatStudyDateTime(version.published_at)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="class-lesson-order">Thứ tự trong lớp</label>
          <input
            key={fieldsKey}
            id="class-lesson-order"
            name="orderNo"
            type="number"
            min={1}
            max={500}
            required
            defaultValue={current?.orderNo ?? nextOrderNo}
          />
        </div>
        <DateTimeField
          key={fieldsKey}
          id="class-lesson-available"
          name="availableAt"
          label="Mở cho học viên từ"
          initialValue={current?.availableAt ?? defaultAvailableAt}
          isRequired
        />
      </div>
      {current ? (
        <p className="notice-panel" role="status">
          Bài này đã có trong lớp: phiên bản {current.versionNo}, thứ tự {current.orderNo}, mở từ{" "}
          {formatStudyDateTime(current.availableAt)}. Các ô trên đang giữ đúng giá trị đó; chỉ đổi ô
          bạn muốn cập nhật. Bài đã giao giữ phiên bản lúc giao.
        </p>
      ) : (
        <p className="small muted">
          Chọn lại một bài đã có để đổi phiên bản, thứ tự hoặc lịch mở. Bài đã giao giữ phiên bản
          lúc giao.
        </p>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        Lưu vào lớp
      </Button>
    </form>
  );
}

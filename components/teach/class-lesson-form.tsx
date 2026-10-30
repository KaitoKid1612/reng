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
import type { OwnedLesson } from "@/lib/server/classes";

interface ClassLessonFormProps {
  classId: string;
  classLanguageTag: TeachingLanguageTag;
  lessons: OwnedLesson[];
  nextOrderNo: number;
  defaultAvailableAt: string;
}

export function ClassLessonForm({
  classId,
  classLanguageTag,
  lessons,
  nextOrderNo,
  defaultAvailableAt,
}: ClassLessonFormProps) {
  const [state, action, isPending] = useActionState(setClassLessonAction, {});
  const publishedLessons = lessons.filter((item) => item.versions.length > 0);
  const [lessonId, setLessonId] = useState(publishedLessons[0]?.id ?? "");
  const lesson = publishedLessons.find((item) => item.id === lessonId) ?? publishedLessons[0];
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
            key={lesson?.id}
            id="class-lesson-version"
            name="versionId"
            defaultValue={lesson?.publishedVersionId ?? undefined}
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

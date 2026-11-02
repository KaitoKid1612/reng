"use client";

import { useActionState } from "react";

import { classSessionAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";
import { MAX_SESSION_NOTES, MAX_SLIDE_NUMBER } from "@/lib/class-sessions";

interface ClassSessionFormProps {
  classId: string;
  today: string;
  lessons: { lessonId: string; title: string }[];
  defaultLessonId: string;
  // Filled in when the teacher comes back from the slides.
  defaultSlide?: number | null;
}

export function ClassSessionForm({
  classId,
  today,
  lessons,
  defaultLessonId,
  defaultSlide,
}: ClassSessionFormProps) {
  const [state, action, isPending] = useActionState(classSessionAction, {});
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="classId" value={classId} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="session-date">Ngày dạy</label>
          <input
            id="session-date"
            name="taughtOn"
            type="date"
            required
            max={today}
            defaultValue={today}
          />
        </div>
        <div className="field">
          <label htmlFor="session-lesson">Bài đã dạy</label>
          <select id="session-lesson" name="lessonId" defaultValue={defaultLessonId}>
            <option value="">Không dùng bài trong lớp</option>
            {lessons.map((lesson) => (
              <option key={lesson.lessonId} value={lesson.lessonId}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="session-slide">Dạy đến slide số</label>
        <input
          id="session-slide"
          name="slideReached"
          type="number"
          min={1}
          max={MAX_SLIDE_NUMBER}
          inputMode="numeric"
          defaultValue={defaultSlide ?? ""}
        />
        <p className="small muted">
          Số trên thanh trình chiếu. Buổi sau mở lại đúng slide này. Để trống nếu không dùng slide.
        </p>
      </div>
      <div className="field">
        <label htmlFor="session-notes">Ghi chú</label>
        <textarea
          id="session-notes"
          name="notes"
          maxLength={MAX_SESSION_NOTES}
          placeholder="Học viên còn nhầm ~ています; buổi sau ôn mẫu câu 3 và giao bài kanji."
        />
        <p className="small muted">Chỉ bạn thấy ghi chú này, học viên không thấy.</p>
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={isPending}>
        Ghi buổi dạy
      </Button>
    </form>
  );
}

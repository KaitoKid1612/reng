"use client";

import { useActionState } from "react";

import { dailyPracticeAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { Button } from "@/components/ui/button";
import { dailyPracticeSizeOptions } from "@/lib/daily-practice";
import {
  DAILY_FORMAT_LABELS,
  DAILY_FORMATS,
  JLPT_DAILY_LISTENING,
  jlptFullDailySize,
} from "@/lib/jlpt-parts";

import type { DailyFormat } from "@/lib/jlpt-parts";

interface DailyPracticeLessonOption {
  lessonId: string;
  title: string;
  isOpen: boolean;
}

interface DailyPracticeFormProps {
  classId: string;
  size: number | null;
  format: DailyFormat;
  listeningCount: number | null;
  availableListeningCount: number | null;
  lessonId: string | null;
  lessons: DailyPracticeLessonOption[];
}

export function DailyPracticeForm({
  classId,
  size,
  format,
  listeningCount,
  availableListeningCount,
  lessonId,
  lessons,
}: DailyPracticeFormProps) {
  const [state, action, isPending] = useActionState(dailyPracticeAction, {});
  return (
    <form action={action} className="form-card">
      <input type="hidden" name="classId" value={classId} />
      {/* React resets the form after saving; a select only takes a new default when it is
          remounted, so each key follows the saved value. */}
      <div className="form-grid">
        <div className="field">
          <label htmlFor="daily-practice-size">Mỗi ngày tự giao</label>
          <select
            key={size ?? "off"}
            id="daily-practice-size"
            name="size"
            defaultValue={size ?? ""}
          >
            <option value="">Tắt</option>
            {dailyPracticeSizeOptions(size).map((count) => (
              <option key={count} value={count}>
                {count} câu{fullTestNote(count)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="daily-practice-format">Cách chia câu</label>
          <select key={format} id="daily-practice-format" name="format" defaultValue={format}>
            {DAILY_FORMATS.map((value) => (
              <option key={value} value={value}>
                {DAILY_FORMAT_LABELS[value]}
              </option>
            ))}
          </select>
          <p className="muted">
            Theo cấu trúc đề: mỗi ngày đủ các もんだい theo thứ tự của đề thật, phần nghe ở cuối.
            Ngân hàng cần câu gắn nhãn もんだい.
          </p>
        </div>
        <div className="field">
          <label htmlFor="daily-listening-count">Số câu nghe mỗi ngày</label>
          {/* Empty keeps the class's rule from before the count existed: listening questions in
              proportion to the source lesson. Saving size or source must not switch it to 0. */}
          <select
            key={listeningCount ?? "unset"}
            id="daily-listening-count"
            name="listeningCount"
            defaultValue={listeningCount ?? ""}
          >
            <option value="">Theo tỉ lệ của bài</option>
            {Array.from({ length: 11 }, (_, count) => (
              <option key={count} value={count}>
                {count} câu nghe
              </option>
            ))}
          </select>
          <p className="muted">
            Câu nghe nằm trong tổng số câu mỗi ngày; ngân hàng cần có audio đã duyệt.
          </p>
          {availableListeningCount !== null && (
            <p className="muted" role="status">
              Nguồn bài đang sử dụng có {availableListeningCount} câu nghe.
              {listeningCount !== null && listeningCount > availableListeningCount
                ? " Chưa đủ số câu nghe đã cấu hình: hệ thống sẽ bù bằng câu thường cho đến khi bổ sung audio."
                : ""}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="daily-practice-lesson">Lấy câu từ</label>
          <select
            key={lessonId ?? "auto"}
            id="daily-practice-lesson"
            name="lessonId"
            defaultValue={lessonId ?? ""}
          >
            <option value="">Tự động: bài mới nhất đã mở có câu hỏi</option>
            {lessons.map((lesson) => (
              <option key={lesson.lessonId} value={lesson.lessonId}>
                {lesson.title}
                {lesson.isOpen ? "" : " (chưa mở)"}
              </option>
            ))}
          </select>
        </div>
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

// The full sizes say what they hold, since 53 and 67 look arbitrary beside 60 and 70.
function fullTestNote(count: number) {
  if (count === jlptFullDailySize("N4")) {
    return ` (đủ đề N4 + ${JLPT_DAILY_LISTENING} câu nghe)`;
  }
  return count === jlptFullDailySize("N5") ? ` (đủ đề N5 + ${JLPT_DAILY_LISTENING} câu nghe)` : "";
}

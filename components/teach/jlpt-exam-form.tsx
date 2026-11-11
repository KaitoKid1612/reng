"use client";

import { useActionState, useState } from "react";

import { publishJlptExamAction } from "@/app/actions/classes";
import { ActionFeedback } from "@/components/teach/action-feedback";
import { DateTimeField } from "@/components/teach/date-time-field";
import { Button } from "@/components/ui/button";
import {
  JLPT_LEVELS,
  JLPT_PRESETS,
  JLPT_SECTION_LABELS,
  JLPT_SECTIONS,
  MAX_EXAM_MINUTES,
  MIN_EXAM_MINUTES,
  planJlptExam,
} from "@/lib/jlpt";

import type { JlptLevel, JlptSection } from "@/lib/jlpt";

export interface JlptExamLessonOption {
  lessonId: string;
  title: string;
  sections: Record<JlptSection, number>;
  // An official test (JLPT workbook) is given whole, at the level it was written for.
  officialLevel: JlptLevel | null;
}

interface JlptExamFormProps {
  classId: string;
  lessons: JlptExamLessonOption[];
  defaultDueAt: string;
  defaultTitles: Record<JlptLevel, string>;
}

const SHORT_LABELS: Record<JlptSection, string> = {
  vocabulary: "chữ Hán – từ vựng",
  grammarReading: "ngữ pháp – đọc hiểu",
  listening: "nghe hiểu",
};

function classifiedCount(lesson: JlptExamLessonOption) {
  return JLPT_SECTIONS.reduce((total, section) => total + lesson.sections[section], 0);
}

export function JlptExamForm({ classId, lessons, defaultDueAt, defaultTitles }: JlptExamFormProps) {
  const [state, action, isPending] = useActionState(publishJlptExamAction, {});
  const typed = state.values;
  // The bank with the most questions that fit the exam's sections comes first.
  const bestLesson = [...lessons].sort((a, b) => classifiedCount(b) - classifiedCount(a))[0];
  const [level, setLevel] = useState<JlptLevel>(
    typed?.level === "N4" || typed?.level === "N5" ? typed.level : "N5",
  );
  const [chosenLessonId, setLessonId] = useState(typed?.lessonId ?? "");
  const [minutes, setMinutes] = useState(
    typed?.timeLimitMinutes ?? String(JLPT_PRESETS[level].minutes),
  );
  const [title, setTitle] = useState(typed?.title ?? defaultTitles[level]);
  const [feedbackPolicy, setFeedbackPolicy] = useState(typed?.feedbackPolicy ?? "after_submit");
  // The class's lessons change on this page (a bank added to the class above): a choice that is
  // not in the list any more, or none yet, falls back to the best bank.
  const lesson = lessons.find((item) => item.lessonId === chosenLessonId) ?? bestLesson;
  const lessonId = lesson?.lessonId ?? "";
  const isOfficial = Boolean(lesson?.officialLevel);
  let planned: Record<JlptSection, number> | null = null;
  if (lesson) {
    planned = isOfficial ? lesson.sections : planJlptExam(level, lesson.sections);
  }
  const plannedTotal = planned
    ? JLPT_SECTIONS.reduce((total, section) => total + planned[section], 0)
    : 0;

  function handleLevelChange(next: JlptLevel) {
    // The preset time and the default title follow the level unless the teacher typed their own.
    if (minutes === String(JLPT_PRESETS[level].minutes)) {
      setMinutes(String(JLPT_PRESETS[next].minutes));
    }
    if (title === defaultTitles[level]) {
      setTitle(defaultTitles[next]);
    }
    setLevel(next);
  }

  // An official test sets its own level and, unless the teacher typed a title, its own name.
  function handleLessonChange(nextId: string) {
    const next = lessons.find((item) => item.lessonId === nextId);
    const isDefaultTitle =
      title === defaultTitles[level] || lessons.some((item) => item.title === title);
    setLessonId(nextId);
    if (!next) {
      return;
    }
    const nextLevel = next.officialLevel ?? level;
    if (minutes === String(JLPT_PRESETS[level].minutes)) {
      setMinutes(String(JLPT_PRESETS[nextLevel].minutes));
    }
    if (isDefaultTitle) {
      setTitle(next.officialLevel ? next.title : defaultTitles[nextLevel]);
    }
    setLevel(nextLevel);
  }

  if (!lessons.length) {
    return (
      <p className="notice-panel">
        Lớp chưa có bài nào có câu luyện. Thêm ngân hàng ôn N5 hoặc N4 vào lớp ở mục Nội dung lớp,
        rồi quay lại tạo đề.
      </p>
    );
  }

  return (
    <form action={action} className="form-card">
      <input type="hidden" name="classId" value={classId} />
      <fieldset>
        <legend>Cấp độ</legend>
        <div className="option-row">
          {JLPT_LEVELS.map((item) => (
            <label key={item} className="choice-label">
              <input
                type="radio"
                name="level"
                value={item}
                checked={level === item}
                onChange={() => handleLevelChange(item)}
              />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="jlpt-lesson">Lấy câu từ</label>
          <select
            id="jlpt-lesson"
            name="lessonId"
            value={lessonId}
            onChange={(event) => handleLessonChange(event.target.value)}
            required
          >
            {lessons.map((item) => (
              <option key={item.lessonId} value={item.lessonId}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="jlpt-title">Tên đề</label>
          <input
            id="jlpt-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="jlpt-minutes">Thời gian làm bài (phút)</label>
          <input
            id="jlpt-minutes"
            name="timeLimitMinutes"
            type="number"
            min={MIN_EXAM_MINUTES}
            max={MAX_EXAM_MINUTES}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            aria-describedby="jlpt-minutes-hint"
            required
          />
          <p id="jlpt-minutes-hint" className="small muted">
            Đề thật: N5 90 phút, N4 115 phút. Đồng hồ của mỗi học viên chạy từ lúc bấm Bắt đầu thi.
          </p>
        </div>
        <DateTimeField
          id="jlpt-due"
          name="dueAt"
          label="Mở đến"
          initialValue={typed?.dueAt || defaultDueAt}
          isRequired
          hint="Học viên bắt đầu thi trước lúc này; lượt bắt đầu sát hạn sẽ kết thúc ở hạn."
        />
        <div className="field">
          <label htmlFor="jlpt-feedback">Công bố điểm và đáp án</label>
          <select
            id="jlpt-feedback"
            name="feedbackPolicy"
            value={feedbackPolicy}
            onChange={(event) => setFeedbackPolicy(event.target.value)}
          >
            <option value="after_submit">Ngay sau khi nộp</option>
            <option value="after_due">Sau hạn (cả lớp xem cùng lúc)</option>
          </select>
        </div>
      </div>
      {lesson && planned && (
        <div className="notice-panel" role="status">
          <p>
            {plannedTotal > 0
              ? `Đề gồm ${JLPT_SECTIONS.filter((section) => planned[section] > 0)
                  .map((section) => `${planned[section]} câu ${SHORT_LABELS[section]}`)
                  .join(", ")}: ${plannedTotal} câu, một lượt làm. ${
                  isOfficial
                    ? "Đề chính thức: lấy đủ mọi câu, đúng thứ tự trong sách."
                    : "Câu đã ra ở các đề trước của lớp được dùng sau cùng."
                }`
              : "Bài này chưa có câu nào xếp được vào phần thi JLPT. Chọn ngân hàng ôn N5 hoặc N4."}
          </p>
          {JLPT_SECTIONS.filter(
            (section) => !isOfficial && planned[section] < JLPT_PRESETS[level].quotas[section],
          ).map((section) => (
            <p key={section} className="small">
              {JLPT_SECTION_LABELS[section]}: bài chỉ có {lesson.sections[section]} câu, ít hơn{" "}
              {JLPT_PRESETS[level].quotas[section]} câu của đề {level}.
              {section === "listening" && planned.listening === 0
                ? " Không có câu nghe nên kết quả không ước tính được đỗ/trượt."
                : ""}
            </p>
          ))}
        </div>
      )}
      <div className="button-row">
        <Button type="submit" disabled={isPending || plannedTotal === 0}>
          {isPending ? "Đang tạo đề…" : "Giao đề thi thử"}
        </Button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

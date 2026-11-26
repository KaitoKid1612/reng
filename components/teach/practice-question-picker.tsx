"use client";

import { QUESTION_TYPE_LABELS } from "@/components/classroom/assignment-labels";
import { FuriganaText } from "@/components/lessons/japanese-text";
import { Button } from "@/components/ui/button";
import { MAX_ASSIGNMENT_QUESTIONS } from "@/lib/assignment";
import { groupQuestionsForPicking } from "@/lib/question-groups";

import type { AssignableLesson } from "@/components/teach/assignment-form";
import type { TeachingLanguageTag } from "@/lib/teaching-language";

type PickableQuestion = AssignableLesson["questions"][number];

// A starter lesson's 50 questions read well as one list; a bank of hundreds is picked by group,
// each group folded until the teacher opens it.
const GROUPED_FROM = 60;

interface PracticeQuestionPickerProps {
  questions: readonly PickableQuestion[];
  selectedIds: readonly string[];
  onSelectedIdsChange: (ids: string[]) => void;
  languageTag: TeachingLanguageTag;
  listeningCount: number;
  onPickListening: () => void;
}

export function PracticeQuestionPicker({
  questions,
  selectedIds,
  onSelectedIdsChange,
  languageTag,
  listeningCount,
  onPickListening,
}: PracticeQuestionPickerProps) {
  const selected = new Set(selectedIds);
  const promptLang = languageTag === "ja-JP" ? "ja" : "vi";
  const byId = new Map(questions.map((question) => [question.id, question]));
  const groups =
    questions.length >= GROUPED_FROM
      ? groupQuestionsForPicking(questions, (type) => QUESTION_TYPE_LABELS[type])
      : null;

  // The assignment keeps the lesson's question order, whatever order they were ticked in.
  function handleSelect(ids: readonly string[], isSelected: boolean) {
    const next = new Set(selected);
    for (const id of ids) {
      if (isSelected) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    onSelectedIdsChange(questions.filter((question) => next.has(question.id)).map(({ id }) => id));
  }

  function renderOption(question: PickableQuestion) {
    return (
      <label key={question.id} className="choice-option question-pick-option">
        <input
          type="checkbox"
          checked={selected.has(question.id)}
          onChange={(event) => handleSelect([question.id], event.target.checked)}
        />
        <span lang={promptLang}>
          <FuriganaText text={question.prompt} />
        </span>
        <span className="small muted">
          {QUESTION_TYPE_LABELS[question.type]}, {question.points} điểm
        </span>
      </label>
    );
  }

  return (
    <>
      {/* Stays in view while the list scrolls, so the count and the quick picks are always there. */}
      <div className="button-row question-pick-actions">
        {/* An assignment holds at most 70 questions; a larger bank is picked by group. */}
        {questions.length <= MAX_ASSIGNMENT_QUESTIONS && (
          <Button
            type="button"
            variant="outline"
            disabled={selectedIds.length === questions.length}
            onClick={() => onSelectedIdsChange(questions.map((question) => question.id))}
          >
            Chọn tất cả
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={selectedIds.length === 0}
          onClick={() => onSelectedIdsChange([])}
        >
          Bỏ chọn
        </Button>
        {listeningCount > 0 && (
          <Button type="button" variant="outline" onClick={onPickListening}>
            Chỉ chọn câu nghe ({listeningCount})
          </Button>
        )}
        <span className="small muted" aria-live="polite">
          Đã chọn {selectedIds.length}/{questions.length} câu
          {questions.length > MAX_ASSIGNMENT_QUESTIONS
            ? ` (mỗi bài giao tối đa ${MAX_ASSIGNMENT_QUESTIONS} câu)`
            : ""}
        </span>
      </div>
      {groups
        ? groups.map((group) => {
            const count = group.questionIds.filter((id) => selected.has(id)).length;
            const isAll = count === group.questionIds.length;
            return (
              <details key={group.key} className="question-group">
                <summary>
                  <span lang={group.lang}>{group.label}</span>{" "}
                  <span className="small muted">
                    {count ? `đã chọn ${count}/` : ""}
                    {group.questionIds.length} câu
                  </span>
                </summary>
                <div className="button-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isAll}
                    onClick={() => handleSelect(group.questionIds, true)}
                  >
                    Chọn cả nhóm
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={count === 0}
                    onClick={() => handleSelect(group.questionIds, false)}
                  >
                    Bỏ chọn cả nhóm
                  </Button>
                </div>
                {group.questionIds.flatMap((id) => {
                  const question = byId.get(id);
                  return question ? [renderOption(question)] : [];
                })}
              </details>
            );
          })
        : questions.map(renderOption)}
    </>
  );
}

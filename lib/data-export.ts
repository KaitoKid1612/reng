import {
  describeCorrectAnswer,
  describeRawAnswer,
  isFeedbackAvailable,
  toStoredRawAnswer,
} from "@/lib/assignment";

import type { AssignableQuestion, FeedbackRule } from "@/lib/assignment";

export interface ExportAnswerRow {
  question_id: string;
  raw: unknown;
  is_correct: boolean | null;
  points_earned: number | null;
}

export interface ExportAttemptInput {
  assignment: FeedbackRule & { title: string; mode: string };
  className: string;
  attempt: {
    attemptNo: number;
    status: "in_progress" | "submitted";
    startedAt: string;
    submittedAt: string | null;
    isLate: boolean | null;
    score: number | null;
    maxScore: number | null;
    passed: boolean | null;
  };
  // Loaded only for attempts whose results may be shown (canExportResults).
  questions: readonly AssignableQuestion[] | null;
  answers: readonly ExportAnswerRow[] | null;
}

export const HIDDEN_RESULTS_NOTE =
  "Kết quả hiện sau giờ giáo viên công bố; tải lại dữ liệu sau giờ đó để có câu trả lời và điểm.";
const IN_PROGRESS_NOTE = "Lượt đang làm dở, chưa nộp.";

// The same rule as the results page: nothing graded, not even the learner's own answers, leaves
// the server before the feedback time of a submitted attempt.
export function canExportResults(
  rule: FeedbackRule,
  attempt: Pick<ExportAttemptInput["attempt"], "status" | "submittedAt">,
  now: Date,
) {
  return attempt.status === "submitted" && isFeedbackAvailable(rule, attempt.submittedAt, now);
}

export function exportAttempt(input: ExportAttemptInput, now: Date) {
  const { assignment, attempt } = input;
  const base = {
    assignment: assignment.title,
    class: input.className,
    mode: assignment.mode,
    attempt: attempt.attemptNo,
    status: attempt.status,
    started_at: attempt.startedAt,
    submitted_at: attempt.submittedAt,
    is_late: attempt.isLate,
  };
  if (!canExportResults(assignment, attempt, now) || !input.questions) {
    return {
      ...base,
      results: null,
      note: attempt.status === "submitted" ? HIDDEN_RESULTS_NOTE : IN_PROGRESS_NOTE,
    };
  }
  const answers = input.answers ?? [];
  return {
    ...base,
    results: {
      score: attempt.score,
      max_score: attempt.maxScore,
      passed: attempt.passed,
      answers: input.questions.map((question) => {
        const answer = answers.find((row) => row.question_id === question.id);
        return {
          question: question.prompt,
          your_answer: describeRawAnswer(question, toStoredRawAnswer(answer?.raw)),
          correct_answer: describeCorrectAnswer(question),
          is_correct: answer?.is_correct ?? false,
          points_earned: answer?.points_earned ?? 0,
          points: question.points,
        };
      }),
    },
    note: null,
  };
}

// "reng-du-lieu-2026-11-12.json", by the Vietnam calendar day of the export.
export function exportFileName(day: string) {
  return `reng-du-lieu-${day}.json`;
}

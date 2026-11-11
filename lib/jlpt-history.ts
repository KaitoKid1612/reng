import { estimateJlptScore, scoreJlptSections } from "@/lib/jlpt";

import type { JlptEstimate, JlptLevel, JlptScoredItem, JlptSectionScore } from "@/lib/jlpt";

export interface JlptExamResult {
  assignmentId: string;
  title: string;
  level: JlptLevel;
  submittedAt: string;
  items: readonly JlptScoredItem[];
}

export interface JlptHistoryEntry {
  assignmentId: string;
  title: string;
  level: JlptLevel;
  submittedAt: string;
  sections: JlptSectionScore[];
  estimate: JlptEstimate | null;
  // Against the previous estimated exam of the same level; null for the first one.
  change: number | null;
}

/**
 * A learner's mock exams scored like each exam's result page (latest attempt, sections, the
 * 180-point estimate), newest first. Each total is compared with the exam taken before it at the
 * same level, so a learner preparing for N4 after N5 does not read the level change as progress.
 */
export function summarizeJlptHistory(results: readonly JlptExamResult[]): JlptHistoryEntry[] {
  const oldestFirst = [...results].sort(
    (first, second) => Date.parse(first.submittedAt) - Date.parse(second.submittedAt),
  );
  const lastTotal = new Map<JlptLevel, number>();
  const entries = oldestFirst.map((result): JlptHistoryEntry => {
    const sections = scoreJlptSections(result.items);
    const estimate = estimateJlptScore(result.level, sections);
    const previous = lastTotal.get(result.level);
    if (estimate) {
      lastTotal.set(result.level, estimate.total);
    }
    return {
      assignmentId: result.assignmentId,
      title: result.title,
      level: result.level,
      submittedAt: result.submittedAt,
      sections,
      estimate,
      change: estimate && previous !== undefined ? estimate.total - previous : null,
    };
  });
  return entries.reverse();
}

// The reason a mock exam falls short, in the order the JLPT applies its rules.
export function describeJlptOutcome(estimate: JlptEstimate | null) {
  if (!estimate) {
    return "Chưa ước tính được (đề thiếu phần nghe hiểu hoặc phần ngôn ngữ)";
  }
  if (estimate.isPassing) {
    return "Ước tính đỗ";
  }
  const reasons = [
    estimate.missesLanguageMinimum && "ngôn ngữ và đọc hiểu dưới điểm sàn",
    estimate.missesListeningMinimum && "nghe hiểu dưới điểm sàn",
    estimate.total < estimate.passMark && `tổng dưới ${estimate.passMark}`,
  ].filter(Boolean);
  return `Chưa đỗ: ${reasons.join(", ")}`;
}

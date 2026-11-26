import { formatStudyDateTime } from "@/lib/study-days";

import type { AssignableQuestion, AssignmentMode } from "@/lib/assignment";
import type { AssignmentStatus } from "@/lib/server/learner";

export const MODE_LABELS: Record<AssignmentMode, string> = {
  practice: "Luyện tập",
  test: "Kiểm tra",
};

interface KindSource {
  mode: AssignmentMode;
  exam?: { level: string; timeLimitMinutes: number } | null;
}

/** "Thi thử JLPT N5 (90 phút)" for a mock exam, otherwise practice or test. */
export function describeAssignmentKind(assignment: KindSource) {
  return assignment.exam
    ? `Thi thử JLPT ${assignment.exam.level} (${assignment.exam.timeLimitMinutes} phút)`
    : MODE_LABELS[assignment.mode];
}

export const QUESTION_TYPE_LABELS: Record<AssignableQuestion["type"], string> = {
  choice: "trắc nghiệm",
  fill: "điền từ",
  listen: "nghe",
  dictation: "chính tả",
  order: "sắp xếp câu",
  match: "ghép đôi",
};

const STATUS_LABELS: Record<AssignmentStatus, { label: string; tone: string }> = {
  not_available: { label: "Chưa mở", tone: "status-neutral" },
  not_started: { label: "Chưa làm", tone: "status-neutral" },
  in_progress: { label: "Đang làm", tone: "status-attention" },
  submitted: { label: "Đã nộp", tone: "status-correct" },
  past_due: { label: "Quá hạn", tone: "status-wrong" },
  closed: { label: "Đã đóng", tone: "status-neutral" },
};

interface AssignmentStatusBadgeProps {
  status: AssignmentStatus;
}

export function AssignmentStatusBadge({ status }: AssignmentStatusBadgeProps) {
  const { label, tone } = STATUS_LABELS[status];
  return <span className={`status-badge ${tone}`}>{label}</span>;
}

interface WorkStatusBadgeProps extends AssignmentStatusBadgeProps {
  // Attempts left on a practice handed in below the pass mark (0 for everything else).
  retriesLeft: number;
}

// A practice handed in below the pass mark with attempts left is still work to do: it says so
// instead of a green "Đã nộp", which reads as finished.
export function WorkStatusBadge({ status, retriesLeft }: WorkStatusBadgeProps) {
  if (retriesLeft > 0) {
    return <span className="status-badge status-attention">Chưa đạt</span>;
  }
  return <AssignmentStatusBadge status={status} />;
}

export function describeWorkAction(status: AssignmentStatus, retriesLeft: number) {
  if (retriesLeft > 0) {
    return `Làm lại (còn ${retriesLeft} lượt)`;
  }
  return status === "in_progress" ? "Làm tiếp" : "Làm bài";
}

// A label that continues a sentence starts in lower case: "Luyện tập, không có hạn nộp".
export function inSentence(label: string) {
  return label.charAt(0).toLocaleLowerCase("vi") + label.slice(1);
}

export function describeDue(dueAt: string | null) {
  return dueAt ? `Hạn ${formatStudyDateTime(dueAt)}` : "Không có hạn nộp";
}

// For work the learner can still do: past the deadline means it will count as late, not that
// the chance is gone.
export function describeOpenDue(dueAt: string | null, now: Date) {
  if (dueAt && Date.parse(dueAt) <= now.getTime()) {
    return `Quá hạn từ ${formatStudyDateTime(dueAt)}, vẫn nộp được`;
  }
  return describeDue(dueAt);
}

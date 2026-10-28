import { formatStudyDateTime } from "@/lib/study-days";

import type { AssignmentMode } from "@/lib/assignment";
import type { AssignmentStatus } from "@/lib/server/learner";

export const MODE_LABELS: Record<AssignmentMode, string> = {
  practice: "Luyện tập",
  test: "Kiểm tra",
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

export function describeDue(dueAt: string | null) {
  return dueAt ? `Hạn ${formatStudyDateTime(dueAt)}` : "Không có hạn nộp";
}

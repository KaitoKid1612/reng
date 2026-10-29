export const TEACHER_STATUS_LABELS = {
  pending: "Chờ duyệt",
  active: "Đang dạy",
  suspended: "Tạm dừng",
} as const;

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "teacher.requested": "Gửi yêu cầu giảng dạy",
  "teacher.activated": "Tự kích hoạt giảng dạy",
  "admin.teacher.active": "Quản trị viên mở quyền dạy",
  "admin.teacher.suspended": "Quản trị viên tạm dừng giáo viên",
  "admin.teacher.plan": "Cập nhật hạn thuê/ghi chú",
  "admin.approval.on": "Bật duyệt giáo viên mới",
  "admin.approval.off": "Tắt duyệt giáo viên mới",
  "lesson.visibility.public": "Đặt bài công khai",
  "lesson.visibility.class": "Đặt bài riêng cho lớp",
  "lesson.questions_reviewed": "Xác nhận đáp án",
  "lesson.share_attempt": "Thử chia sẻ bài",
  "lesson.shared.view": "Chia sẻ bài (chỉ xem)",
  "lesson.shared.copy": "Chia sẻ bài (được sao chép)",
  "lesson.share_revoked": "Thu hồi chia sẻ",
  "lesson.copied": "Sao chép bài",
};

export function describeAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

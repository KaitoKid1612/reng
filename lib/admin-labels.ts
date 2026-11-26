const TEACHER_STATUS_LABELS = {
  pending: "Chờ duyệt",
  active: "Đang dạy",
  suspended: "Tạm dừng",
} as const;

// A rejected request is stored as suspended; it was never activated, unlike a paused teacher.
export function teacherStatusLabel(
  status: keyof typeof TEACHER_STATUS_LABELS,
  activatedAt: string | null,
) {
  return status === "suspended" && !activatedAt ? "Đã từ chối" : TEACHER_STATUS_LABELS[status];
}

// What an admin's status change did, named at the top of the list: the changed row moves to its
// new group, often far down the page.
export const TEACHER_STATUS_OUTCOMES = ["approved", "reopened", "rejected", "paused"] as const;

export type TeacherStatusOutcome = (typeof TEACHER_STATUS_OUTCOMES)[number];

export function describeTeacherStatusOutcome(outcome: TeacherStatusOutcome, name: string) {
  switch (outcome) {
    case "approved":
      return `Đã duyệt ${name}. Reng không gửi thư báo, bạn nhắn để giáo viên biết và bắt đầu tạo lớp.`;
    case "reopened":
      return `Đã mở lại quyền dạy cho ${name}.`;
    case "rejected":
      return `Đã từ chối yêu cầu của ${name}. Người này vẫn học được như học viên.`;
    case "paused":
      return `Đã tạm dừng quyền dạy của ${name}. Lớp, bài học và điểm vẫn được giữ.`;
  }
}

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
  // Written both when a lesson is made from a starter and when a shared lesson is copied.
  "lesson.copied": "Tạo bài từ mẫu hoặc bản sao",
  "lesson.answer_variants_corrected": "Sửa đáp án tương đương của bài",
  "lesson.answer_positions_spread": "Đổi vị trí đáp án đúng trong ngân hàng",
  "lesson.kanji_normalized": "Chuẩn hóa chữ Hán trong từ vựng",
  "answer.variant_accepted": "Chấp nhận câu trả lời tương đương",
  "answer.reviewed_correct": "Chấm lại câu trả lời thành đúng",
  "assignment.question_fixed": "Sửa câu của bài đã giao",
  "account.anonymized": "Học viên tự xóa tài khoản",
};

export function describeAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

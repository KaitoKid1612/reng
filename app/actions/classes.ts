"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { classSessionInputSchema, isFutureSession } from "@/lib/class-sessions";
import { classSettingsSchema } from "@/lib/class-settings";
import {
  MAX_DAILY_PRACTICE_SIZE,
  MIN_DAILY_PRACTICE_SIZE,
  toVietnamDate,
} from "@/lib/daily-practice";
import { signInPath } from "@/lib/auth-paths";
import { isJoinCode, normalizeJoinCode } from "@/lib/join-code";
import { getCurrentAccount } from "@/lib/server/account";
import { acceptAnswerVariant } from "@/lib/server/answer-variants";
import { closeAssignment, publishAssignment } from "@/lib/server/assignments";
import { deleteClassSession, recordClassSession } from "@/lib/server/class-sessions";
import { createTodayPractice, setDailyPractice } from "@/lib/server/daily-practice";
import {
  createClass,
  joinClass,
  rotateJoinCode,
  setClassLesson,
  setJoinEnabled,
  updateClassSettings,
} from "@/lib/server/classes";
import { ServiceError } from "@/lib/server/supabase";

import type { PublishAssignmentInput } from "@/lib/server/assignments";

export interface ActionState {
  error?: string;
  notice?: string;
}

const GENERIC_ERROR = "Chưa lưu được thay đổi. Bạn thử lại nhé.";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Không tìm thấy lớp hoặc bài này trong tài khoản của bạn.",
  revision_conflict: "Cài đặt lớp đã đổi ở tab khác. Tải lại trang trước khi sửa tiếp.",
  capacity_below_members: "Sức chứa không thể thấp hơn số học viên đang học.",
  class_not_found: "Không tìm thấy lớp đang hoạt động của bạn.",
  lesson_not_found: "Bài học không thuộc tài khoản của bạn hoặc đã lưu trữ.",
  version_not_found: "Phiên bản không thuộc bài học đã chọn.",
  order_taken: "Thứ tự này đã có bài khác trong lớp. Chọn số khác.",
  duplicate: "Thứ tự này đã có bài khác trong lớp. Chọn số khác.",
  lesson_not_in_class: "Thêm bài học vào lớp trước khi giao bài.",
  due_in_past: "Hạn nộp phải ở sau thời điểm hiện tại.",
  invalid_items: "Chọn ít nhất một câu hỏi hợp lệ (tối đa 60 câu).",
  assignment_not_found: "Bài giao không còn mở để đóng.",
  not_typed: "Chỉ chấp nhận thêm được câu trả lời gõ chữ (câu điền, nghe gõ, chính tả).",
  already_correct: "Câu trả lời này đã được tính đúng.",
  invalid_answer: "Câu trả lời trống hoặc quá dài nên không chấp nhận thêm được.",
  kanji_required: "Câu này bắt buộc viết kanji nên không nhận câu trả lời thiếu kanji.",
};

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function describeError(error: unknown) {
  if (error instanceof ServiceError) {
    return ERROR_MESSAGES[error.code] ?? GENERIC_ERROR;
  }
  if (error instanceof z.ZodError) {
    return "Thông tin chưa hợp lệ. Kiểm tra lại các trường đã nhập.";
  }
  return GENERIC_ERROR;
}

async function requireTeacherAction() {
  const account = await getCurrentAccount();
  return account?.role === "teacher" ? account : null;
}

const JOIN_MESSAGES: Record<string, string> = {
  invalid_code: "Mã lớp không đúng hoặc đã ngừng nhận học viên. Kiểm tra lại với giảng viên.",
  rate_limited: "Bạn đã nhập sai nhiều lần. Đợi 15 phút rồi thử lại.",
  not_found: "Không tìm thấy tài khoản đang hoạt động.",
  class_full: "Lớp đã đủ số học viên. Liên hệ giáo viên để được hỗ trợ.",
  own_class:
    "Đây là lớp bạn đang dạy nên không vào được với vai học viên. Muốn tự luyện, hãy tạo một lớp tự học ở trang Lớp học.",
};

export async function joinClassAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const code = normalizeJoinCode(readField(formData, "code"));
  const account = await getCurrentAccount();
  if (!account) {
    redirect(signInPath(`/join-class?code=${encodeURIComponent(code)}`));
  }
  // The message for a malformed code matches an unknown code so nothing is revealed.
  if (!isJoinCode(code)) {
    return { error: JOIN_MESSAGES.invalid_code };
  }
  let classId: string | null;
  try {
    const result = await joinClass(account.id, code);
    if (result.status !== "joined" && result.status !== "already_member") {
      return { error: JOIN_MESSAGES[result.status] };
    }
    classId = result.class_id;
  } catch {
    return { error: GENERIC_ERROR };
  }
  redirect(classId ? `/classes/${classId}` : "/classes");
}

export async function createClassAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  let classId: string;
  try {
    const settings = classSettingsSchema.parse({
      name: readField(formData, "name"),
      capacity: readField(formData, "capacity"),
      meetingUrl: readField(formData, "meetingUrl"),
      languageTag: readField(formData, "languageTag"),
      passScore: readField(formData, "passScore") || "70",
    });
    classId = await createClass(account.id, settings, readField(formData, "selfStudy") === "on");
  } catch (error) {
    return { error: describeError(error) };
  }
  redirect(`/teach/classes/${classId}`);
}

export async function updateClassAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  try {
    const settings = classSettingsSchema.parse({
      name: readField(formData, "name"),
      capacity: readField(formData, "capacity"),
      meetingUrl: readField(formData, "meetingUrl"),
      languageTag: readField(formData, "languageTag"),
      passScore: readField(formData, "passScore"),
    });
    await updateClassSettings(account.id, readField(formData, "classId"), {
      ...settings,
      active: readField(formData, "active") === "on",
      revision: z.coerce.number().int().nonnegative().parse(readField(formData, "revision")),
    });
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return { notice: "Đã lưu cài đặt lớp." };
}

export async function joinCodeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  const classId = readField(formData, "classId");
  const operation = readField(formData, "operation");
  try {
    if (operation === "rotate") {
      await rotateJoinCode(account.id, classId);
    } else {
      await setJoinEnabled(account.id, classId, operation === "enable");
    }
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return {
    notice:
      operation === "rotate"
        ? "Đã đổi mã lớp. Mã cũ không dùng được nữa."
        : "Đã cập nhật trạng thái nhận học viên.",
  };
}

const dailySizeSchema = z
  .string()
  .transform((value) => (value ? Number(value) : null))
  .pipe(
    z.union([z.null(), z.number().int().min(MIN_DAILY_PRACTICE_SIZE).max(MAX_DAILY_PRACTICE_SIZE)]),
  );

const dailyLessonSchema = z
  .string()
  .max(100)
  .transform((value) => value || null);

const TODAY_ERRORS = {
  disabled: "Chọn số câu và bấm Lưu trước khi giao bài hôm nay.",
  no_lesson: "Lớp chưa có bài học nào đang mở. Thêm bài vào lớp trước.",
  no_questions: "Các bài đang mở của lớp chưa có câu trắc nghiệm hoặc điền từ.",
} as const;

export async function dailyPracticeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  const classId = readField(formData, "classId");
  if (readField(formData, "operation") === "today") {
    try {
      const outcome = await createTodayPractice(account.id, classId, new Date());
      if (outcome.status !== "created" && outcome.status !== "exists") {
        return { error: TODAY_ERRORS[outcome.status] };
      }
      refresh();
      return {
        notice:
          outcome.status === "created"
            ? `Đã giao bài luyện hôm nay (${outcome.questionCount} câu). Học viên thấy ngay trong lớp.`
            : `Hôm nay lớp đã có bài luyện (${outcome.questionCount} câu).`,
      };
    } catch (error) {
      return { error: describeError(error) };
    }
  }
  let size: number | null;
  try {
    size = dailySizeSchema.parse(readField(formData, "size"));
    const lessonId = dailyLessonSchema.parse(readField(formData, "lessonId"));
    await setDailyPractice(account.id, classId, size, lessonId);
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return {
    notice: size
      ? `Đã bật: mỗi sáng 6:00 Reng tự giao ${size} câu luyện tập.`
      : "Đã tắt bài luyện hằng ngày. Bài đã giao vẫn giữ nguyên.",
  };
}

const classLessonSchema = z.object({
  classId: z.uuid(),
  lessonId: z.string().min(1).max(100),
  versionId: z.uuid(),
  orderNo: z.coerce.number().int().min(1).max(500),
  availableAt: z.iso.datetime({ offset: true }),
});

export async function setClassLessonAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  try {
    await setClassLesson(
      account.id,
      classLessonSchema.parse({
        classId: readField(formData, "classId"),
        lessonId: readField(formData, "lessonId"),
        versionId: readField(formData, "versionId"),
        orderNo: readField(formData, "orderNo"),
        availableAt: readField(formData, "availableAt"),
      }),
    );
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return { notice: "Đã cập nhật nội dung lớp." };
}

export async function publishAssignmentAction(input: PublishAssignmentInput): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  try {
    await publishAssignment(account.id, input);
  } catch (error) {
    return { error: describeError(error) };
  }
  redirect(`/teach/classes/${input.classId}`);
}

export async function acceptAnswerAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  let result;
  try {
    result = await acceptAnswerVariant(account.id, {
      classId: readField(formData, "classId"),
      studentId: readField(formData, "studentId"),
      assignmentId: readField(formData, "assignmentId"),
      questionId: readField(formData, "questionId"),
    });
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  const later = result.isPractice
    ? " Các bài luyện sau từ cùng bài học cũng chấp nhận câu trả lời này."
    : "";
  return {
    notice: `Đã chấp nhận “${result.variant}”: ${result.regraded} bài làm được cộng điểm.${later}`,
  };
}

export async function closeAssignmentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  try {
    await closeAssignment(account.id, readField(formData, "assignmentId"));
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return { notice: "Đã đóng bài. Học viên không bắt đầu hoặc nộp thêm được." };
}

export async function classSessionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await requireTeacherAction();
  if (!account) {
    return { error: ERROR_MESSAGES.not_found };
  }
  if (readField(formData, "operation") === "delete") {
    try {
      await deleteClassSession(
        account.id,
        readField(formData, "classId"),
        readField(formData, "sessionId"),
      );
    } catch (error) {
      return { error: describeError(error) };
    }
    refresh();
    return { notice: "Đã xóa buổi dạy khỏi nhật ký." };
  }
  try {
    const input = classSessionInputSchema.parse({
      classId: readField(formData, "classId"),
      taughtOn: readField(formData, "taughtOn"),
      lessonId: readField(formData, "lessonId"),
      slideReached: readField(formData, "slideReached"),
      notes: readField(formData, "notes"),
    });
    if (isFutureSession(input.taughtOn, toVietnamDate(new Date()))) {
      return { error: "Ngày dạy không được ở sau hôm nay." };
    }
    await recordClassSession(account.id, input);
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return { notice: "Đã ghi buổi dạy vào nhật ký." };
}

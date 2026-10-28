"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { signInPath } from "@/lib/auth-paths";
import { isJoinCode, normalizeJoinCode } from "@/lib/join-code";
import { getCurrentAccount } from "@/lib/server/account";
import { closeAssignment, publishAssignment } from "@/lib/server/assignments";
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
  class_not_found: "Không tìm thấy lớp đang hoạt động của bạn.",
  lesson_not_found: "Bài học không thuộc tài khoản của bạn hoặc đã lưu trữ.",
  version_not_found: "Phiên bản không thuộc bài học đã chọn.",
  order_taken: "Thứ tự này đã có bài khác trong lớp. Chọn số khác.",
  duplicate: "Thứ tự này đã có bài khác trong lớp. Chọn số khác.",
  lesson_not_in_class: "Thêm bài học vào lớp trước khi giao bài.",
  due_in_past: "Hạn nộp phải ở sau thời điểm hiện tại.",
  invalid_items: "Chọn ít nhất một câu hỏi hợp lệ (tối đa 50 câu).",
  assignment_not_found: "Bài giao không còn mở để đóng.",
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
  not_student: "Tài khoản giảng viên không vào lớp như học viên.",
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

const classSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  passScore: z.coerce.number().int().min(0).max(100),
});

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
      passScore: readField(formData, "passScore") || "70",
    });
    classId = await createClass(account.id, settings.name, settings.passScore);
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
      passScore: readField(formData, "passScore"),
    });
    await updateClassSettings(account.id, readField(formData, "classId"), {
      ...settings,
      active: readField(formData, "active") === "on",
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

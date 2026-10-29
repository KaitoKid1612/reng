"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import {
  copySharedLesson,
  duplicateLesson,
  revokeLessonShare,
  SHARE_PERMISSIONS,
  shareLessonVersion,
} from "@/lib/server/lesson-sharing";
import { lessonIdSchema } from "@/lib/server/lessons";
import { ServiceError } from "@/lib/server/supabase";

export interface SharingActionState {
  error?: string;
  notice?: string;
}

const NOT_FOUND = "Không tìm thấy bài hoặc quyền chia sẻ này trong tài khoản của bạn.";
const FAILURE = "Chưa thực hiện được. Kiểm tra kết nối rồi thử lại.";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: NOT_FOUND,
  version_not_found: "Phiên bản không thuộc bài này. Tải lại trang rồi chọn lại.",
  reshare_not_allowed: "Bài sao chép từ giáo viên khác chưa được chia sẻ tiếp.",
  quota_exceeded: "Tài khoản đã đạt giới hạn số bài. Lưu trữ bớt bài cũ rồi thử lại.",
  request_conflict: "Yêu cầu này đã được gửi với nội dung khác. Tải lại trang rồi thử lại.",
};

function describeError(error: unknown) {
  return error instanceof ServiceError ? (ERROR_MESSAGES[error.code] ?? FAILURE) : FAILURE;
}

async function requireTeacherId() {
  const account = await getCurrentAccount();
  return account?.role === "teacher" ? account.id : null;
}

const shareSchema = z.object({
  lessonId: lessonIdSchema,
  versionId: z.uuid(),
  email: z.email().max(320),
  permission: z.enum(SHARE_PERMISSIONS),
});

export async function shareLessonAction(
  _state: SharingActionState,
  formData: FormData,
): Promise<SharingActionState> {
  const teacherId = await requireTeacherId();
  const parsed = shareSchema.safeParse({
    lessonId: formData.get("lessonId"),
    versionId: formData.get("versionId"),
    email: String(formData.get("email") ?? "").trim(),
    permission: formData.get("permission"),
  });
  if (!teacherId) {
    return { error: NOT_FOUND };
  }
  if (!parsed.success) {
    return { error: "Chọn phiên bản, quyền và nhập email hợp lệ của giáo viên nhận." };
  }
  if (parsed.data.permission === "copy" && formData.get("acknowledgeCopy") !== "on") {
    return { error: "Xác nhận bạn đã hiểu bản sao không bị thu hồi trước khi cho phép sao chép." };
  }
  try {
    const status = await shareLessonVersion(
      teacherId,
      parsed.data.lessonId,
      parsed.data.versionId,
      parsed.data.email,
      parsed.data.permission,
    );
    if (status === "recipient_not_found") {
      return {
        error: "Không chia sẻ được. Người nhận cần là giáo viên khác đã kích hoạt giảng dạy.",
      };
    }
    if (status === "rate_limited") {
      return { error: "Bạn đã thử chia sẻ quá nhiều lần trong một giờ. Thử lại sau nhé." };
    }
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return { notice: "Đã chia sẻ phiên bản cho giáo viên nhận." };
}

const revokeSchema = z.object({ shareId: z.uuid() });

export async function revokeShareAction(
  _state: SharingActionState,
  formData: FormData,
): Promise<SharingActionState> {
  const teacherId = await requireTeacherId();
  const parsed = revokeSchema.safeParse({ shareId: formData.get("shareId") });
  if (!teacherId || !parsed.success) {
    return { error: NOT_FOUND };
  }
  try {
    await revokeLessonShare(teacherId, parsed.data.shareId);
  } catch (error) {
    return { error: describeError(error) };
  }
  refresh();
  return { notice: "Đã thu hồi quyền. Bản sao đã tạo trước đó vẫn thuộc người nhận." };
}

const copySchema = z.object({ shareId: z.uuid(), requestId: z.uuid() });

export async function copySharedLessonAction(
  _state: SharingActionState,
  formData: FormData,
): Promise<SharingActionState> {
  const teacherId = await requireTeacherId();
  const parsed = copySchema.safeParse({
    shareId: formData.get("shareId"),
    requestId: formData.get("requestId"),
  });
  if (!teacherId || !parsed.success) {
    return { error: NOT_FOUND };
  }
  let lessonId: string;
  try {
    lessonId = await copySharedLesson(teacherId, parsed.data.shareId, parsed.data.requestId);
  } catch (error) {
    return { error: describeError(error) };
  }
  redirect(`/teach/lessons/${lessonId}/edit`);
}

const duplicateSchema = z.object({ lessonId: lessonIdSchema, requestId: z.uuid() });

export async function duplicateLessonAction(
  _state: SharingActionState,
  formData: FormData,
): Promise<SharingActionState> {
  const teacherId = await requireTeacherId();
  const parsed = duplicateSchema.safeParse({
    lessonId: formData.get("lessonId"),
    requestId: formData.get("requestId"),
  });
  if (!teacherId || !parsed.success) {
    return { error: NOT_FOUND };
  }
  let lessonId: string;
  try {
    lessonId = await duplicateLesson(teacherId, parsed.data.lessonId, parsed.data.requestId);
  } catch (error) {
    return { error: describeError(error) };
  }
  redirect(`/teach/lessons/${lessonId}/edit`);
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { callRpc, ServiceError } from "@/lib/server/supabase";

export interface TeacherActivationState {
  error?: string;
  notice?: string;
}

export async function activateTeacherAction(
  _state: TeacherActivationState,
  formData: FormData,
): Promise<TeacherActivationState> {
  const account = await getCurrentAccount();
  if (!account) {
    redirect("/sign-in?next=/teach/start");
  }
  if (formData.get("acceptTerms") !== "on") {
    return { error: "Xác nhận trách nhiệm nội dung và quyền sử dụng tài liệu trước khi tiếp tục." };
  }
  let status: "active" | "pending";
  try {
    status = await callRpc(
      "activate_teacher",
      { p_user_id: account.id, p_terms_version: "2026-10-29" },
      z.enum(["active", "pending"]),
    );
  } catch (error) {
    if (error instanceof ServiceError && error.code === "email_unverified") {
      return { error: "Bạn cần xác minh email trước khi kích hoạt giảng dạy." };
    }
    if (error instanceof ServiceError && error.code === "teacher_suspended") {
      return { error: "Quyền giảng dạy đang tạm dừng. Liên hệ quản trị viên để được hỗ trợ." };
    }
    return { error: "Chưa kích hoạt được giảng dạy. Bạn thử lại sau nhé." };
  }
  if (status === "pending") {
    return {
      notice: "Đã gửi yêu cầu. Quản trị viên sẽ mở quyền dạy sau khi xác nhận với bạn.",
    };
  }
  redirect("/teach");
}

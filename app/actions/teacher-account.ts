"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { callRpc, ServiceError } from "@/lib/server/supabase";

export interface TeacherActivationState {
  error?: string;
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
  try {
    await callRpc(
      "activate_teacher",
      { p_user_id: account.id, p_terms_version: "2026-10-29" },
      z.literal("active"),
    );
  } catch (error) {
    if (error instanceof ServiceError && error.code === "email_unverified") {
      return { error: "Bạn cần xác minh email trước khi kích hoạt giảng dạy." };
    }
    if (error instanceof ServiceError && error.code === "teacher_suspended") {
      return { error: "Quyền giảng dạy đang tạm dừng. Liên hệ người vận hành để được hỗ trợ." };
    }
    return { error: "Chưa kích hoạt được giảng dạy. Bạn thử lại sau nhé." };
  }
  redirect("/teach");
}

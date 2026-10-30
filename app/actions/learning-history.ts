"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { callRpc } from "@/lib/server/supabase";

export interface LinkHistoryState {
  error?: string;
  notice?: string;
}

export async function linkHistoryAccount(
  _state: LinkHistoryState,
  formData: FormData,
): Promise<LinkHistoryState> {
  const account = await getCurrentAccount();
  const id = z.uuid().safeParse(formData.get("archiveId"));
  if (!account || account.role !== "teacher" || !id.success) {
    return { error: "Không tìm thấy lịch sử thuộc quyền quản lý của bạn." };
  }
  try {
    const status = await callRpc(
      "link_learning_history",
      { p_teacher_id: account.id, p_archive_id: id.data },
      z.enum(["linked", "already_linked", "account_not_ready"]),
    );
    if (status === "account_not_ready") {
      return {
        notice:
          "Học viên cần đăng ký và xác nhận đúng email đã chỉ định trước. Sau khi xác nhận đúng học viên, bạn bấm liên kết lại.",
      };
    }
    refresh();
    return { notice: "Đã liên kết lịch sử. Học viên chỉ xem được phần của mình." };
  } catch {
    return { error: "Chưa liên kết được. Kiểm tra lại tài khoản học viên hoặc thử lại sau." };
  }
}

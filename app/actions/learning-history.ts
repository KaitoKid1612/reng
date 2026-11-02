"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { findHistoryLinkCandidate } from "@/lib/server/learning-history";
import { callRpc } from "@/lib/server/supabase";

import type { HistoryLinkCandidate } from "@/lib/server/learning-history";

export interface LinkHistoryState {
  error?: string;
  notice?: string;
  candidate?: HistoryLinkCandidate;
}

const NOT_YOURS = "Không tìm thấy lịch sử thuộc quyền quản lý của bạn.";
const NO_ACCOUNT =
  "Chưa có tài khoản nào đăng ký bằng email đã chỉ định. Nhờ học viên đăng ký đúng email rồi kiểm tra lại.";

// Linking takes two steps: the teacher first sees which account registered the expected email,
// confirms it with the learner, then links exactly that account.
export async function linkHistoryAccount(
  _state: LinkHistoryState,
  formData: FormData,
): Promise<LinkHistoryState> {
  const account = await getCurrentAccount();
  const id = z.uuid().safeParse(formData.get("archiveId"));
  if (!account || account.role !== "teacher" || !id.success) {
    return { error: NOT_YOURS };
  }
  let candidate: HistoryLinkCandidate | null;
  try {
    candidate = await findHistoryLinkCandidate(account.id, id.data);
  } catch {
    return { error: NOT_YOURS };
  }
  if (!candidate) {
    return { notice: NO_ACCOUNT };
  }
  if (formData.get("operation") !== "link") {
    return { candidate };
  }
  if (formData.get("candidateId") !== candidate.id || formData.get("confirmed") !== "on") {
    return {
      candidate,
      error:
        "Tài khoản đăng ký email này vừa thay đổi. Kiểm tra lại thông tin bên dưới rồi xác nhận.",
    };
  }
  try {
    const status = await callRpc(
      "link_learning_history",
      { p_teacher_id: account.id, p_archive_id: id.data },
      z.enum(["linked", "already_linked", "account_not_ready"]),
    );
    if (status === "account_not_ready") {
      return {
        candidate,
        notice: "Học viên cần xác nhận email trước. Sau khi học viên xác nhận, bấm liên kết lại.",
      };
    }
    refresh();
    return { notice: "Đã liên kết lịch sử. Học viên chỉ xem được phần của mình." };
  } catch {
    return { error: "Chưa liên kết được. Kiểm tra lại tài khoản học viên hoặc thử lại sau." };
  }
}

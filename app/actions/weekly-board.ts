"use server";

import { refresh } from "next/cache";

import { getCurrentAccount } from "@/lib/server/account";
import { setClassWeeklyBoard, setHiddenFromBoard } from "@/lib/server/weekly-board";

import type { ActionState } from "@/app/actions/classes";

const FAILED = "Chưa lưu được. Kiểm tra kết nối rồi thử lại.";

/** "Đưa lớp vào bảng tuần" on the teacher's class page. */
export async function weeklyBoardAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await getCurrentAccount();
  if (account?.role !== "teacher") {
    return { error: "Chỉ chủ lớp đổi được cài đặt này." };
  }
  const enabled = formData.get("enabled") === "on";
  try {
    await setClassWeeklyBoard(account.id, String(formData.get("classId") ?? ""), enabled);
  } catch {
    return { error: FAILED };
  }
  refresh();
  return {
    notice: enabled
      ? "Lớp đã vào bảng tuần. Học viên thấy bảng ở trang Tiến độ."
      : "Lớp đã rời bảng tuần.",
  };
}

/** "Ẩn tôi khỏi bảng tuần" in the account settings. */
export async function boardVisibilityAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const account = await getCurrentAccount();
  if (!account) {
    return { error: "Đăng nhập lại rồi thử lại." };
  }
  const hidden = formData.get("hidden") === "on";
  try {
    await setHiddenFromBoard(account.id, hidden);
  } catch {
    return { error: FAILED };
  }
  refresh();
  return {
    notice: hidden
      ? "Đã ẩn bạn khỏi bảng tuần. Chỉ bạn còn thấy điểm của mình."
      : "Bạn đã hiện lại trên bảng tuần.",
  };
}

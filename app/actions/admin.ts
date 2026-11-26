"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { TEACHER_STATUS_OUTCOMES } from "@/lib/admin-labels";
import { getCurrentAccount } from "@/lib/server/account";
import {
  isPlatformAdmin,
  setTeacherApproval,
  setTeacherStatus,
  updateTeacherPlan,
} from "@/lib/server/admin";

export interface AdminActionState {
  error?: string;
  notice?: string;
}

const DENIED = "Bạn không có quyền quản trị cho thao tác này.";
const FAILURE = "Chưa lưu được thay đổi. Thử lại sau nhé.";

// Every action re-checks the caller; the console page check alone is not trusted.
async function requireAdminId() {
  const account = await getCurrentAccount();
  if (!account || !(await isPlatformAdmin(account.id))) {
    return null;
  }
  return account.id;
}

// The outcome names the change, so the new status follows from it and cannot disagree with it.
const statusSchema = z.object({ userId: z.uuid(), outcome: z.enum(TEACHER_STATUS_OUTCOMES) });

export async function setTeacherStatusAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminId = await requireAdminId();
  const parsed = statusSchema.safeParse({
    userId: formData.get("userId"),
    outcome: formData.get("outcome"),
  });
  if (!adminId || !parsed.success) {
    return { error: DENIED };
  }
  const { outcome } = parsed.data;
  const status = outcome === "approved" || outcome === "reopened" ? "active" : "suspended";
  try {
    await setTeacherStatus(adminId, parsed.data.userId, status);
  } catch {
    return { error: FAILURE };
  }
  const query = new URLSearchParams({ changed: parsed.data.userId, outcome });
  redirect(`/admin/teachers?${query.toString()}`);
}

const planSchema = z.object({
  userId: z.uuid(),
  accessUntil: z.union([z.literal(""), z.iso.date()]),
  note: z.string().trim().max(500),
});

export async function updateTeacherPlanAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminId = await requireAdminId();
  const parsed = planSchema.safeParse({
    userId: formData.get("userId"),
    accessUntil: formData.get("accessUntil") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!adminId) {
    return { error: DENIED };
  }
  if (!parsed.success) {
    return { error: "Ngày hết hạn hoặc ghi chú (tối đa 500 ký tự) chưa hợp lệ." };
  }
  try {
    await updateTeacherPlan(
      adminId,
      parsed.data.userId,
      parsed.data.accessUntil || null,
      parsed.data.note,
    );
  } catch {
    return { error: FAILURE };
  }
  refresh();
  return { notice: "Đã lưu hạn thuê và ghi chú." };
}

export async function setTeacherApprovalAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const adminId = await requireAdminId();
  if (!adminId) {
    return { error: DENIED };
  }
  const isRequired = formData.get("approvalRequired") === "on";
  try {
    await setTeacherApproval(adminId, isRequired);
  } catch {
    return { error: FAILURE };
  }
  refresh();
  return {
    notice: isRequired
      ? "Giáo viên mới sẽ chờ quản trị viên duyệt."
      : "Giáo viên mới tự kích hoạt sau khi xác minh email.",
  };
}

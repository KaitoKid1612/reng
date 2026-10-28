"use server";

import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { REMINDER_FREQUENCIES, saveNotificationPreferences } from "@/lib/server/notifications";

export interface PreferencesState {
  error?: string;
  notice?: string;
}

const preferencesSchema = z.object({
  reminderFrequency: z.enum(REMINDER_FREQUENCIES),
  weeklyEnabled: z.boolean(),
  teacherDigestEnabled: z.boolean(),
});

export async function saveNotificationPreferencesAction(
  _state: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const account = await getCurrentAccount();
  if (!account) {
    return { error: "Phiên đăng nhập đã hết. Đăng nhập lại để lưu." };
  }
  const parsed = preferencesSchema.safeParse({
    reminderFrequency: formData.get("reminderFrequency") ?? "off",
    weeklyEnabled: formData.get("weeklyEnabled") === "on",
    teacherDigestEnabled: formData.get("teacherDigestEnabled") === "on",
  });
  if (!parsed.success) {
    return { error: "Lựa chọn chưa hợp lệ." };
  }
  try {
    await saveNotificationPreferences(account.id, account.role, parsed.data);
  } catch {
    return { error: "Chưa lưu được. Bạn thử lại nhé." };
  }
  return { notice: "Đã lưu cài đặt thông báo." };
}

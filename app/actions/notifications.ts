"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { REMINDER_FREQUENCIES, saveNotificationPreferences } from "@/lib/server/notifications";
import {
  deletePushSubscription,
  isPushConfigured,
  pushSubscriptionSchema,
  savePushSubscription,
  sendTestPush,
} from "@/lib/server/push";

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
  // React resets the form after the action; refreshing makes its defaults the saved values.
  refresh();
  return { notice: "Đã lưu cài đặt thông báo." };
}

export interface PushActionState {
  error?: string;
  notice?: string;
}

const SIGNED_OUT = "Phiên đăng nhập đã hết. Đăng nhập lại rồi thử lại nhé.";

// Called by the settings page once the browser has a push subscription for this device.
export async function savePushSubscriptionAction(subscription: unknown): Promise<PushActionState> {
  const account = await getCurrentAccount();
  if (!account) {
    return { error: SIGNED_OUT };
  }
  if (!isPushConfigured()) {
    return { error: "Hệ thống chưa bật thông báo trình duyệt." };
  }
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  if (!parsed.success) {
    return { error: "Trình duyệt trả về đăng ký không hợp lệ. Bạn thử lại nhé." };
  }
  try {
    const userAgent = (await headers()).get("user-agent") ?? "";
    const { turnedOnReminders } = await savePushSubscription(
      account.id,
      account.role,
      parsed.data,
      userAgent,
    );
    refresh();
    return {
      notice: turnedOnReminders
        ? "Đã bật thông báo trên thiết bị này và chọn nhắc mỗi ngày khi có việc."
        : "Đã bật thông báo trên thiết bị này.",
    };
  } catch {
    return { error: "Chưa lưu được. Bạn thử lại nhé." };
  }
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<PushActionState> {
  const account = await getCurrentAccount();
  if (!account) {
    return { error: SIGNED_OUT };
  }
  try {
    await deletePushSubscription(account.id, endpoint.slice(0, 1000));
    return { notice: "Đã tắt thông báo trên thiết bị này." };
  } catch {
    return { error: "Chưa tắt được. Bạn thử lại nhé." };
  }
}

export async function sendTestPushAction(): Promise<PushActionState> {
  const account = await getCurrentAccount();
  if (!account) {
    return { error: SIGNED_OUT };
  }
  try {
    const sent = await sendTestPush(account.id);
    return sent
      ? { notice: `Đã gửi thông báo thử tới ${sent} thiết bị.` }
      : { error: "Không gửi được tới thiết bị nào. Tắt rồi bật lại thông báo nhé." };
  } catch {
    return { error: "Chưa gửi được. Bạn thử lại nhé." };
  }
}

import "server-only";

import webpush from "web-push";
import { z } from "zod";

import { emailDateOf } from "@/lib/notifications/schedule";
import { describeReminderPush, TEST_PUSH_MESSAGE } from "@/lib/notifications/push-message";
import {
  describeReminderWork,
  getNotificationPreferences,
  REMINDER_FREQUENCIES,
  saveNotificationPreferences,
} from "@/lib/server/notifications";
import {
  createServiceClient,
  runMutation,
  selectEveryPage,
  selectRows,
} from "@/lib/server/supabase";

import type { PushMessage } from "@/lib/notifications/push-message";

// Web Push (migration 20261110112415). The browser subscribes with the public VAPID key; the
// server signs each message with the private key. Without both keys the feature stays hidden.
export function getPushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function vapidDetails() {
  return {
    // An https: URL or mailto: address the push services can contact; the site itself here.
    subject: process.env.VAPID_SUBJECT || process.env.SITE_URL || "https://reng-class.vercel.app",
    publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  };
}

// PushSubscription.toJSON() from the browser.
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export type BrowserPushSubscription = z.infer<typeof pushSubscriptionSchema>;

const subscriptionRowSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  failure_count: z.number().int(),
});

type SubscriptionRow = z.infer<typeof subscriptionRowSchema>;

const SUBSCRIPTION_COLUMNS = "id, user_id, endpoint, p256dh, auth, failure_count";
// A device that keeps failing for reasons other than "gone" is dropped after this many tries.
const MAX_FAILURES = 5;
// A reminder older than this is no longer worth showing when a phone comes back online.
const REMINDER_TTL_SECONDS = 12 * 60 * 60;

/**
 * Turns reminders on for this browser. A browser has one endpoint, so signing in as someone else
 * there moves it to that person. Reminders follow the reminder frequency; if it is off, it
 * becomes "daily", since asking for notifications is asking for reminders.
 */
export async function savePushSubscription(
  userId: string,
  role: "student" | "teacher",
  subscription: BrowserPushSubscription,
  userAgent: string,
) {
  await runMutation(
    createServiceClient()
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent.slice(0, 300),
          failure_count: 0,
        },
        { onConflict: "endpoint" },
      ),
  );
  const preferences = await getNotificationPreferences(userId);
  if (preferences.reminderFrequency !== "off") {
    return { turnedOnReminders: false };
  }
  await saveNotificationPreferences(userId, role, { ...preferences, reminderFrequency: "daily" });
  return { turnedOnReminders: true };
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await runMutation(
    createServiceClient()
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint),
  );
}

function isGone(error: unknown) {
  return (
    error instanceof webpush.WebPushError && (error.statusCode === 404 || error.statusCode === 410)
  );
}

// Sends one message to each device; a device the push service no longer knows is removed.
async function sendToDevices(rows: readonly SubscriptionRow[], message: PushMessage) {
  const service = createServiceClient();
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify(message),
        { vapidDetails: vapidDetails(), TTL: REMINDER_TTL_SECONDS, urgency: "normal" },
      );
      sent += 1;
      await runMutation(
        service
          .from("push_subscriptions")
          .update({ last_sent_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", row.id),
      );
    } catch (error) {
      const failures = row.failure_count + 1;
      if (isGone(error) || failures >= MAX_FAILURES) {
        await runMutation(service.from("push_subscriptions").delete().eq("id", row.id));
      } else {
        console.error("Push delivery failed", row.id, error instanceof Error ? error.name : "");
        await runMutation(
          service.from("push_subscriptions").update({ failure_count: failures }).eq("id", row.id),
        );
      }
    }
  }
  return sent;
}

async function listDevices(userId: string) {
  return selectRows(
    createServiceClient()
      .from("push_subscriptions")
      .select(SUBSCRIPTION_COLUMNS)
      .eq("user_id", userId),
    subscriptionRowSchema,
  );
}

/** "Gửi thử" on the settings page: how many of the person's devices took the message. */
export async function sendTestPush(userId: string) {
  return sendToDevices(await listDevices(userId), TEST_PUSH_MESSAGE);
}

/**
 * The evening job (cron student-reminders): everyone with a device and reminders on gets at
 * most one notification a day, and only when there is work, the same rule as the email.
 */
export async function sendPushReminders(now: Date) {
  const service = createServiceClient();
  const devices = await selectEveryPage(
    (from, to) =>
      service.from("push_subscriptions").select(SUBSCRIPTION_COLUMNS).order("id").range(from, to),
    subscriptionRowSchema,
  );
  const byUser = Map.groupBy(devices, (device) => device.user_id);
  if (!byUser.size) {
    return { people: 0, sent: 0 };
  }
  const preferences = await selectRows(
    service
      .from("notification_preferences")
      .select("user_id, reminder_frequency")
      .in("user_id", [...byUser.keys()])
      .in("reminder_frequency", ["daily", "due_only"]),
    z.object({ user_id: z.uuid(), reminder_frequency: z.enum(REMINDER_FREQUENCIES) }),
  );
  const forDate = emailDateOf(now);
  let people = 0;
  let sent = 0;
  for (const preference of preferences) {
    const work = await describeReminderWork(preference.user_id, preference.reminder_frequency, now);
    if (!work) {
      continue;
    }
    // The day's slot is taken first, so a second run the same evening sends nothing.
    const claimed = await selectRows(
      service
        .from("push_log")
        .upsert(
          { user_id: preference.user_id, kind: "daily_reminder", for_date: forDate },
          { onConflict: "user_id,kind,for_date", ignoreDuplicates: true },
        )
        .select("user_id"),
      z.object({ user_id: z.uuid() }),
    );
    if (!claimed.length) {
      continue;
    }
    const count = await sendToDevices(
      byUser.get(preference.user_id) ?? [],
      describeReminderPush(work),
    );
    people += 1;
    sent += count;
    await runMutation(
      service
        .from("push_log")
        .update({ sent_count: count })
        .eq("user_id", preference.user_id)
        .eq("kind", "daily_reminder")
        .eq("for_date", forDate),
    );
  }
  return { people, sent };
}

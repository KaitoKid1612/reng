import Link from "next/link";

import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { defaultHomePath } from "@/lib/auth-paths";
import { requireAccount } from "@/lib/server/account";
import { getEmailProvider } from "@/lib/server/email-provider";
import { getNotificationPreferences } from "@/lib/server/notifications";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cài đặt thông báo" };

export default async function NotificationSettingsPage() {
  const account = await requireAccount("/settings/notifications");
  const preferences = await getNotificationPreferences(account.id);
  return (
    <div className="narrow-page">
      <h1>Cài đặt thông báo</h1>
      <p className="muted">
        Gửi tới {account.email}. Mặc định tắt; chỉ bật những gì bạn thấy có ích.{" "}
        <Link href={defaultHomePath(account.role)}>Quay lại</Link>
      </p>
      {!getEmailProvider() && (
        <p className="notice-panel" role="status">
          Hệ thống chưa bật gửi email nên hiện chưa có thư nhắc. Cài đặt của bạn vẫn được lưu và áp
          dụng khi email được bật.
        </p>
      )}
      <NotificationPreferencesForm role={account.role} preferences={preferences} />
    </div>
  );
}

import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireAccount } from "@/lib/server/account";
import { getEmailProvider } from "@/lib/server/email-provider";
import { getNotificationPreferences } from "@/lib/server/notifications";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Email nhắc học" };

export default async function NotificationSettingsPage() {
  const account = await requireAccount("/settings/notifications");
  const preferences = await getNotificationPreferences(account.id);
  const isTeacher = account.role === "teacher";
  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <h1>{isTeacher ? "Email nhắc học và tóm tắt lớp" : "Email nhắc học"}</h1>
          <p className="muted">
            Gửi tới {account.email}. Mặc định tắt; chỉ bật những gì bạn thấy có ích.
          </p>
        </div>
      </div>
      <SettingsNav current="notifications" />
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

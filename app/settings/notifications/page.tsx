import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { PushSettings } from "@/components/settings/push-settings";
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireAccount } from "@/lib/server/account";
import { getEmailProvider } from "@/lib/server/email-provider";
import { getNotificationPreferences } from "@/lib/server/notifications";
import { getPushPublicKey, isPushConfigured } from "@/lib/server/push";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nhắc học" };

export default async function NotificationSettingsPage() {
  const account = await requireAccount("/settings/notifications");
  const preferences = await getNotificationPreferences(account.id);
  const isTeacher = account.role === "teacher";
  const pushKey = isPushConfigured() ? getPushPublicKey() : null;
  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <h1>{isTeacher ? "Nhắc học và tóm tắt lớp" : "Nhắc học"}</h1>
          <p className="muted">
            Qua thông báo trên thiết bị và email {account.email}. Mặc định tắt; chỉ bật những gì bạn
            thấy có ích.
          </p>
        </div>
      </div>
      <SettingsNav current="notifications" />
      {pushKey && <PushSettings publicKey={pushKey} />}
      {!getEmailProvider() && (
        <p className="notice-panel" role="status">
          Hệ thống chưa bật gửi email nên hiện chưa có thư nhắc
          {pushKey ? "; nhắc học đi qua thông báo trên thiết bị" : ""}. Cài đặt của bạn vẫn được lưu
          và áp dụng cho email khi email được bật.
        </p>
      )}
      <NotificationPreferencesForm role={account.role} preferences={preferences} />
    </div>
  );
}

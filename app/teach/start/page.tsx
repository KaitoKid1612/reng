import { redirect } from "next/navigation";

import { TeacherActivationForm } from "@/components/teach/teacher-activation-form";
import { requireAccount } from "@/lib/server/account";
import { getTeacherRequestStatus, loadPlatformSettings } from "@/lib/server/admin";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bắt đầu giảng dạy",
  robots: { index: false, follow: false },
};

export default async function TeacherStartPage() {
  const account = await requireAccount("/teach/start");
  if (account.role === "teacher") {
    redirect("/teach");
  }
  const [request, settings] = await Promise.all([
    getTeacherRequestStatus(account.id),
    loadPlatformSettings(),
  ]);
  let body = <TeacherActivationForm requiresApproval={settings.teacherApprovalRequired} />;
  // A request sent while approval was required activates itself once approval is turned off.
  if (request?.status === "pending" && !settings.teacherApprovalRequired) {
    body = (
      <>
        <p className="notice-panel" role="status">
          Reng không còn yêu cầu duyệt giáo viên mới. Bấm Kích hoạt giảng dạy để bắt đầu dạy.
        </p>
        <TeacherActivationForm requiresApproval={false} />
      </>
    );
  } else if (request?.status === "pending") {
    body = (
      <p className="notice-panel" role="status">
        Yêu cầu giảng dạy của bạn đang chờ quản trị viên duyệt. Bạn sẽ dạy được ngay khi quyền được
        mở; trong lúc chờ vẫn có thể tham gia lớp như học viên.
      </p>
    );
  } else if (request?.status === "suspended" && !request.wasActivated) {
    body = (
      <p className="notice-panel" role="status">
        Yêu cầu giảng dạy chưa được chấp nhận. Liên hệ quản trị viên nếu bạn cần dạy trên Reng; bạn
        vẫn tham gia lớp như học viên được.
      </p>
    );
  } else if (request?.status === "suspended") {
    body = (
      <p className="notice-panel" role="status">
        Quyền giảng dạy đang tạm dừng. Liên hệ quản trị viên để gia hạn hoặc được hỗ trợ.
      </p>
    );
  }
  return (
    <div className="narrow-page">
      <h1>Bắt đầu giảng dạy</h1>
      <p>Tạo lớp, soạn bài, giao bài tập và theo dõi học sinh của bạn.</p>
      {body}
    </div>
  );
}

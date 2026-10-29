import { redirect } from "next/navigation";

import { TeacherActivationForm } from "@/components/teach/teacher-activation-form";
import { requireAccount } from "@/lib/server/account";

export default async function TeacherStartPage() {
  const account = await requireAccount("/teach/start");
  if (account.role === "teacher") {
    redirect("/teach");
  }
  return (
    <div className="narrow-page">
      <h1>Bắt đầu giảng dạy</h1>
      <p>Tạo lớp, soạn bài, giao bài tập và theo dõi học sinh của bạn.</p>
      <TeacherActivationForm />
    </div>
  );
}

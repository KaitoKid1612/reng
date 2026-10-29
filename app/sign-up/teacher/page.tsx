import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentAccount } from "@/lib/server/account";
import { isClassroomConfigured } from "@/lib/server/supabase";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký giáo viên",
  description:
    "Tạo tài khoản giáo viên trên Masu để mở lớp tiếng Trung online, soạn slide theo mẫu và giao bài tập tự chấm.",
  alternates: { canonical: "/sign-up/teacher" },
};

export default async function TeacherSignUpPage() {
  if (await getCurrentAccount()) {
    redirect("/teach/start");
  }
  return (
    <div className="narrow-page">
      <h1>Đăng ký giáo viên</h1>
      <p>Xác minh email, sau đó xác nhận trách nhiệm nội dung để bắt đầu giảng dạy.</p>
      {isClassroomConfigured() ? (
        <SignUpForm nextPath="/teach/start" />
      ) : (
        <p className="sample-notice">Đăng ký chưa được kích hoạt trên hệ thống này.</p>
      )}
      <p>
        Đã có tài khoản? <Link href="/sign-in?next=/teach/start">Đăng nhập</Link>
      </p>
    </div>
  );
}

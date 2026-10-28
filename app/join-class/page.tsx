import { JoinClassForm } from "@/components/classroom/join-class-form";
import { normalizeJoinCode } from "@/lib/join-code";
import { getCurrentAccount } from "@/lib/server/account";
import { isClassroomConfigured } from "@/lib/server/supabase";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vào lớp" };

interface JoinClassPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function JoinClassPage({ searchParams }: JoinClassPageProps) {
  const query = await searchParams;
  const account = await getCurrentAccount();
  return (
    <div className="narrow-page">
      <h1>Vào lớp</h1>
      <p className="muted">Nhập mã lớp giảng viên gửi cho bạn.</p>
      {isClassroomConfigured() ? (
        <>
          <JoinClassForm initialCode={normalizeJoinCode(query.code ?? "").slice(0, 8)} />
          {!account && (
            <p className="small muted">
              Bạn sẽ đăng nhập hoặc tạo tài khoản học viên, sau đó quay lại đây với mã vừa nhập.
            </p>
          )}
        </>
      ) : (
        <p className="sample-notice">Lớp học chưa được kích hoạt trên hệ thống này.</p>
      )}
    </div>
  );
}

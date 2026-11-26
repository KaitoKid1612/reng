import Link from "next/link";

import { JoinClassForm } from "@/components/classroom/join-class-form";
import { buttonVariants } from "@/components/ui/button";
import { signInPath } from "@/lib/auth-paths";
import { formatJoinCode, normalizeJoinCode, UNKNOWN_JOIN_CODE } from "@/lib/join-code";
import { getCurrentAccount } from "@/lib/server/account";
import { previewJoinClass } from "@/lib/server/classes";
import { isClassroomConfigured } from "@/lib/server/supabase";

import type { JoinPreview } from "@/lib/server/classes";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vào lớp" };

interface JoinClassPageProps {
  searchParams: Promise<{ code?: string | string[] }>;
}

interface InviteCardProps {
  preview: JoinPreview;
  code: string;
}

function InviteCard({ preview, code }: InviteCardProps) {
  return (
    <section className="form-card join-invite" aria-labelledby="join-invite-title">
      <p className="small muted">Lời mời vào lớp</p>
      <h2 id="join-invite-title">{preview.name}</h2>
      <p className="muted">
        {preview.teacherName && `Giáo viên: ${preview.teacherName} · `}Mã lớp {formatJoinCode(code)}
      </p>
    </section>
  );
}

// Reads the class behind a code; a failed read falls back to the plain form, which still joins.
async function loadPreview(code: string, userId: string | null) {
  try {
    return { preview: await previewJoinClass(code, userId), failed: false };
  } catch {
    return { preview: null, failed: true };
  }
}

export default async function JoinClassPage({ searchParams }: JoinClassPageProps) {
  const query = await searchParams;
  // A repeated ?code= arrives as an array; only a single value can prefill the form.
  const typed = typeof query.code === "string" ? query.code : "";
  const code = normalizeJoinCode(typed).slice(0, 8);
  if (!isClassroomConfigured()) {
    return (
      <div className="narrow-page">
        <h1>Vào lớp</h1>
        <p className="sample-notice">Lớp học chưa được kích hoạt trên hệ thống này.</p>
      </div>
    );
  }
  const account = await getCurrentAccount();
  const { preview, failed } = code
    ? await loadPreview(code, account?.id ?? null)
    : { preview: null, failed: false };
  const returnPath = `/join-class?code=${encodeURIComponent(code)}`;

  if (preview?.relation === "guest") {
    return (
      <div className="narrow-page">
        <h1>Vào lớp</h1>
        <InviteCard preview={preview} code={code} />
        <p>
          Tạo tài khoản học viên để vào lớp. Đã có tài khoản thì đăng nhập; xong bước đó Reng đưa
          bạn quay lại đây để vào lớp.
        </p>
        <div className="button-row">
          <Link
            href={`/sign-up?next=${encodeURIComponent(returnPath)}`}
            className={buttonVariants()}
          >
            Tạo tài khoản để vào lớp
          </Link>
          <Link href={signInPath(returnPath)} className={buttonVariants({ variant: "outline" })}>
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (preview?.relation === "member") {
    return (
      <div className="narrow-page">
        <h1>Vào lớp</h1>
        <InviteCard preview={preview} code={code} />
        <p role="status">Bạn đã ở trong lớp này.</p>
        <Link href={`/classes/${preview.classId}`} className={buttonVariants()}>
          Mở lớp
        </Link>
      </div>
    );
  }

  if (preview?.relation === "owner") {
    return (
      <div className="narrow-page">
        <h1>Vào lớp</h1>
        <InviteCard preview={preview} code={code} />
        <p role="status">
          Đây là lớp bạn đang dạy nên không vào được với vai học viên. Muốn tự luyện, hãy tạo một
          lớp tự học ở trang Lớp học.
        </p>
        <Link href={`/teach/classes/${preview.classId}`} className={buttonVariants()}>
          Mở trang dạy lớp này
        </Link>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="narrow-page">
        <h1>Vào lớp</h1>
        <InviteCard preview={preview} code={code} />
        <p className="muted">Bấm Vào lớp để bắt đầu học cùng lớp này.</p>
        <JoinClassForm initialCode={code} isConfirm />
      </div>
    );
  }

  // No code yet, an unknown code, or a lookup that failed: the form takes a code by hand.
  const isUnknown = Boolean(code) && !failed;
  return (
    <div className="narrow-page">
      <h1>Vào lớp</h1>
      {isUnknown ? (
        <p role="alert" className="error-text">
          {UNKNOWN_JOIN_CODE}
        </p>
      ) : (
        <p className="muted">Nhập mã lớp giáo viên gửi cho bạn.</p>
      )}
      <JoinClassForm initialCode={code} />
      {!account && (
        <p className="small muted">
          Nhập mã để xem tên lớp, rồi tạo tài khoản học viên hoặc đăng nhập để vào lớp.
        </p>
      )}
    </div>
  );
}

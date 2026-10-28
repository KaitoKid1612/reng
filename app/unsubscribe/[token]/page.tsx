import Link from "next/link";

import { Button } from "@/components/ui/button";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hủy nhận email" };

interface UnsubscribePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}

// GET only shows a confirmation; link scanners that open the page do not unsubscribe anyone.
export default async function UnsubscribePage({ params, searchParams }: UnsubscribePageProps) {
  const { token } = await params;
  const { done } = await searchParams;
  const secret = process.env.EMAIL_LINK_SECRET;
  const isValid = Boolean(secret && verifyUnsubscribeToken(token, secret));
  return (
    <div className="narrow-page">
      <h1>Hủy nhận email</h1>
      {!isValid && (
        <p className="sample-notice">
          Liên kết không hợp lệ. Bạn có thể tắt email trong{" "}
          <Link href="/settings/notifications">cài đặt thông báo</Link>.
        </p>
      )}
      {isValid && done && (
        <p role="status" className="form-notice">
          Đã tắt mọi email nhắc học từ Masu. Bạn có thể bật lại trong{" "}
          <Link href="/settings/notifications">cài đặt thông báo</Link>.
        </p>
      )}
      {isValid && !done && (
        <form method="post" action={`/api/unsubscribe/${token}`} className="form-card">
          <p>Masu sẽ ngừng gửi nhắc học, tổng kết tuần và tóm tắt lớp tới email của bạn.</p>
          <Button type="submit">Hủy nhận email</Button>
        </form>
      )}
    </div>
  );
}

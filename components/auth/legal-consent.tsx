import Link from "next/link";

// Under the sign-up choices: creating an account, by email or with Google, accepts the terms.
export function LegalConsent() {
  return (
    <p className="small muted">
      Khi tạo tài khoản, kể cả bằng Google, bạn đồng ý với{" "}
      <Link href="/terms">Điều khoản sử dụng</Link> và{" "}
      <Link href="/privacy">Chính sách quyền riêng tư</Link> của Reng.
    </p>
  );
}

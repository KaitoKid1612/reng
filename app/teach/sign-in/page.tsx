import { Button } from "@/components/ui/button";
import { isTeacherAuthConfigured } from "@/lib/supabase-session";

interface TeacherSignInProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function TeacherSignIn({ searchParams }: TeacherSignInProps) {
  const query = await searchParams;
  return (
    <div className="prose-page">
      <h1>Đăng nhập giảng viên</h1>
      <p>Dùng tài khoản giảng viên do người vận hành cấp để xem ghi chú riêng.</p>
      {isTeacherAuthConfigured() ? (
        <form className="practice-setup" method="post" action="/api/auth/sign-in">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </div>
          {query.error && (
            <p role="alert" className="error-text">
              Chưa đăng nhập được. Kiểm tra tài khoản giảng viên và thử lại.
            </p>
          )}
          <Button type="submit">Đăng nhập</Button>
        </form>
      ) : (
        <p className="sample-notice">
          Khu vực giảng viên chưa được kích hoạt. Bạn vẫn có thể xem bài học và trình chiếu công
          khai.
        </p>
      )}
    </div>
  );
}

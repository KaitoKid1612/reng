# Đăng nhập bằng Google — 03/11/2026

Yêu cầu của người dùng: thêm đăng nhập bằng Google. Thiết kế ở [BD](../basic-design/teaching-service.md#đăng-nhập-bằng-google--03112026) và [DD](../detail-design/teaching-service.md#đăng-nhập-bằng-google--03112026); các bước bật ở [kế hoạch POC](../poc-setup.md#bật-đăng-nhập-bằng-google-03112026).

## Đã kiểm tra local

Dev server có `AUTH_GOOGLE_ENABLED=true` và Supabase local; Google chưa bật trong Supabase local vì chưa có OAuth client.

| Kiểm tra | Kết quả |
|---|---|
| Nút "Đăng nhập bằng Google" ở `/sign-in`, "Đăng ký bằng Google" ở `/sign-up` và `/sign-up/teacher`, 360px và 1280px | Đạt |
| Bấm nút chuyển tới `/auth/v1/authorize` của Supabase với `provider=google`, `code_challenge` (S256), `prompt=select_account` | Đạt |
| `redirect_to` là callback trên chính origin đang mở, giữ trang đích: `/auth/callback?next=%2Fjoin-class%3Fcode%3DABCD2345` | Đạt |
| Cookie PKCE verifier được đặt (httpOnly) trên origin đó | Đạt |
| Supabase local trả "Unsupported provider: provider is not enabled" | Đúng mong đợi khi chưa bật Google |
| Callback `error=access_denied` → `/sign-in?error=google-cancelled&next=%2Fteach%2Fstart`, báo "Bạn đã dừng đăng nhập bằng Google…" | Đạt |
| Callback có mã sai (có hoặc không có verifier) → `/sign-in?error=google`, báo "Chưa đăng nhập được bằng Google…" | Đạt |
| `next` trỏ ra ngoài site bị bỏ | Đạt |
| `npm run check`; test `tests/auth-paths.test.ts` cho `googleCallbackPath`, `signInErrorPath` | Đạt |

## Chưa kiểm tra

- Đăng nhập thật qua Google (cần OAuth client trên Google Cloud và bật nhà cung cấp trong Supabase), gộp vào tài khoản email đã có, và đăng ký giáo viên bằng Google trên production.
- E2E chưa chạy theo yêu cầu người dùng ngày 03/11/2026.

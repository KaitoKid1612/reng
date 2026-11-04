# Kiểm tra cập nhật thư viện — 04/11/2026

Người dùng hỏi có gì cần cập nhật không. Mọi gói trong `package.json` được ghim đúng một phiên bản.

## Đã cập nhật (bản vá và bản nhỏ)

| Gói | Từ | Lên |
|---|---|---|
| `next`, `eslint-config-next` | 16.4.3 | 16.4.5 |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3 | 4.3.4 |
| `@aws-sdk/client-s3` | 3.1158.0 | 3.1161.0 |
| `lucide-react` | 1.62.0 | 1.67.0 |
| `@electric-sql/pglite` | 0.5.12 | 0.5.15 |
| `@types/node` | 26.6.5 | 26.6.6 |

Kiểm tra:
- `npm run check`: 246/246 test.
- `npm run build`: chạy với Next.js 16.4.5, không cảnh báo.
- Trên Supabase local, các trang khách, học viên và giáo viên mở đúng, không lỗi trang.
- Trình chiếu bấm Tiếp được (2/9).
- E2E chưa chạy.

## Chưa cập nhật (bản lớn)

| Gói | Hiện tại | Mới nhất | Lý do giữ |
|---|---|---|---|
| `supabase` (CLI) | 2.122.0 | 3.0.0 | Bản 3 cho `db push` đẩy vào database local khi không có `--linked`. Quy trình áp migration đã đổi sang `npx supabase db push --linked` ([README](../../README.md), [POC](../poc-setup.md)). Nâng bản sau, khi người áp migration đã quen lệnh mới |
| `ts-fsrs` | 5.4.2 | 6.0.0 | Thuật toán lịch ôn có thể đổi khoảng cách và trạng thái thẻ đã lưu; cần kế hoạch chuyển dữ liệu và test riêng |
| `typescript` | 6.0.3 | 7.0.2 | Trình biên dịch mới; chờ Next.js và typescript-eslint hỗ trợ chính thức |
| `eslint` | 9.39.5 | 10.14.0 | Cần `eslint-config-next` và các plugin hỗ trợ ESLint 10 |

## Bảo mật

- `npm audit --omit=dev`: **0 lỗ hổng** ở các gói chạy trên production.
- `npm audit`: 16 cảnh báo mức trung bình, đều do `minimatch` trong bộ công cụ ESLint (chỉ chạy khi lập trình, nhận glob từ cấu hình trong repo). Cách sửa npm gợi ý là hạ ESLint về bản 4, không dùng được. Hết khi lên ESLint 10 cùng các plugin mới.

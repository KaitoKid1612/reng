# Đổi domain pilot — 30/10/2026

Theo lựa chọn của người dùng, địa chỉ chính chuyển từ `reng-cyan.vercel.app` sang `reng-class.vercel.app`. Tên `reng.vercel.app` đã được sử dụng và Vercel từ chối gắn; không đổi quyền sở hữu tên đó.

## Đã áp dụng

- Vercel chấp nhận domain mới cho đúng project `reng`, kiểm tra `domains verify --project reng` trả `configured_correctly`, attached/verified. Đây là domain của project, tiếp tục theo deployment production mới.
- `SITE_URL` production đã cập nhật, giữ loại biến đang có; không đọc hay đổi giá trị secret khác. Cần bản build mới để nhận URL mới.
- Supabase Auth chỉ thay `site_url` và `additional_redirect_urls`: domain mới là chính, allowlist giữ domain cũ và mới. Dùng cấu hình tối thiểu ngoài repository để push; các thuộc tính không khai báo được giữ nguyên. Khối remote production trong repo đồng bộ, cấu hình local không đổi.
- HTTPS domain mới: `/` trả 200, `/history` trả 307 về `/sign-in?next=%2Fhistory` khi chưa đăng nhập. Không tạo tài khoản thử hoặc gửi email thật.

## Kiểm tra sau deployment

`npm run check`: PASS, format/ESLint/TypeScript và 123/123 test đạt. Đọc lại Supabase config diff: 0 thuộc tính được khai báo còn khác remote; các thuộc tính remote_only giữ nguyên.

- Commit `c6c90e5` đã push main; deployment `dpl_5qQSLfiKjpxauWjJP9Wt2cKjVQGw` Ready, nhận `SITE_URL` mới và có cả hai alias cũ/mới.
- HTTPS `/`, `/sign-in`, `/lessons`, `/guide`, `/for-teachers` trên domain mới trả 200. Metadata/URL tuyệt đối ở trang chủ và canonical `/for-teachers` dùng domain mới.
- `robots.txt` trỏ sitemap domain mới và chặn `/history`; `sitemap.xml` dùng domain mới, không chứa domain cũ hoặc lịch sử riêng tư.
- `/history`, `/classes` không đăng nhập trả 307 về `/sign-in` và giữ next path.
- Trang chủ domain cũ vẫn trả 200, metadata dùng URL chính mới. Không có redirect bắt buộc làm hỏng link cũ.
- Không dùng ID bài mẫu local để xác nhận canonical production: `/lessons/lesson-01` không có trên nguồn production (404); kiểm tra bằng trang công khai `/for-teachers` thay thế. Không đăng nhập tài khoản thật hoặc gửi thư để kiểm thử.

Đổi domain không ảnh hưởng dữ liệu Supabase. Cookie đăng nhập tách theo domain nên người dùng đăng nhập lại trên domain mới. Email xác nhận/khôi phục vẫn chịu giới hạn SMTP hiện có; thay domain không bật hoặc sửa cơ chế gửi thư.

Thiết kế: [BD](../basic-design/teaching-service.md#địa-chỉ-truy-cập--30102026), [DD](../detail-design/teaching-service.md#domain-production--30102026).

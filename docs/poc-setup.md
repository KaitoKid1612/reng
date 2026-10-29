# Kế hoạch POC — công cụ, chi phí và các bước dựng

Ngày kiểm tra giá: 29/10/2026. Quy mô POC: **10 giáo viên thuê, khoảng 5 học viên mỗi giáo viên (~50 học viên), 1 quản trị viên**. Giá dưới đây lấy từ trang chính thức hoặc tổng hợp công khai, chưa phải báo giá; kiểm tra lại trước khi đăng ký gói. Tỷ giá tham khảo 26.000 đ/USD.

## Công cụ đề xuất

| Hạng mục | Công cụ | Gói cho POC | Ước tính/tháng | Lý do và lưu ý |
|---|---|---|---|---|
| Web/hosting | Vercel | **Pro** (1 thành viên) | 20 USD | Gói Hobby chỉ cho dùng cá nhân, phi thương mại; giáo viên trả tiền thuê là dùng thương mại. Cron hiện chạy hằng ngày/hằng tuần, Pro chạy đúng giờ |
| Database + đăng nhập | Supabase | **Pro** | 25 USD | Gói Free tạm dừng project sau 7 ngày không hoạt động và giới hạn 500 MB database; dữ liệu học viên thật cần gói có backup. Kiểm tra chính sách backup trên trang giá khi đăng ký |
| Email (nhắc bài + email đăng nhập) | Resend | Free | 0 đ | 100 email/ngày, 3.000/tháng, 1 domain: đủ cho ~60 tài khoản. Dùng Resend làm SMTP riêng cho Supabase Auth vì SMTP mặc định của Supabase chỉ ~2 email/giờ và không dành cho production |
| Video lớp học | Google Meet của giáo viên | Theo tài khoản giáo viên | 0–8,4 USD/giáo viên | Tài khoản cá nhân miễn phí giới hạn **60 phút** cho cuộc gọi từ 3 người; lớp 1 giáo viên + 5 học viên sẽ bị cắt. Business Starter khoảng 7 USD/người/tháng (trả năm) hoặc 8,4 USD (trả tháng), cuộc gọi nhóm tới 24 giờ. Thống nhất ai trả khoản này khi cho thuê |
| Đọc audio tiếng Trung (khi bật TTS web) | Azure Speech | **F0** (miễn phí) | 0 đ | 0,5 triệu ký tự/tháng; hết hạn mức thì Azure từ chối, không tính tiền. POC 10 giáo viên dùng chưa tới 5% hạn mức. Hiện nút Nghe dùng giọng có sẵn trên thiết bị |
| Lưu audio | Cloudflare R2 | Free | 0 đ | 10 GB, 10 triệu lượt đọc/tháng, băng thông ra miễn phí |
| SEO | Google Search Console, Bing Webmaster Tools | Miễn phí | 0 đ | Xác minh domain, nộp sitemap, theo dõi lập chỉ mục và Core Web Vitals |
| Thanh toán thuê | Chuyển khoản + trang quản trị | — | 0 đ | POC không tích hợp cổng thanh toán; quản trị viên duyệt giáo viên, ghi hạn thuê và ghi chú thanh toán |
| Tên miền | Nhà đăng ký tùy chọn | Theo năm | Theo nhà đăng ký | Cần cho email gửi đi (SPF/DKIM/DMARC), Search Console và link tuyệt đối |

**Tổng chi phí nền tảng: khoảng 45 USD/tháng (~1,2 triệu đ)** cộng tên miền. Chưa tính Google Workspace của từng giáo viên nếu cần buổi học dài hơn 60 phút. Chi phí audio và email ở quy mô POC nằm trong gói miễn phí.

Có thể chạy thử nội bộ (không thu tiền, không dữ liệu học viên thật) bằng Vercel Hobby và Supabase Free trước khi mời giáo viên thuê; chuyển sang gói trả phí trước khi nhận học viên thật.

## Các bước dựng POC

1. Tạo Supabase project gói Pro, backup rồi áp dụng toàn bộ migration trong `supabase/migrations` theo thứ tự (đến `202610290005_platform_admin.sql`).
2. Supabase Auth: bật xác nhận email, đặt Site URL/Redirect URLs theo domain, chép template trong `supabase/templates`, cấu hình **SMTP riêng qua Resend** và hạn mức gửi trong Authentication › Rate Limits.
3. Resend: xác minh domain gửi (SPF, DKIM, DMARC), tạo API key và webhook theo [chuẩn bị staging](staging-setup.md).
4. Vercel Pro: đặt biến môi trường theo `.env.example`, đặc biệt `SITE_URL` là domain thật (dùng cho link email, canonical, sitemap, robots), `GOOGLE_SITE_VERIFICATION`, `CRON_SECRET`, `EMAIL_LINK_SECRET`. Không đặt secret vào biến `NEXT_PUBLIC_`.
5. Cấp quyền quản trị viên đầu tiên bằng SQL trong Supabase (tài khoản đã đăng ký):

   ```sql
   insert into public.platform_admins(user_id, note)
   select id, 'Quản trị POC' from auth.users where email = 'admin@ten-mien-cua-ban.vn';
   ```

   Máy local dùng `npm run admin:grant -- --email <email>`; script từ chối Supabase không chạy trên máy.
6. Giữ cài đặt **Duyệt giáo viên mới** (bật mặc định). Giáo viên đăng ký ở `/sign-up/teacher`, gửi yêu cầu; quản trị viên duyệt ở `/admin/teachers`, ghi hạn thuê và ghi chú thanh toán. Hệ thống không tự khóa khi quá hạn: trang quản trị báo "Quá hạn thuê" để quản trị viên gia hạn hoặc tạm dừng.
7. Google Search Console: xác minh bằng thẻ meta (`GOOGLE_SITE_VERIFICATION`), nộp `https://<domain>/sitemap.xml`, kiểm tra `robots.txt` chặn `/teach`, `/admin`, `/classes`, `/assignments` và trang slide/presenter.
8. Chạy thử một buổi qua Meet trên thiết bị thật, một lần backup/restore trên môi trường riêng, ghi kết quả vào [nghiệm thu dịch vụ](testing/teaching-service.md).

## Cảnh báo cần thống nhất trước khi cho thuê

- **Google Meet 60 phút**: giáo viên dùng tài khoản miễn phí cần chia buổi hoặc mua gói Workspace; Masu không cung cấp video.
- **Gói hosting**: không dùng Vercel Hobby khi đã thu tiền; vi phạm điều khoản có thể bị dừng dịch vụ.
- **Email đăng nhập**: chưa cấu hình SMTP riêng thì học viên không nhận được email xác nhận khi đăng ký cùng lúc.
- **Dữ liệu học viên**: email và kết quả học là dữ liệu cá nhân; cần điều khoản sử dụng, chính sách quyền riêng tư và người phụ trách yêu cầu xóa dữ liệu theo quy định hiện hành tại Việt Nam trước khi nhận học viên thật.
- **Quota**: trang quản trị chưa có trần chi phí TTS; khi bật TTS web phải thêm hạn mức ký tự theo tháng như đã đề xuất.

## SEO khi lên production

Đã có: metadata và mô tả từng trang công khai, `metadataBase` theo `SITE_URL`, canonical (trang bài bỏ tham số `?version=`), Open Graph tiếng Việt, `sitemap.xml` (trang công khai và bài đặt công khai, làm mới mỗi giờ), `robots.txt` chặn khu vực riêng tư, JSON-LD (Organization/WebSite ở trang chủ, FAQPage ở `/for-teachers`, LearningResource ở trang bài) và trang giới thiệu cho giáo viên `/for-teachers`. Bài của giáo viên mặc định riêng tư nên không vào sitemap; chỉ bài giáo viên chủ động công khai mới được lập chỉ mục.

Chưa có: ảnh Open Graph riêng (cần font hỗ trợ tiếng Việt), trang hồ sơ giáo viên công khai, đo Core Web Vitals trên domain thật.

## Nguồn giá và giới hạn

- [Vercel Hobby (phi thương mại)](https://vercel.com/docs/accounts/plans/hobby), [Vercel cron](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Supabase pricing](https://supabase.com/pricing), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing)
- [Azure Speech pricing](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services), [Azure TTS: chữ Hán tính 2 ký tự](https://docs.azure.cn/en-us/ai-services/speech-service/text-to-speech)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Google Meet: giới hạn thời gian và gói](https://koalendar.com/blog/google-meet-pricing-plans) (nguồn tổng hợp; đối chiếu trang Google Workspace khi mua)

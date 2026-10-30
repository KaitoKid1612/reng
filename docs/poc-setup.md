# Kế hoạch POC — công cụ, chi phí và các bước dựng

Ngày kiểm tra giá: 29/10/2026. Quy mô POC: **10 giáo viên thuê, khoảng 5 học viên mỗi giáo viên (~50 học viên), 1 quản trị viên**. Giá dưới đây lấy từ trang chính thức hoặc tổng hợp công khai, chưa phải báo giá; kiểm tra lại trước khi đăng ký gói. Tỷ giá tham khảo 26.000 đ/USD.

## Công cụ đề xuất

| Hạng mục | Công cụ | Gói cho POC | Ước tính/tháng | Lý do và lưu ý |
|---|---|---|---|---|
| Web/hosting | Vercel | **Pro** (1 thành viên) | 20 USD | Gói Hobby chỉ cho dùng cá nhân, phi thương mại; giáo viên trả tiền thuê là dùng thương mại. Cron hiện chạy hằng ngày/hằng tuần, Pro chạy đúng giờ |
| Database + đăng nhập | Supabase | **Pro** | 25 USD | Gói Free tạm dừng project sau 7 ngày không hoạt động và giới hạn 500 MB database; dữ liệu học viên thật cần gói có backup. Kiểm tra chính sách backup trên trang giá khi đăng ký |
| Email (nhắc bài + email đăng nhập) | Resend | Free | 0 đ | 100 email/ngày, 3.000/tháng, 1 domain: đủ cho ~60 tài khoản. Dùng Resend làm SMTP riêng cho Supabase Auth vì SMTP mặc định của Supabase chỉ ~2 email/giờ và không dành cho production |
| Video lớp học | Google Meet của giáo viên (ngoài Reng) | Tài khoản Google riêng của giáo viên | Không phải chi phí Reng | Reng không tích hợp Google: giáo viên tự tạo link Meet trong tài khoản Google của mình rồi dán vào cài đặt lớp, Reng chỉ lưu và hiện link cho học viên trong lớp. Lưu ý cho giáo viên: tài khoản cá nhân miễn phí giới hạn **60 phút** cho cuộc gọi từ 3 người (lớp 1 giáo viên + 5 học viên sẽ bị cắt); gói Business Starter khoảng 7–8,4 USD/người/tháng cho cuộc gọi nhóm tới 24 giờ |
| Đọc audio tiếng Trung (khi bật TTS web) | Azure Speech | **F0** (miễn phí) | 0 đ | 0,5 triệu ký tự/tháng; hết hạn mức thì Azure từ chối, không tính tiền. POC 10 giáo viên dùng chưa tới 5% hạn mức. Hiện nút Nghe dùng giọng có sẵn trên thiết bị |
| Lưu audio | Cloudflare R2 | Free | 0 đ | 10 GB, 10 triệu lượt đọc/tháng, băng thông ra miễn phí |
| SEO | Google Search Console, Bing Webmaster Tools | Miễn phí, tùy chọn | 0 đ | Chỉ để theo dõi SEO, không phải phụ thuộc của ứng dụng: xác minh domain bằng thẻ meta, nộp sitemap, theo dõi lập chỉ mục |
| Thanh toán thuê | Chuyển khoản + trang quản trị | — | 0 đ | POC không tích hợp cổng thanh toán; quản trị viên duyệt giáo viên, ghi hạn thuê và ghi chú thanh toán |
| Tên miền | Nhà đăng ký tùy chọn | Theo năm | Theo nhà đăng ký | Cần cho email gửi đi (SPF/DKIM/DMARC), Search Console và link tuyệt đối |

**Tổng chi phí nền tảng: khoảng 45 USD/tháng (~1,2 triệu đ)** cộng tên miền. Google Workspace (nếu giáo viên cần buổi học dài hơn 60 phút) là chi phí riêng của giáo viên, không thuộc Reng. Chi phí audio và email ở quy mô POC nằm trong gói miễn phí.

Có thể chạy thử nội bộ (không thu tiền, không dữ liệu học viên thật) bằng Vercel Hobby và Supabase Free trước khi mời giáo viên thuê; chuyển sang gói trả phí trước khi nhận học viên thật.

## Các bước dựng POC

1. Tạo Supabase project gói Pro, backup rồi áp dụng toàn bộ migration trong `supabase/migrations` theo thứ tự (đến `202610290006_daily_practice.sql`).
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

## Production thử (29/10/2026)

Đã dựng để giáo viên pilot dạy thật: **https://reng-cyan.vercel.app**.

- Vercel project `reng` (team của tài khoản `kaitokid1612`), gói **Hobby**, nối repo GitHub nên mỗi lần push `main` tự deploy production. Hàm server chạy ở `sin1` (`vercel.json`), cạnh database. Biến môi trường production: `LESSON_SOURCE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (lấy bằng `npx supabase projects api-keys --reveal`; không có `--reveal` CLI trả khóa bị che và mọi truy vấn báo "Invalid API key"), `SITE_URL`, `CRON_SECRET`, `EMAIL_LINK_SECRET`. Chưa đặt `EMAIL_PROVIDER` nên email nhắc bài chưa gửi.
- Supabase project `reng` (Singapore, gói **Free**). Tài khoản Supabase hiện có đã đủ 2 project Free nên project staging của sản phẩm khác được tạm dừng theo yêu cầu của người dùng. Đã áp dụng đủ migration; cấu hình Auth production nằm trong khối `[remotes.production]` của `supabase/config.toml`, xem trước bằng `npx supabase config diff --project-ref <ref>` rồi `npx supabase config push`.
- **Tắt xác nhận email** cho tới khi có SMTP riêng: học viên đăng ký là vào học ngay (ứng dụng chuyển thẳng tới trang tiếp theo khi Supabase trả phiên đăng nhập). Gói Free không cho đổi mẫu email khi dùng email mặc định, nên quên mật khẩu chưa dùng được với học viên; bật lại xác nhận email sau khi cấu hình Resend và tên miền.
- Cron trên Hobby chạy tối đa 1 lần/ngày và lệch trong vòng 1 giờ (bài luyện hằng ngày 6:00–6:59 sáng).
- Trước khi thu tiền hoặc nhận nhiều học viên: chuyển Vercel Pro và Supabase Pro (backup), cấu hình Resend + tên miền, bật lại xác nhận email.

### Vận hành khi chưa có email riêng (rà soát 30/10/2026)

- **Hệ quả đang có:** (1) quên mật khẩu không dùng được: thư không tới học viên, và mẫu email mặc định gửi link có `code` trong khi `/auth/confirm` chỉ nhận `token_hash` (mẫu trong `supabase/templates` dùng `token_hash`); (2) không xác nhận email nên có thể đăng ký bằng email của người khác — trước khi gắn dữ liệu riêng (lịch sử học tập, quyền quản trị, chia sẻ bài) theo email, xác nhận đúng chủ tài khoản đăng nhập được; (3) ba cron email trả 503 mỗi ngày, trang cài đặt thông báo đã báo "chưa bật email".
- **Học viên quên mật khẩu lúc này:** người vận hành đặt mật khẩu tạm trong Supabase Dashboard › Authentication › Users cho đúng tài khoản, gửi riêng cho học viên và nhắc đổi lại.
- **Bật email:** mua tên miền → xác minh trong Resend (SPF, DKIM, DMARC) → Supabase Authentication › SMTP Settings dùng SMTP Resend → trong `[remotes.production.auth.email]` bật `enable_confirmations` và trỏ `content_path` của hai mẫu tới `supabase/templates/*.html`, xem `npx supabase config diff --project-ref <ref>` rồi `config push` → đặt `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` trên Vercel và deploy lại. Xử lý các mục email còn mở ở [rà soát 30/10](testing/code-review-2026-10-30.md) trước khi bật nhắc bài cho lớp thật.
- **Migration và dữ liệu thật:** gói Free không có bản sao lưu để tự khôi phục như Pro. Trước `npx supabase db push` hoặc nhập dữ liệu, chạy `npx supabase db dump --linked -f <file>` (và `--data-only` cho dữ liệu) rồi lưu file ngoài repository. `db push` áp mọi migration chưa có trên production trong `supabase/migrations`, nên chỉ chạy khi các migration đó đã hoàn chỉnh và được test local.

## Cảnh báo cần thống nhất trước khi cho thuê

- **Google Meet 60 phút**: báo trước cho giáo viên; ai dùng tài khoản miễn phí cần chia buổi hoặc tự mua gói Workspace. Reng không cung cấp video và không cần tài khoản Google.
- **Gói hosting**: không dùng Vercel Hobby khi đã thu tiền; vi phạm điều khoản có thể bị dừng dịch vụ.
- **Email đăng nhập**: chưa cấu hình SMTP riêng thì học viên không nhận được email xác nhận khi đăng ký cùng lúc.
- **Dữ liệu học viên**: email và kết quả học là dữ liệu cá nhân; cần điều khoản sử dụng, chính sách quyền riêng tư và người phụ trách yêu cầu xóa dữ liệu theo quy định hiện hành tại Việt Nam trước khi nhận học viên thật.
- **Quota**: trang quản trị chưa có trần chi phí TTS; khi bật TTS web phải thêm hạn mức ký tự theo tháng như đã đề xuất.

## SEO khi lên production

Đã có: metadata và mô tả từng trang công khai, `metadataBase` theo `SITE_URL`, canonical (trang bài bỏ tham số `?version=`), Open Graph tiếng Việt, `sitemap.xml` (trang công khai và bài đặt công khai, làm mới mỗi giờ), `robots.txt` chặn khu vực riêng tư, JSON-LD (Organization/WebSite ở trang chủ, FAQPage ở `/for-teachers`, LearningResource ở trang bài) và trang giới thiệu cho giáo viên `/for-teachers`. Bài của giáo viên mặc định riêng tư nên không vào sitemap; chỉ bài giáo viên chủ động công khai mới được lập chỉ mục.

Đã có thêm favicon/icon và ảnh chia sẻ Open Graph 1200×630 có logo. Chưa có: trang hồ sơ giáo viên công khai, đo Core Web Vitals trên domain thật.

## Nguồn giá và giới hạn

- [Vercel Hobby (phi thương mại)](https://vercel.com/docs/accounts/plans/hobby), [Vercel cron](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Supabase pricing](https://supabase.com/pricing), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing)
- [Azure Speech pricing](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services), [Azure TTS: chữ Hán tính 2 ký tự](https://docs.azure.cn/en-us/ai-services/speech-service/text-to-speech)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Google Meet: giới hạn thời gian và gói](https://koalendar.com/blog/google-meet-pricing-plans) (nguồn tổng hợp; đối chiếu trang Google Workspace khi mua)

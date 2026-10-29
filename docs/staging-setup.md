# Chuẩn bị staging và nghiệm thu dịch vụ

Hai phạm vi được tách rõ: các bước giai đoạn 2–5 phục vụ kiểm chứng nền Nhật hiện có; phần nghiệm thu dịch vụ ở cuối dành cho chức năng Việt–Trung mới chưa triển khai. Không chạy migration/API dự kiến hoặc bật provider thật chỉ vì tài liệu đã mô tả.

Không có credentials trong workspace tại thời điểm bắt đầu giai đoạn 2. Tài liệu này là hướng dẫn, chưa phải bằng chứng đã triển khai cloud.

1. Tạo Supabase project staging riêng, xác nhận đúng project trước khi áp dụng migrations trong supabase/migrations theo thứ tự. Giữ backup trước nâng schema. Không dùng project production cho kiểm thử.
2. Tạo tài khoản giảng viên bằng người vận hành, cấp profiles.role phía quản trị. Đây là cơ chế nền hiện tại; không phải yêu cầu onboarding giáo viên tự phục vụ của dịch vụ mới. Kiểm tra own profile, own lesson và API notes bằng hai tài khoản khác nhau.
3. Tạo Azure Speech resource, điền khóa/vùng trong .env.local ở máy vận hành. Chạy audio:plan trước generate; sinh kana vào local hoặc R2, nghe duyệt ký tự đứng riêng/trợ từ trước dùng với lớp.
4. Tạo R2 bucket/domain staging và khóa chỉ có quyền bucket đó; đặt public base audio. Không public transcript/metadata test. Kiểm tra cache headers, audio 404/retry và chạy lại không sinh trùng.
5. Đặt LESSON_SOURCE, Supabase URL/secret/publishable key và audio base trên hosting staging; xác minh gói hosting phù hợp sử dụng. Không đưa secret vào NEXT_PUBLIC_ hoặc git.
6. Publish một bài đã duyệt bằng script, kiểm tra reader/slide/presenter/print, quyền notes và nội dung version cũ. Không tự đổi nguồn sang local khi cloud lỗi.
7. Chrome/Safari thật, điện thoại 360px, máy chiếu 1280×720, mạng 4G: đo tải trang/phát audio và kiểm tra bàn phím, popup, fullscreen, PDF.
8. Một buổi dạy thử; ghi vấn đề vào checklist phase-1/phase-2. Chỉ nghiệm thu sau khi có bằng chứng, người phụ trách và cách khôi phục.

## Giai đoạn 3: lớp học

1. Backup database, áp dụng migration 0003 và 0004 trên staging, kiểm tra lại bằng tài khoản giảng viên và hai học viên thử ở hai lớp.
2. Auth: bật xác nhận email, đặt Site URL và Redirect URLs (`https://<domain>/**`). Sao chép nội dung supabase/templates/confirmation.html và recovery.html vào template Confirm signup/Reset password trên dashboard; link phải dùng token hash và trỏ về /auth/confirm.
3. Cấu hình SMTP riêng (SPF/DKIM/DMARC) trước khi mời học viên; SMTP mặc định của Supabase có hạn mức thấp. Gửi thử tới hộp thư thật, kiểm tra thư mục spam.
4. Đặt SITE_URL bằng domain staging cho link email. Cấp role giảng viên bằng thao tác quản trị phía server (SQL/service key); không dùng scripts/seed-local.ts cho cloud.
5. Chạy luồng: tạo lớp, thêm bài, giao practice/test, học viên đăng ký/vào lớp/làm/nộp, mất mạng và hai tab, báo cáo/CSV. Ghi kết quả vào testing/phase-3.md.
6. Có bản backup và một lần khôi phục thử trên môi trường riêng trước khi nhận lớp thật.

## Giai đoạn 4: soạn bài và email

1. Áp dụng migration 0005 trên staging sau backup. Thử tạo bài, lưu nháp ở hai tab, xuất bản và nhập CSV bằng tài khoản giảng viên thử.
2. Resend: xác minh domain gửi, thêm SPF, DKIM, DMARC; đặt EMAIL_PROVIDER=resend, EMAIL_FROM, RESEND_API_KEY chỉ trên server. Gửi thử tới hộp thư thử (Gmail và một hộp khác), kiểm tra spam, header List-Unsubscribe và nút hủy một chạm.
3. Webhook Resend trỏ tới /api/webhooks/email với các sự kiện delivered, opened, bounced, complained; đặt RESEND_WEBHOOK_SECRET (whsec_…). Thử bounce bằng địa chỉ thử của nhà cung cấp.
4. Đặt CRON_SECRET và EMAIL_LINK_SECRET ngẫu nhiên, SITE_URL đúng domain; vercel.json đã có lịch UTC. Xác minh gói hosting cho phép cron theo lịch này. Không bật nhắc cho học viên thật trên staging.
5. Ghi kết quả vào testing/phase-4.md (G4-15).

Chưa tạo tài khoản/bucket/project hoặc apply migration vào dịch vụ thật trong đợt local này. Giai đoạn 3 mới kiểm chứng trên Supabase local (Supabase CLI).

## Nghiệm thu dịch vụ Việt–Trung — chưa chạy

1. Chốt migration/profile v2 và backfill trước staging; xác minh hai giáo viên không đọc lớp/nháp/media nhau, một người vừa học vừa dạy hoạt động đúng. Không dùng role client để cấp quyền.
2. Tạo lớp 10 chỗ bằng tài khoản thử, join đồng thời chỗ cuối, rời/rejoin/thu hồi mã và link Meet theo checklist SV. Không dùng học sinh thật để seed/test tự động.
3. Giáo viên thử tạo bài theo 5 bước, dán chữ Hán/pinyin/nghĩa Việt, dựng lại giữ sửa tay, duyệt choice/fill/audio. Đo AUTHOR-08 trước mở nhiều mẫu; khóa cũ Nhật phải chạy nguyên trạng.
4. Preview học sinh/slide/PDF và dạy qua share tab Meet trên thiết bị thật; notes/test không lộ, font/pinyin/audio đúng locale. Lưu nháp/publish/giao là ba trạng thái riêng.
5. Copy/view/revoke đúng quyền version; copy có media/nguồn nhưng không có thông tin lớp hoặc notes riêng. Sửa nguồn không đổi assignment đang làm.
6. Chỉ bật scan/OCR sau cấu hình quota, storage private, worker/provider và chính sách xử lý tệp; thử dữ liệu được phép dùng, đo thời gian sửa/chi phí, xác minh crop lời giải và retention.
7. Test submit retry, draft conflict, email opt-in/unsubscribe/membership; backup/restore trên môi trường riêng trước lớp thật. Ghi bằng chứng ở testing/teaching-service.md, không thay NOT RUN bằng PASS theo mô tả.

Các quyết định provider/font/voice/gói hosting phải được ghi trong bảng mở ở [rà soát tài liệu](documentation-review.md); chưa có thao tác cloud nào trong đợt chỉ cập nhật tài liệu.

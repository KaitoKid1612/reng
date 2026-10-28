# Truy vết và nghiệm thu giai đoạn 4

PASS local không thay thế nghiệm thu gửi email thật, DNS hoặc lịch cron trên hosting. BD/DD tại ../basic-design/phase-4.md và ../detail-design/phase-4.md.

| ID | Yêu cầu | Kiểm tra | Kết quả |
|---|---|---|---|
| G4-01 | ADMIN-01 | Tạo bài mới, soạn từ vựng/ngữ pháp/câu luyện/slide, xuất bản không mở editor code | PASS Supabase local — bài tạo từ trang trắng hiện ở /lessons và trang đọc cho khách |
| G4-02 | ADMIN-02 | Xem trước slide khi soạn bằng cùng component trình chiếu | PASS Chromium — xem trước đổi theo nội dung đang gõ, không lỗi console/hydrate |
| G4-03 | Sắp xếp slide | Kéo thả (chuột, chạm, bàn phím) và nút Lên/Xuống | PASS phạm vi đã chạy — nút Lên đổi thứ tự; kéo thả dnd-kit có ID SSR ổn định, chưa có E2E thao tác kéo |
| G4-04 | Lưu nháp/xuất bản | Nháp chưa đủ vẫn lưu; xuất bản liệt kê lỗi theo mục; thiếu audio là cảnh báo | PASS — logic và E2E (lỗi tiêu đề Nhật/slide trước khi đủ) |
| G4-05 | Xung đột revision | Hai tab: tải bản máy chủ hoặc ghi đè có chủ đích | PASS Chromium — cả hai lựa chọn |
| G4-06 | ADMIN-03, VOCAB-05 | CSV/TSV/`;`, tiêu đề tiếng Việt, lỗi từng dòng, trùng, file không phải UTF-8 | PASS — unit test và E2E nhập 1/3 dòng hợp lệ |
| G4-07 | DATA | Không xóa mục đang được slide dùng; sửa chữ Nhật xóa audio cũ; ID ngẫu nhiên không tái sử dụng | PASS logic |
| G4-08 | DATA-01 | Xuất bản bản mới không đổi phiên bản lớp/bài giao đang ghim | PASS database — RPC publish_lesson (giai đoạn 2) và FK/snapshot giai đoạn 3 |
| G4-09 | NOTI-01/02 | Email chỉ gửi khi đã bật và có việc; due_only | PASS Supabase local — học viên bật due_only nhận đúng một thư “… sắp đến hạn” qua Mailpit; học viên đã hủy không nhận thư |
| G4-10 | Hủy | Link/header một chạm tắt ngay, job chưa gửi bị hủy | PASS — POST một chạm 200, header List-Unsubscribe/List-Unsubscribe-Post có trong thư, trang xác nhận tắt mọi tùy chọn và hủy job chưa gửi |
| G4-11 | Job | Cron chạy lặp/timeout không gửi trùng; lease, retry giới hạn | PASS — chạy cron hai lần chỉ một thư; database: không nhận job đang lease, hết lease nhận lại, backoff và giới hạn lượt; sai bearer 401 |
| G4-12 | Webhook | Chữ ký Svix, bounce/complaint tạm dừng gửi | PASS — sự kiện không chữ ký 401, bounce có chữ ký tạm dừng gửi và hiện thông báo trong cài đặt; unit test chữ ký Svix/timestamp |
| G4-13 | NOTI-03 | Tóm tắt lớp cho giảng viên chỉ khi có việc | PASS — tóm tắt lớp “1 bài nộp mới, 1 học viên cần chú ý” kèm câu sai nhiều; tổng kết tuần cho học viên có hoạt động |
| G4-14 | Thiết bị | Editor/nhập CSV ở 360px và bàn phím | PASS smoke Chromium — editor, nhập CSV, cài đặt thông báo không cuộn ngang ở 360px; editor không lỗi console; bàn phím đầy đủ chưa audit |
| G4-15 | Vận hành thật | Resend, SPF/DKIM/DMARC, cron hosting, hộp thư thử | Chờ cấu hình |

## Bằng chứng

- 28/10/2026: npm run check qua (63 test logic/database, gồm PGlite cho email_log/claim). npm run test:e2e:supabase 15/15 (lớp học, soạn bài, email qua Mailpit); npm run test:e2e 21/21. Production build thành công, các route soạn bài render theo request.
- Email thật chụp từ Mailpit để rà giao diện: tiêu đề có tên và con số, một nút chính, chân thư có lý do nhận, link đổi tần suất và link hủy riêng dòng.
- Lỗi tìm thấy khi kiểm chứng và đã sửa: dnd-kit sinh ID mô tả khác nhau giữa server/client (lệch hydrate) — truyền `id` ổn định; editor mount lại sau khi xuất bản làm mất thông báo — tải bản máy chủ bằng action thay vì đổi key; nút bị disabled trong lúc lưu làm mất focus bàn phím — dùng aria-disabled.
- Ảnh rà giao diện: test-results/editor-desktop.png (gitignore).

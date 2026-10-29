# Truy vết và nghiệm thu giai đoạn 3

> Phạm vi nền Nhật: tài liệu giai đoạn này giữ thiết kế/bằng chứng triển khai trước dịch vụ Việt–Trung; không chứng minh tính năng mới đã có. Thiết kế hiện hành xem [BD dịch vụ](../basic-design/teaching-service.md), [DD dịch vụ](../detail-design/teaching-service.md) và [checklist dịch vụ](../testing/teaching-service.md). Kết quả PASS/Chưa chạy lịch sử được giữ nguyên.

> Tài liệu này mô tả nền lớp học đã triển khai với role student/teacher hiện tại. Yêu cầu dịch vụ ngày 29/10/2026 bổ sung đăng ký giáo viên, vừa học vừa dạy và chia sẻ theo [BD dịch vụ](../basic-design/teaching-service.md); chưa triển khai. Kết quả AUTH-01 cũ chỉ chứng minh luồng cấp quyền thủ công, không phải onboarding giáo viên mới.

PASS local không thay thế nghiệm thu Supabase cloud, email thật hoặc lớp học thật. BD/DD tại ../basic-design/phase-3.md và ../detail-design/phase-3.md.

| ID | Yêu cầu | Kiểm tra | Kết quả |
|---|---|---|---|
| G3-01 | EX-01/02/03 | Chuẩn hóa NFKC, đáp án thay thế, choice nhiều đáp án, match/order từ chối trùng/ngoài phạm vi, trống = 0, xét đạt không làm tròn | PASS logic — tests/grading.test.ts; 66,67% không làm tròn thành đạt 67% |
| G3-02 | DATA-01 | Snapshot bất biến sau xuất bản, sửa/xuất bản bài học không đổi đề/điểm cũ | PASS database — trigger chặn sửa điều kiện/snapshot/lượt đã nộp/answers; practice sao chép câu từ phiên bản lớp ghim |
| G3-03 | AUTH-01 | Đăng ký luôn là học viên, xác nhận email, quên/đặt lại mật khẩu, không tự đổi role | PASS Supabase local — đăng ký, thư xác nhận qua Mailpit, link token hash về đúng trang; quên/đặt lại mật khẩu rồi đăng nhập bằng mật khẩu mới; role chỉ cấp bằng service key |
| G3-04 | CLASS-01 | Tạo lớp, mã ngẫu nhiên, đổi/thu hồi mã, giới hạn thử, thông báo không lộ lớp | PASS — database (mã sai không lộ lớp, 8 lần sai/15 phút bị khóa) và luồng tạo lớp/vào lớp bằng mã chữ thường; nút đổi/thu hồi mã chưa có E2E riêng |
| G3-05 | CLASS-07 | Thêm bài/phiên bản/thứ tự/available_at, nâng phiên bản không đổi bài đã giao | PASS phạm vi đã chạy — thêm bài vào lớp và giao bài theo phiên bản ghim; nâng phiên bản dựa trên FK/snapshot, chưa có phiên bản 2 trong dữ liệu mẫu để chạy E2E |
| G3-06 | EX-06/09 | Practice/test, hạn, nộp muộn, số lượt, chính sách phản hồi, đóng bài | PASS — practice nhiều lượt, test một lượt after_due, quá hạn bị chặn (database), đóng bài từ T03 |
| G3-07 | DATA-03 | Hai tab bắt đầu chỉ một lượt; nộp trùng/timeout chấm một lần, không nhân thẻ lỗi | PASS database — resumed thay vì lượt mới, unique partial index, nộp lại trả already_submitted, không nhân answers/thẻ lỗi |
| G3-08 | DATA-02 | Lưu draft theo revision, xung đột hai tab, mất mạng giữ bản cục bộ và không ghi đè bản mới | PASS Chromium — tab thứ hai nhận xung đột và tải bản mới; mất mạng hiện trạng thái, có mạng lại tự lưu |
| G3-09 | Bảo mật | Test không lộ answer/explain/kết quả trước thời điểm phản hồi qua HTML/API; lớp khác 404; học viên không đọc bảng gốc | PASS — HTML làm bài/kết quả test không có đáp án/giải thích; học viên lớp khác 404 cả trang và API; khách 401, khác origin 403; RLS chặn đọc bảng gốc |
| G3-10 | EX-07, VOCAB-02/03/04 | FSRS lưu đủ state, request_id chống ghi trùng, thẻ lỗi 3 lần đúng thì giải quyết, lỗi test ẩn tới hạn | PASS — logic/database; E2E: câu sai vào sổ lỗi, ôn đúng ghi chuỗi 1/3, lỗi bài test chỉ hiện số lượng tới khi có kết quả |
| G3-11 | CLASS-02/03 | Lượt mới nhất, trung bình phần trăm, nhãn bỏ bài/chưa đạt/yếu nghe/đạt/chưa có dữ liệu | PASS — logic và T03 (2/2 bài, 50%, Chưa đạt); yếu nghe chỉ kiểm ở hàm thuần vì chưa có câu nghe |
| G3-12 | CLASS-04 | Câu sai ≥ 50% chỉ tính lượt mới nhất mỗi học viên | PASS — RPC database và T03 hiện “1/1 học viên sai” |
| G3-13 | CLASS-05 | CSV đúng dấu tiếng Việt, ô trống khi chưa có điểm, chặn công thức | PASS — logic và tải CSV thật: BOM UTF-8, tên tiếng Việt, nhãn |
| G3-14 | Nhập liệu | wanakana romaji → kana, không can thiệp IME Nhật, dán kanji | PASS logic/Chromium — gõ watashi ra わたし; IME Nhật thật và bàn phím Android chưa kiểm chứng trên thiết bị |
| G3-15 | Thiết bị | 360px, bàn phím, focus, thông báo trạng thái trên trang học viên/giảng viên | PASS smoke Chromium — 9 trang không cuộn ngang ở 360px, focus vào nút xác nhận nộp, không lỗi console; chưa audit accessibility đầy đủ |
| G3-16 | Luồng trọn | Giảng viên + hai học viên hai lớp trên Supabase local | PASS — 8 kịch bản e2e-supabase trên dev và production build |
| G3-17 | Vận hành thật | Supabase cloud, template email/SMTP, backup và khôi phục thử, lớp thật | Chờ cấu hình |

## Bằng chứng

Ngày kiểm chứng 28/10/2026, Node 24.16.0, dependency theo lockfile.

- npm run check: format, ESLint (gồm rule React Compiler), next typegen, TypeScript và 47 test logic/database qua. Test database chạy trên PGlite với auth stub.
- Migration 0001–0004 chạy trên Supabase local qua Supabase CLI 2.122.0/Podman (Postgres 17, GoTrue, PostgREST, Mailpit). REST xác nhận anon bị từ chối với RPC và bảng giai đoạn 3; authenticated chỉ có SELECT theo policy.
- npm run test:e2e: 21 test Chromium qua, gồm regression kana/audio/bài học và trạng thái lớp học khi chưa cấu hình Supabase.
- npm run test:e2e:supabase: 8 test qua trên dev server, chạy lại 8/8 trên `next start` sau production build. Luồng gồm giảng viên tạo hai lớp, ghim bài, giao practice/test; học viên đăng ký qua email, vào lớp, làm bài, sổ lỗi, ôn tập, hai tab, mất mạng; học viên lớp khác và khách bị từ chối; báo cáo/CSV/đóng bài; đặt lại mật khẩu; 360px.
- npm run build: thành công; chỉ /, /kana, /sources, /forgot-password, /verify-email, /_not-found được prerender, các trang tài khoản/lớp render theo request.
- Ảnh rà giao diện (gitignore): test-results/classroom-class-desktop.png, classroom-attempt-desktop.png, classroom-report-desktop.png, classroom-report-mobile.png, classroom-results-mobile.png.
- Lỗi tìm thấy khi kiểm chứng và đã sửa: redirect sau xác nhận email đổi host (request.url của Next dev là localhost); form giao bài mất lựa chọn khi vừa thêm bài vào lớp; trang tài khoản bị prerender khi build không có cấu hình Supabase; hộp xác nhận nộp bị thanh công cụ che.

## Phạm vi chưa nghiệm thu

Chưa áp dụng migration lên Supabase cloud, chưa cấu hình SMTP/SPF/DKIM hay template email trên dashboard, chưa backup/khôi phục thử. Chưa kiểm chứng Safari, IME tiếng Nhật thật, bàn phím Android, máy chiếu hoặc lớp học thật. Đổi/thu hồi mã lớp, nâng phiên bản bài cho lớp và nhãn bỏ bài theo thời gian thật mới kiểm chứng ở mức database/logic.

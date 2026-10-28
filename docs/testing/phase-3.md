# Truy vết và nghiệm thu giai đoạn 3

PASS local không thay thế nghiệm thu Supabase cloud, email thật hoặc lớp học thật. BD/DD tại ../basic-design/phase-3.md và ../detail-design/phase-3.md.

| ID | Yêu cầu | Kiểm tra | Kết quả |
|---|---|---|---|
| G3-01 | EX-01/02/03 | Chuẩn hóa NFKC, đáp án thay thế, choice nhiều đáp án, match/order từ chối trùng/ngoài phạm vi, trống = 0, xét đạt không làm tròn | PASS logic — tests/grading.test.ts: NFKC, đáp án khai báo, tập lựa chọn, match/order từ chối trùng, trống = 0, 66,67% không làm tròn thành đạt 67% |
| G3-02 | DATA-01 | Snapshot bất biến sau xuất bản, sửa/xuất bản bài học không đổi đề/điểm cũ | PASS database — trigger chặn sửa điều kiện/snapshot/lượt đã nộp/answers; còn chờ kiểm chứng luồng UI |
| G3-03 | AUTH-01 | Đăng ký luôn là học viên, xác nhận email, quên/đặt lại mật khẩu, không tự đổi role | Chưa chạy |
| G3-04 | CLASS-01 | Tạo lớp, mã ngẫu nhiên, đổi/thu hồi mã, giới hạn thử, thông báo không lộ lớp | PASS phạm vi database — mã sai không lộ lớp, 8 lần sai trong 15 phút bị khóa, giảng viên không vào lớp; UI chưa chạy |
| G3-05 | CLASS-07 | Thêm bài/phiên bản/thứ tự/available_at, nâng phiên bản không đổi bài đã giao | Chưa chạy |
| G3-06 | EX-06/09 | Practice/test, hạn, nộp muộn, số lượt, chính sách phản hồi, đóng bài | Chưa chạy |
| G3-07 | DATA-03 | Hai tab bắt đầu chỉ một lượt; nộp trùng/timeout chấm một lần, không nhân thẻ lỗi | PASS database — resumed thay vì lượt mới, unique partial index một lượt mở, nộp lại trả already_submitted, không nhân answers/thẻ lỗi; chưa chạy hai tab thật |
| G3-08 | DATA-02 | Lưu draft theo revision, xung đột hai tab, mất mạng giữ bản cục bộ và không ghi đè bản mới | Chưa chạy |
| G3-09 | Bảo mật | Test không lộ answer/explain/kết quả trước thời điểm phản hồi qua HTML/API; lớp khác 404; học viên không đọc bảng gốc | Chưa chạy |
| G3-10 | EX-07, VOCAB-02/03/04 | FSRS lưu đủ state, request_id chống ghi trùng, thẻ lỗi 3 lần đúng thì giải quyết, lỗi test ẩn tới hạn | PASS logic/database — state FSRS khóa phiên bản, request_id trùng trả duplicate, revision cũ conflict, chuỗi 3 lần; UI chưa chạy |
| G3-11 | CLASS-02/03 | Lượt mới nhất, trung bình phần trăm, nhãn bỏ bài/chưa đạt/yếu nghe/đạt/chưa có dữ liệu | PASS logic — lượt mới nhất, trung bình phần trăm, thứ tự nhãn, vào lại lớp; chưa chạy trang T03 |
| G3-12 | CLASS-04 | Câu sai ≥ 50% chỉ tính lượt mới nhất mỗi học viên | PASS database — RPC thống kê chỉ dùng lượt nộp mới nhất; chưa chạy trang T03 |
| G3-13 | CLASS-05 | CSV đúng dấu tiếng Việt, ô trống khi chưa có điểm, chặn công thức | PASS logic — BOM, ô trống, chặn = + - @, số đã nộp/được giao tách cột tránh bị hiểu là ngày; chưa tải file thật |
| G3-14 | Nhập liệu | wanakana romaji → kana, không can thiệp IME Nhật, dán kanji | Chưa chạy |
| G3-15 | Thiết bị | 360px, bàn phím, focus, thông báo trạng thái trên trang học viên/giảng viên | Chưa chạy |
| G3-16 | Luồng trọn | Giảng viên + hai học viên hai lớp trên Supabase local | Chưa chạy |
| G3-17 | Vận hành thật | Supabase cloud, template email/SMTP, backup và khôi phục thử, lớp thật | Chờ cấu hình |

## Bằng chứng

- 28/10/2026: npm run check qua (format, ESLint, TypeScript, 42 test logic/database). Migration 0001–0004 chạy trên Supabase local qua Supabase CLI/Podman (Postgres 17, Auth, PostgREST); kiểm tra REST xác nhận anon bị từ chối với RPC và bảng giai đoạn 3, authenticated chỉ có SELECT theo policy.

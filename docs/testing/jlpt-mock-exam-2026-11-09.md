# Thi thử JLPT — kiểm chứng 09/11/2026

Người dùng yêu cầu làm chế độ luyện thi JLPT (ý tưởng #1 của [roadmap](../09-roadmap.md#ý-tưởng-bổ-sung-cho-pilot--06112026)) và chọn: giới hạn thời gian theo lượt, đề tự động từ ngân hàng, điểm từng phần kèm ước tính đỗ, lịch thi chung. Thiết kế ở [DD giai đoạn 3](../detail-design/phase-3.md#thi-thử-jlpt--09112026). Commit ở máy, chưa push.

## Kiểm chứng

| Phần | Cách làm | Kết quả |
|---|---|---|
| Logic | `tests/jlpt.test.ts`: phân phần với ngân hàng N5 và N4 thật trong repo (mọi câu trừ chính tả đều có phần), đề N5 25/20/20, thứ tự ba phần, đề thứ hai chỉ lặp 10 câu chữ Hán – từ vựng và 0 câu nghe, đoạn văn N4 đi liền nhau (thêm 200 seed ngẫu nhiên: 0 đề tách đoạn văn), đoạn văn có hai dạng câu, ước tính thang 180 và điểm sàn, lịch thi theo ngày Việt Nam, mốc tự nộp, đồng hồ | 8/8 đạt |
| Database | `tests/jlpt-exam-migration.test.ts` (PGlite, đủ 30 migration): giáo viên lớp khác, cấp/số phút/công bố sai, hạn đã qua, bài không trong lớp, câu lạ hoặc trùng; đề là bài kiểm tra một lượt không nộp muộn, giữ thứ tự câu; không thêm giới hạn cho bài đã giao, không sửa được `assignment_exams`; phút thêm sau giới hạn vẫn lưu, sau đó `past_due`; cron nộp với `submitted_at` đúng lúc hết giờ, không muộn; đề công bố sau hạn giữ thẻ lỗi tới hạn; bài kiểm tra thường bắt đầu 5 giờ trước vẫn lưu; `authenticated` không đọc bảng, không gọi hàm. Supabase local (có default privileges thật): `authenticated` không gọi được `publish_jlpt_mock_exam` | Đạt; 24 test migration cũ vẫn đạt |
| Luồng | `e2e-supabase/jlpt-mock-exam.spec.ts`: giáo viên nạp ngân hàng N5, tạo lớp, thêm bài, mở mục Thi thử JLPT bằng link đầu trang, xem trước 25/20/20, đổi cấp đổi số phút (90/115), giao đề; học viên mới vào lớp bằng mã, thấy đếm ngược kỳ thi và lời dặn, bắt đầu thi (đồng hồ 1:30:00), trả lời, nộp, thấy ba phần và điểm thang 180; mở lại đề thì hết lượt | Đạt |
| Trình duyệt (Supabase local, ngân hàng N5 thật) | Giáo viên 1280px, học viên 390px: (A) giao đề, nhãn "Thi thử JLPT N5 (90 phút)" ở trang lớp, DB đúng cấu hình; (B) thi và nộp, kết quả từng phần; (C) còn 10 giây thì trang tự nộp, nộp trong phút thêm, không muộn; (D) đóng trang, quá giờ mới mở lại: Reng nộp ngay, ghi "Reng tự nộp lúc hết giờ", `submitted_at` đúng lúc hết giờ | Không lỗi JS hay console |

Kịch bản E2E bắt được một lỗi trước khi commit: giáo viên mở trang Giao bài khi lớp chưa có bài, rồi thêm ngân hàng ở mục Nội dung lớp ngay trên trang; form thi thử giữ lựa chọn rỗng của lần đầu nên không có phần xem trước và nút Giao đề thi thử bị khóa. Đã sửa: bài đang chọn suy ra từ danh sách hiện tại, quay về ngân hàng phù hợp nhất. Ở 390px bảng kết quả xếp dọc mất tên cột; đã thêm nhãn ô ("Câu đúng", "Tỉ lệ").

## Khi đưa lên production

- Áp migration `20261109032029_jlpt_mock_exams.sql` (cùng `20261109024203_class_session_attendance.sql` nếu chưa áp). Push code trước migration vẫn an toàn: trang đọc bài giao như cũ (chưa có đề thi thử nào), chỉ nút Giao đề thi thử báo "Chưa tạo được đề thi thử…". Áp migration trước code cũng an toàn: bảng `assignments` không đổi.
- Production cần ngân hàng ôn có nhãn phần và câu nghe có audio trong lớp (bản N5/N4 có câu nghe trong `content/review-banks/` nạp bằng `npm run bank:sql`). Bài không có câu nghe vẫn tạo được đề nhưng không ước tính được thang 180.

## Giới hạn và việc sau

- Điểm thang 180 chỉ là ước tính từ tỉ lệ đúng; JLPT thật chấm theo độ khó từng câu. Trang kết quả ghi rõ.
- Một đồng hồ cho cả đề, chưa tách giờ từng phần như thi thật.
- Giáo viên xem điểm từng học viên như bài kiểm tra khác; chưa có bảng trung bình lớp theo từng phần.
- `JLPT_SESSIONS` cần thêm kỳ mới khi có lịch chính thức (04/07/2027 và 05/12/2027 đang ghi "dự kiến").
- Tab chạy nền làm đồng hồ chậm lại; trang cập nhật ngay khi quay lại tab, và phút thêm của server cùng việc tự nộp khi mở lại đề bù cho trường hợp đó.

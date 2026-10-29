# Nghiệm thu dự kiến — Dịch vụ hỗ trợ giảng dạy

Ngày: 29/10/2026. **Toàn bộ ca dưới đây là NOT RUN.** Đợt này chỉ sửa tài liệu, không triển khai hay chạy các chức năng mới. Không thay thế kết quả local ở phase-1 đến phase-5.

Nguồn: [yêu cầu](../01-requirements.md), [BD](../basic-design/teaching-service.md), [DD dự kiến](../detail-design/teaching-service.md).

| Ca | Yêu cầu | Tình huống và kết quả cần đạt |
|---|---|---|
| SV-01 | SERVICE-01 | Giáo viên đăng ký, xác minh email, được server kích hoạt; chưa xác minh không được tạo lớp |
| SV-02 | SERVICE-01/02 | Sửa role/user_metadata hoặc giả user_id không cấp quyền; bị đình chỉ dạy không truy cập API giáo viên |
| SV-03 | SERVICE-01 | Một người vừa dạy lớp A vừa học lớp B; không mất lịch sử học hoặc quyền chủ lớp |
| SV-04 | SERVICE-02 | Hai giáo viên khác nhau không đọc/sửa lớp, nháp, notes, bài nộp, email hoặc media riêng của nhau qua UI/API/RLS/URL |
| SV-05 | CLASS-08 | Lớp 10 chỗ: nhận đủ 10; người 11 bị chặn; retry thành viên cũ không tăng số chỗ |
| SV-06 | CLASS-08 | Hai người tranh chỗ cuối, chỉ một vào được; rời/rejoin/đổi capacity không vượt sức chứa, không xóa lịch sử |
| SV-07 | CLASS-09 | Chủ lớp nhập link Meet hợp lệ, học sinh lớp đọc được; người ngoài/học sinh đã rời không đọc được; URL nguy hiểm bị từ chối |
| SV-08 | CLASS-09 | Dạy thử qua Meet: chỉ share tab slide, audio nghe được; presenter, notes, đáp án test và dashboard không lộ |
| SV-09 | LANG-01 | Một bài Nhật và một bài Trung: font/input/TTS đúng ngôn ngữ; không bật wanakana cho Trung; snapshot Nhật cũ chạy nguyên trạng |
| SV-10 | LANG-01 | Tiếng Trung giữ thanh điệu và phân biệt giản/phồn theo đáp án; tiếng Nhật giữ âm dài, âm ngắt và đáp án thay thế |
| SV-11 | SHARE-01 | View chỉ xem đúng version, không copy/edit/giao bài trực tiếp cho lớp; tài khoản khác không dùng được grant |
| SV-12 | SHARE-01/02 | Copy tạo draft riêng, đủ refs/media/nguồn; không có notes, test, thông tin lớp hoặc kết quả học sinh |
| SV-13 | SHARE-02 | Retry copy không nhân bài/asset; sửa/xuất bản bài nguồn không đổi bản sao hoặc assignment cũ |
| SV-14 | SHARE-01 | Thu hồi chặn xem/copy mới; URL media hết hiệu lực theo TTL; bản copy hợp lệ giữ hoạt động đúng điều kiện đã thông báo |
| SV-15 | SCAN-01 | Upload JPG/PNG/PDF đúng giới hạn; tệp hỏng/giả MIME/quá trang/quá dung lượng/PDF có mật khẩu bị từ chối rõ ràng |
| SV-16 | SCAN-01/OPS-02 | Job riêng tư: giáo viên khác không đọc file/status/output; quota và concurrency không vượt khi gửi song song |
| SV-17 | SCAN-02/03 | Bài in choice/fill nhận dạng thành draft, đối chiếu trang/vùng; thiếu đáp án hoặc câu chưa duyệt không xuất bản được |
| SV-18 | SCAN-02 | Chữ viết tay/bảng khó/không đọc được báo cần sửa, không bịa câu/đáp án; gợi ý AI chưa duyệt không được chấm |
| SV-19 | SCAN-02 | Worker lỗi/retry/timeout không mất sửa tay; conflict revision không ghi đè; import lặp chỉ tạo một draft |
| SV-20 | SCAN-02/SERVICE-02 | Ảnh nguồn có đáp án cuối trang không lọt vào ảnh học sinh, preview/PDF/media; test vẫn giữ policy after_due |
| SV-21 | SCAN-01/OPS-02 | Xóa nguồn/retention dọn OCR trung gian và job lỗi đúng hạn; không làm hỏng asset còn được bài xuất bản dùng |
| SV-22 | GRADE-01 | Choice/fill tự chấm từ snapshot; dạng chưa hỗ trợ bị chặn khi xuất bản. Sau khi có chấm tay: chờ chấm không thành 0 |
| SV-23 | SERVICE-02 | Bài nộp trùng chỉ chấm một lần; tiến độ và báo cáo đúng lớp; chưa nộp khác 0 điểm |
| SV-24 | OPS-02 | Email chỉ đến thành viên đủ điều kiện và đã đồng ý; rời lớp/đã nộp/tắt nhắc được loại khi gửi, job retry không nhân gửi |
| SV-25 | SCAN-03 | So sánh nhập tay và sửa OCR trên bộ scan được phép dùng: ghi thời gian, số lỗi, câu sửa, chi phí/trang và phản hồi giáo viên |

Bộ thử cần hai giáo viên, học sinh thuộc hai lớp khác nhau, một lớp capacity 10 và nội dung Nhật/Trung có quyền sử dụng. Không dùng email/tệp của học sinh thật trong automated test. Dạy qua Meet và chất lượng OCR/font/audio cần kiểm chứng thủ công trên thiết bị thật; ghi bằng chứng và giới hạn trước nghiệm thu.

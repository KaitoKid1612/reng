# Sửa điểm N5 ngày 01/11 — 02/11/2026

Người dùng yêu cầu sửa trực tiếp trên Reng sau khi duyệt 14 câu tương đương trong bài **Luyện tập hằng ngày 01/11** của Nguyên, lớp **Tiếng Nhật Minna – Lớp 1**. Đây là đợt bảo trì dữ liệu có duyệt, không phải tính năng chấm tay hay AI tự chấm theo nghĩa.

## Phạm vi đã áp dụng trên cloud

- Điểm đổi từ **23/60** thành **37/60**. Ngưỡng đạt 70% giữ nguyên nên trạng thái vẫn chưa đạt.
- Công nhận các câu **2, 3, 24, 28, 33, 39, 42, 43, 47, 48, 50, 56, 57, 58**. Các câu 29, 45, 54, 55 chưa được duyệt thêm nên giữ nguyên.
- Bổ sung phương án tương đương vào snapshot của đúng bài 01/11; giữ nguyên đề, câu trả lời gốc, bản nháp đã nộp, thời điểm nộp và 46 câu còn lại.
- Đánh dấu đã giải quyết đúng 14 thẻ lỗi phát sinh từ bài này. Giữ 23 thẻ lỗi còn lại; không tạo sự kiện ôn tập giả.
- Xuất bản phiên bản 2 của `n5-sheet-review-bank`, giữ đủ 200 câu và mọi đáp án cũ; cập nhật phiên bản ngân hàng trong lớp để bài hằng ngày tạo sau dùng các phương án đã duyệt. Phiên bản 1 và bài ngày 02/11 đang được làm giữ nguyên.
- Nhật ký gồm một sự kiện `submission.regraded_23_to_37.approved_variants`, 14 sự kiện `answer.reviewed_correct` và một sự kiện `lesson.answer_variants_corrected`.

## Cách thực hiện và kiểm chứng

Migration `20261102044627_correct_n5_review_answer_variants.sql` đã áp dụng trên project Reng. Migration tìm đối tượng từ tên học viên/lớp, tên bài, ngày và lượt làm; không hardcode UUID được sinh trên production. Cài đặt không có bài này bỏ qua; nhiều đối tượng khớp hoặc dữ liệu khác bản đã duyệt làm thao tác thất bại.

Trong một thao tác nguyên tử, khóa ghi các bảng lịch sử, tạm mở đúng ba trigger bảo vệ đáp án/snapshot/điểm để sửa những hàng đã duyệt, rồi bật lại. Không đổi RLS, quyền, hàm chấm điểm hoặc trigger lâu dài. Có audit để lần chạy lại không cộng điểm hay tạo phiên bản ngân hàng lần nữa. Bản sao trước/sau được lưu ngoài repository trong phiên làm việc.

- PASS local: thử trên PGlite với bản sao thực tế của 60 câu và ngân hàng 200 câu; bộ chấm hiện tại tính lại thành 37/60. Đúng 14 kết quả thay đổi, câu trả lời gốc và 46 câu khác được giữ nguyên; nội dung ngân hàng mới hợp lệ theo schema, phiên bản cũ nguyên vẹn.
- PASS local: cố ý làm lỗi khi xuất bản ngân hàng sau bước sửa điểm; toàn bộ điểm, đáp án và trigger trở lại trước sửa. Chạy thành công rồi chạy lại không đổi điểm hoặc tăng thêm phiên bản. Các cập nhật lịch sử thông thường tiếp tục bị trigger từ chối.
- PASS local: `npm run check`, gồm format, ESLint, TypeScript và 156 test. Không đổi route hoặc tương tác nên không chạy lại browser suite.
- PASS cloud sau áp dụng: 37/60, đúng 14 kết quả sửa, mọi câu trả lời gốc/thời điểm nộp/46 câu khác giữ nguyên; 14 thẻ lỗi được giải quyết; ngân hàng v2 được gắn cho lớp; v1 và bài 02/11 giữ nguyên; cả bốn trigger lịch sử kiểm tra đều bật.

Không áp thay đổi này ngược vào Google Sheet nguồn. Nếu nhập lại Sheet với đáp án cũ, cần giữ/bổ sung các phương án tương đương đã duyệt trước khi xuất bản.

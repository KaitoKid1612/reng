# Basic Design — Lộ trình khóa học và bảng xếp hạng tuần

Ngày 20/11/2026. Người dùng lo học viên bỏ học vì hệ thống "nhạt" và chọn làm ba việc: truyện dài kỳ trong bài (nội dung N3, làm sau khi chọn giáo trình khung), **lộ trình khóa học** và **bảng xếp hạng tuần giữa các lớp của cùng giáo viên**. Tài liệu này mô tả hai việc sau.

## Lộ trình khóa học (trang lớp của học viên `/classes/[id]`)

Thay mục "Bài học đã mở" bằng hai mục:

- **Lộ trình khóa học**: các bài dạy của lớp thành chặng theo thứ tự lớp đặt, nối bằng một đường dọc.
  - Bài dạy là bài có từ vựng hoặc mẫu ngữ pháp. Ngân hàng ôn, đề thi, bộ nghe không phải chặng.
  - Mỗi chặng có một trong bốn trạng thái:
    - **Đã học** (dấu ✓, màu xanh): học viên đã đánh dấu đọc xong, hoặc lớp đã đi qua bài theo nhật ký buổi dạy. Bài xa nhất có trong nhật ký coi là xong khi buổi gần nhất của bài đó dạy tới slide cuối; mọi bài đứng trước nó coi là xong.
    - **Học tiếp** (nút đậm, viền sáng): bài mở đầu tiên chưa học.
    - **Đã mở**: các bài mở khác chưa học.
    - **Sắp mở** (🔒): lớp chưa tới lịch mở, không có link.
  - Đầu mục có "Đã học X/Y bài" và thanh tiến độ.
  - Mỗi chặng đã mở có **sao độ thuộc bài** từ câu trả lời 30 ngày qua của câu mang nhãn bài (`minna-17`, khóa khác `<khóa>-<số bài>`): 1 sao khi đã làm, 2 sao khi đúng từ 75%, 3 sao khi đúng từ 90% và làm ít nhất 10 câu. Chưa có câu thì ghi "Chưa luyện". Chỉ tính bài đã được xem kết quả, như mục mẫu ngữ pháp hay sai.
  - Link mỗi chặng: tên bài mở bài đọc; Luyện nghe, Flashcard, Luyện kanji như trước.
- **Tài liệu ôn tập**: ngân hàng ôn, đề, bộ nghe của lớp, cùng các link như cũ. Lớp không có bài dạy nào thì mục này vẫn mang tên "Bài học đã mở".

Lộ trình và mục mẫu ngữ pháp hay sai đọc chung một lượt câu trả lời. Đọc hỏng thì trang bỏ lộ trình, vẫn hiện danh sách tài liệu.

## Bảng xếp hạng tuần

- **Bật:** giáo viên vào Cài đặt lớp → **Bảng xếp hạng tuần** → tick "Đưa lớp này vào bảng tuần chung" → Lưu. Mặc định tắt.
- **Ai cùng bảng:** học viên của mọi lớp đang hoạt động mà cùng một giáo viên đã bật. Chủ lớp không tính là học viên, trừ lớp tự học (ví dụ Việt ôn N4 trong lớp tự học của mình đứng cùng bảng với Nguyên).
- **Điểm:** tổng số điểm (thường là số câu đúng) của bài nộp từ 0:00 thứ 2 đến hết chủ nhật giờ Việt Nam, ở các lớp trong bảng. Mỗi bài chỉ tính lần làm cao nhất, nên làm lại một bài không cộng thêm. Bài kiểm tra công bố kết quả sau hạn chỉ được cộng từ lúc tới giờ công bố (từ 25/11/2026), để bảng không làm lộ điểm giáo viên đang giữ. Cột thứ hai là số ngày có nộp bài trong tuần. Bằng điểm thì ai học nhiều ngày hơn đứng trước.
- **Hiện ở đâu:**
  - Trang **Tiến độ**: bảng đầy đủ (hạng, huy chương 🥇🥈🥉 cho ba người có điểm, họ tên, câu đúng, ngày học), một câu cho biết bạn đang hạng mấy và kém người trên bao nhiêu câu, người dẫn đầu tuần trước.
  - Trang **Lớp của tôi**: một dòng "Bảng tuần: bạn đang hạng 2/3 với 105 câu đúng" kèm link Xem bảng.
- **Ẩn mình:** Cài đặt → Tài khoản → **Bảng xếp hạng tuần** → "Ẩn tôi khỏi bảng tuần". Người ẩn không hiện với ai khác; bản thân vẫn thấy dòng của mình, ghi "chỉ bạn thấy". Trang Quyền riêng tư ghi rõ phần này.
- **Dữ liệu:** migration `20261120090000_weekly_board.sql` thêm `classes.weekly_board` và `profiles.hide_from_board` (mặc định `false`, chỉ server ghi). Code đọc hai cột này kiểu "có thì dùng", nên lên trước migration vẫn chạy, chỉ chưa có bảng.

Kiểm chứng: [lộ trình và bảng tuần 20/11/2026](../testing/learner-motivation-2026-11-20.md).

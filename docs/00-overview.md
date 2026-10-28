# Tổng quan

## Vấn đề đang giải quyết

Dạy N5 hiện tại phân mảnh: slide nằm một nơi, từ vựng nằm file Excel, bài tập in ra giấy, điểm ghi sổ. Mỗi lần sửa nội dung phải sửa nhiều chỗ. Học viên về nhà không có gì để luyện ngoài sách. Giảng viên không biết ai đang đuối cho tới khi thi.

## Mục tiêu

Một nơi duy nhất để:

- Giảng viên soạn bài, chiếu lên lớp, giao bài tập
- Học viên tự học, luyện nghe, ôn từ vựng ở nhà
- Giảng viên biết ai đạt, ai đuối, cả lớp sai chỗ nào

## Nguyên tắc nền tảng

Nội dung tách khỏi giao diện. Mỗi bài học là một khối dữ liệu JSON. Hệ thống render khối đó thành:

- Slide trình chiếu (dạy trên lớp)
- Trang cuộn đọc được (học viên tự học)
- Flashcard (ôn từ vựng)
- Bài tập chấm tự động

Soạn một lần, dùng bốn kiểu. Đây là quyết định kiến trúc quan trọng nhất của dự án.

## Người dùng

### Giảng viên

Đứng lớp 2 buổi/tuần, mỗi lớp 15–30 học viên. Không phải lập trình viên. Cần soạn bài nhanh, chiếu được trên máy chiếu phòng học, và nhìn ra ai đang gặp vấn đề.

Điều quan trọng với họ: không phải học cách dùng công cụ mới phức tạp. Thêm một bài học phải dễ như gõ vào form.

### Học viên

Người Việt mới học tiếng Nhật, phần lớn là sinh viên hoặc người đi làm. Dùng điện thoại nhiều hơn máy tính. Chưa biết cài bộ gõ tiếng Nhật. Hay học trên đường đi.

Điều quan trọng với họ: mở ra là học được ngay, không phải cài gì, không tốn nhiều dung lượng mạng.

## Phạm vi

### Trong phạm vi

- Nội dung cấp độ N5 (tương đương Minna no Nihongo bài 1–25)
- Bảng chữ cái Hiragana, Katakana
- Khoảng 100 kanji N5, 1.500 từ vựng
- Ngữ pháp N5 kèm giải thích tiếng Việt
- Audio phát âm cho từ vựng và câu mẫu
- Bài nghe và bài tập tự chấm
- Theo dõi tiến độ học viên theo lớp

### Ngoài phạm vi (giai đoạn đầu)

- Các cấp độ N4 trở lên
- Thanh toán, bán khóa học
- Ứng dụng di động riêng (dùng web responsive và PWA)
- Lớp học trực tuyến có video call
- Chấm bài tự luận

### Không làm

- Nhúng iframe Google Slides làm giải pháp lâu dài. Hộp đen, không gắn được audio, furigana hay quiz vào slide.
- Lưu file .pptx làm nguồn nội dung chính. File nhị phân không query được, không tái sử dụng sang bài tập được.
- Nhắc bài qua Zalo OA. Tốn phí và thủ tục, chi tiết ở `10-risks-costs-and-licenses.md`.

## Tiêu chí thành công

Giai đoạn đầu coi là thành công nếu:

- Giảng viên dạy trọn một buổi bằng website, không cần mở PowerPoint
- Học viên vào làm bài tập ở nhà mà không cần hỏi cách dùng
- Giảng viên nhìn bảng lớp là biết buổi sau cần giảng lại cái gì
- Thêm một bài học mới mất dưới 30 phút

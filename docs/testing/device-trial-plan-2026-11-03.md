# Kịch bản buổi học thử trên điện thoại thật — 03/11/2026

## Mục tiêu

Một buổi 30–45 phút với giáo viên trên laptop (Google Meet) và 2–3 học viên dùng điện thoại thật: ít nhất một iPhone (Safari) và một Android (Chrome). Buổi này kiểm những gì kiểm thử tự động chưa làm được:

- Bộ gõ thật: IME tiếng Nhật, tiếng Trung, bàn phím tiếng Việt.
- Bàn phím ảo che ô nhập; phím Enter trên bàn phím ảo.
- Safari iOS. Máy kiểm thử chưa chạy được WebKit vì thiếu thư viện hệ thống.
- Slide chia sẻ qua Meet có đọc được trên điện thoại không.
- Âm thanh phát trên loa điện thoại.

Kiểm thử tự động hiện chạy trên Chromium, khổ 360–390px: làm bài, câu sắp xếp, đọc hiểu, nộp bài, kết quả, ôn tập. Buổi thử không cần lặp lại từng bước đó; chỉ cần ghi chỗ khác với máy thật.

## Chuẩn bị (giáo viên, trước buổi 1 ngày)

1. Một lớp thử (hoặc lớp thật có học viên đồng ý). Link mời đã gửi qua Zalo.
2. Lớp tiếng Nhật có bài hằng ngày đang bật, gồm câu điền hiragana, câu sắp xếp và câu đọc hiểu. Ngân hàng N4 có đủ ba dạng này.
3. Một bài luyện có câu điền mà học viên dễ viết khác đáp án, ví dụ đáp án `ありがとうございます`. Câu này dùng để thử nút "Chấp nhận câu trả lời này", sau khi migration chấp nhận đáp án đã áp lên production.
4. Nếu có lớp tiếng Trung: một bài có câu pinyin, câu chữ Hán và câu sắp xếp.
5. Điện thoại học viên đã đăng nhập Reng và bật âm thanh. Ghi lại model máy, phiên bản iOS/Android và trình duyệt.

## Kịch bản

| Bước | Ai | Làm | Quan sát |
| --- | --- | --- | --- |
| 1 | Giáo viên | Mở trang lớp, khối Buổi dạy online, bấm Mở Google Meet và chia sẻ tab slide | Chữ trên slide đọc được trên điện thoại học viên trong Meet không? Furigana, chữ Hán có rõ không? |
| 2 | Học viên | Mở link mời, vào lớp, xem "Hôm nay của bạn" | Mất bao lâu để thấy bài cần làm; có nút nào khó bấm không |
| 3 | Học viên | Làm bài hằng ngày: câu điền hiragana bằng romaji (`arigatou`), rồi thử bằng IME tiếng Nhật của máy | Romaji đổi thành kana đúng không; IME có bị đổi chữ hai lần không; bàn phím ảo có che ô nhập không |
| 4 | Học viên | Bấm Enter trên bàn phím ảo để kiểm tra, rồi Enter lần nữa để sang câu sau | Enter có kiểm tra/sang câu không; khi đang gõ IME, Enter có chỉ xác nhận chữ không |
| 5 | Học viên | Câu sắp xếp: bấm các mảnh theo thứ tự, bấm một mảnh đã xếp để bỏ, rồi Xếp lại từ đầu | Mảnh đủ to để bấm không; có bấm nhầm không |
| 6 | Học viên | Câu đọc hiểu: đọc đoạn văn, trả lời hai câu cùng đoạn | Đoạn văn dài có phải cuộn nhiều không; chữ có đủ lớn không |
| 7 | Học viên (lớp Trung) | Gõ pinyin số thanh `ni3 hao3`, gõ chữ Hán bằng IME | Số thanh đổi thành dấu đúng không; IME tiếng Trung có bị can thiệp không |
| 8 | Học viên | Nộp bài, xem kết quả (mở sẵn câu sai), bấm Tất cả và Đúng | Điểm, đáp án và giải thích hiện đúng; lọc có dễ dùng không |
| 9 | Học viên | Mở Sổ lỗi, Ôn tập; mở Flashcard một bài, bấm Nghe | Âm thanh phát trên loa không; giọng có đúng ngôn ngữ không |
| 10 | Giáo viên | Mở trang học viên, bấm Chấp nhận câu trả lời này cho một câu điền viết khác đáp án (sau khi migration đã áp) | Thông báo số bài được cộng điểm; học viên tải lại kết quả thấy điểm mới |
| 11 | Giáo viên | Ghi buổi dạy từ thanh trình chiếu | Bài và slide điền sẵn đúng |

## Ghi lại

Mỗi vấn đề ghi một dòng, kèm ảnh chụp màn hình hoặc quay màn hình nếu có:

| Thiết bị / trình duyệt | Bước | Kỳ vọng | Thực tế | Mức (chặn / khó dùng / nhỏ) |
| --- | --- | --- | --- | --- |
| iPhone 12, iOS 17, Safari | 3 | Romaji thành kana | … | … |

Sau buổi, gửi bảng này cho đội phát triển. Lỗi "chặn" sửa trước khi mở rộng lớp.

## Tiêu chí đạt

- Mọi học viên làm xong và nộp được bài hằng ngày trên điện thoại của mình mà không cần giáo viên trợ giúp.
- Không có lỗi "chặn" ở bước 2–8.
- Âm thanh phát được ít nhất ở Flashcard. Nếu máy không có giọng Nhật/Trung, ghi lại để ưu tiên audio sinh sẵn ([06](../06-audio.md)).

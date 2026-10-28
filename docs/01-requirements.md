# Yêu cầu

Ký hiệu mức ưu tiên: **P0** là tính năng cốt lõi của sản phẩm, **P1** cần cho vận hành đầy đủ, **P2** mở rộng. Mốc giao cụ thể theo `09-roadmap.md`; bản chạy đầu tiên chỉ gồm nền và kana, không gom mọi P0 vào giai đoạn 1.

## Yêu cầu chức năng

### Bảng chữ cái

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| KANA-01 | Hiển thị bảng Hiragana và Katakana đầy đủ, gồm âm đục và âm ghép | P0 |
| KANA-02 | Bấm vào một chữ thì phát âm | P0 |
| KANA-03 | Chế độ luyện: hiện chữ, học viên gõ romaji, chấm ngay | P0 |
| KANA-04 | Xem thứ tự nét viết dạng động | P1 |
| KANA-05 | Tô màu bảng theo tỉ lệ sai của chính học viên đó | P2 |
| KANA-06 | Viết tay trên canvas, so với mẫu | P2 |

### Bài giảng

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| LESSON-01 | Danh sách bài học theo thứ tự giáo trình | P0 |
| LESSON-02 | Xem bài ở chế độ trình chiếu (slide) | P0 |
| LESSON-03 | Xem bài ở chế độ cuộn đọc | P0 |
| LESSON-04 | Điều khiển slide bằng mũi tên, phím cách, vuốt trên điện thoại | P0 |
| LESSON-05 | Hiện dần từng phần trong slide để hỏi học viên trước khi lộ đáp án | P0 |
| LESSON-06 | Toàn màn hình, chữ co giãn theo kích thước màn hình | P0 |
| LESSON-07 | Bật tắt furigana | P1 |
| LESSON-08 | Chế độ hai màn hình: máy chiếu hiện slide, laptop hiện ghi chú | P1 |
| LESSON-09 | Xuất bài ra PDF để phát cho học viên | P1 |
| LESSON-10 | Mã QR trên slide bài tập để học viên quét vào thẳng | P1 |
| LESSON-11 | Link sâu tới đúng slide (`/lessons/lesson-05/slide#7`) | P1 |

### Từ vựng

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| VOCAB-01 | Danh sách từ vựng theo bài, kèm nghĩa tiếng Việt và audio | P0 |
| VOCAB-02 | Flashcard lật thẻ | P0 |
| VOCAB-03 | Lặp lại ngắt quãng theo thuật toán FSRS | P1 |
| VOCAB-04 | Đánh dấu thuộc / chưa thuộc, hôm sau chỉ ôn cái chưa thuộc | P1 |
| VOCAB-05 | Nhập từ vựng hàng loạt bằng CSV | P1 |

### Ngữ pháp và kanji

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| GRAM-01 | Danh sách mẫu ngữ pháp, mỗi mẫu có cấu trúc, nghĩa, ví dụ | P0 |
| GRAM-02 | Mục "người Việt hay nhầm" cho từng mẫu | P1 |
| GRAM-03 | Tra cứu nhanh theo từ khóa | P1 |
| KANJI-01 | 100 kanji N5 kèm âm on/kun, nghĩa, từ ghép | P1 |
| KANJI-02 | Xem thứ tự nét | P1 |

### Luyện nghe

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| LISTEN-01 | Nghe audio, chọn đáp án | P1 |
| LISTEN-02 | Nghe và gõ lại câu (chính tả) | P1 |
| LISTEN-03 | Khóa transcript cho tới khi học viên trả lời xong | P1 |
| LISTEN-04 | Đếm và lưu số lần nghe cho mỗi câu | P1 |
| LISTEN-05 | Nút lùi 5 giây, không có thanh tua | P1 |
| LISTEN-06 | Tốc độ chậm 0.75x giữ nguyên cao độ giọng | P1 |
| LISTEN-07 | Chế độ kiểm tra giới hạn số lần nghe | P2 |
| LISTEN-08 | Shadowing: ghi âm học viên, phát lại cạnh file mẫu | P2 |
| LISTEN-09 | Chấm điểm phát âm từng âm tiết | P2 |

### Bài tập và kiểm tra

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| EX-01 | Trắc nghiệm nhiều lựa chọn | P0 |
| EX-02 | Điền từ, có hỗ trợ gõ romaji ra kana | P0 |
| EX-03 | Chấm ngay và giải thích đáp án đúng | P0 |
| EX-04 | Ghép đôi (từ với nghĩa) | P1 |
| EX-05 | Sắp xếp câu (dạng 文の組み立て) | P1 |
| EX-06 | Giao bài tập có hạn nộp | P1 |
| EX-07 | Sổ lỗi: gom mọi câu từng sai, ôn lại theo lịch | P1 |
| EX-08 | Đề thi thử N5 có đếm giờ, chấm theo thang JLPT | P2 |

### Quản lý lớp

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| CLASS-01 | Tạo lớp, phát mã lớp cho học viên tự vào | P1 |
| CLASS-02 | Bảng theo dõi: bài nộp, điểm trung bình, số lần nghe lại, trạng thái | P1 |
| CLASS-03 | Gắn nhãn tự động: đạt, chưa đạt, yếu phần nghe, bỏ bài | P1 |
| CLASS-04 | Thống kê câu cả lớp sai nhiều nhất | P1 |
| CLASS-05 | Xuất báo cáo ra CSV | P1 |
| CLASS-06 | Thi đấu trực tiếp trong lớp, bảng xếp hạng thời gian thực | P2 |

### Soạn nội dung

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| ADMIN-01 | Form thêm và sửa bài học, không cần đụng code | P1 |
| ADMIN-02 | Xem trước slide ngay khi soạn | P1 |
| ADMIN-03 | Nhập từ vựng từ CSV | P1 |
| ADMIN-04 | Script sinh audio cho nội dung mới | P1 |
| ADMIN-05 | Nhân bản một bài để làm bài mới | P2 |

### Nhắc bài

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| NOTI-01 | Email nhắc hằng ngày, chỉ gửi khi có việc cần làm | P2 |
| NOTI-02 | Học viên chọn tần suất hoặc tắt hẳn | P2 |
| NOTI-03 | Email tóm tắt lớp gửi cho giảng viên mỗi sáng | P2 |
| NOTI-04 | Web push | P2 |

## Yêu cầu phi chức năng

### Hiệu năng

- Trang bài học mở xong dưới 2 giây trên mạng 4G
- Chuyển slide không giật, kể cả trên laptop phòng học cấu hình thấp
- Audio từ vựng phát trong vòng 300ms sau khi bấm

### Thiết bị và trình duyệt

- Chạy tốt trên Chrome, Safari, Edge bản mới
- Điện thoại từ màn hình 360px trở lên
- Máy chiếu phòng học thường là Windows, tỉ lệ 16:9, độ phân giải 1280×720

### Hiển thị tiếng Nhật

- Nhúng font Noto Sans JP, không phụ thuộc font cài sẵn của máy
- Lý do: máy Windows phòng học hay thiếu font Nhật, chữ sẽ bị thay bằng font Trung Quốc có nét khác, học viên tập viết theo là sai

### Nhập liệu tiếng Nhật

- Ô nhập tiếng Nhật hỗ trợ chuyển romaji sang kana, đồng thời giữ khả năng dùng IME/dán kanji theo inputMode; không chuyển đổi khi IME đang composition
- Lý do: học viên mới chưa cài bộ gõ IME

### Chấm đáp án

- Chuẩn hóa NFKC trước khi so sánh (katakana nửa chiều rộng thành đầy đủ)
- Bỏ qua khoảng trắng thừa và dấu `。` cuối câu
- Chấp nhận nhiều đáp án đúng
- Kanji và kana tính đúng khi đã được khai báo trong danh sách đáp án chấp nhận; không tự suy diễn chuyển đổi. Bài kiểm tra kanji dùng kanjiStrict

### Bảo mật

- Đáp án bài kiểm tra không được gửi xuống trình duyệt trước khi nộp
- RLS chặn truy cập bảng gốc; API kiểm tra quyền và lọc trường theo mode/thời điểm phản hồi, không để câu test bị lộ qua bài luyện
- Học viên chỉ xem được kết quả của chính mình

### Chi phí vận hành

- Giai đoạn đầu phải nằm trong free tier của các dịch vụ
- Băng thông audio là khoản dễ vượt nhất, cần xử lý riêng

### Khả năng mở rộng nội dung

- Thêm một dạng bài tập mới không được đụng vào code của các dạng cũ
- Thêm một bài học mới không cần deploy lại

## Yêu cầu bổ sung về tính toàn vẹn

| ID | Yêu cầu | Ưu tiên |
|---|---|---|
| DATA-01 | Bài học xuất bản theo phiên bản bất biến, lớp chọn phiên bản; bài giao giữ snapshot | P0 |
| DATA-02 | Lưu draft bài làm trên server; khôi phục khi tải lại, phát hiện xung đột hai tab | P1 |
| DATA-03 | Bắt đầu/nộp/ôn tập retry không tạo trùng lượt, điểm hoặc lịch ôn | P0 |
| AUTH-01 | Đăng ký luôn là học viên; quyền giảng viên do người vận hành cấp phía server | P0 |
| CLASS-07 | Chọn bài, phiên bản, thứ tự và thời điểm mở cho lớp | P1 |
| EX-09 | Phân biệt practice/test, chính sách xem kết quả, nộp muộn và lượt làm theo 07 | P0 |
| OPS-01 | Tách môi trường; có sao lưu và khôi phục thử trước lớp thật | P1 |

Đặc tả dữ liệu và chấm điểm chi tiết lấy theo 03 và 07. Nộp bài trùng, mất mạng, quyền truy cập và nội dung đã sửa là tình huống nghiệm thu bắt buộc ở giai đoạn 3.

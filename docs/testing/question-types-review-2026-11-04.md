# Kiểm tra các dạng bài tập — 04/11/2026

Người dùng yêu cầu tiếp tục làm giao diện thuận tiện hơn và kiểm tra lại các dạng bài tập.

## Dạng bài đang có

| Dạng | Học viên làm thế nào | Có trong nội dung |
|---|---|---|
| Trắc nghiệm một đáp án | Chọn một lựa chọn | Bài mẫu Minna, ngân hàng ôn |
| Trắc nghiệm nhiều đáp án | Chọn tất cả đáp án đúng | Câu giáo viên soạn |
| Điền từ | Gõ hiragana, katakana, tiếng Nhật (kanji bắt buộc hoặc không), chữ Hán, pinyin, hoặc văn bản tiếng Việt | Bài mẫu Minna (hiragana), lớp tiếng Trung |
| Sắp xếp câu | Bấm các mảnh theo đúng thứ tự | Ngân hàng ôn N4 |
| Nghe | Nghe rồi chọn, hoặc nghe rồi gõ | Câu giáo viên soạn (cần audio) |
| Chép chính tả | Nghe rồi chép lại | Câu giáo viên soạn (cần audio) |
| Đọc hiểu | Đọc đoạn văn rồi trả lời | Ngân hàng ôn N4 |

Dạng "ghép cặp" có trong schema và bộ chấm nhưng cố ý chưa cho giao, vì chưa có màn hình cho học viên (`tests/assignment.test.ts`).

## Cách kiểm tra

- Supabase local (đã áp migration chuẩn hóa kanji `20261104063229`), khổ 360×800, tài khoản demo local với mật khẩu tạm.
- Dựng một bài thử trên DB local với một câu cho mỗi dạng (11 câu, có audio giả) và giao cho học viên demo. Đi hết: làm từng câu, Kiểm tra, nộp, trang kết quả, Sổ lỗi, Ôn tập, trang học viên của giáo viên. Lớp tiếng Trung demo: trắc nghiệm, chữ Hán, pinyin (`lao3shi1` → `lǎoshī`).
- Một agent đọc code các chỗ khác có câu hỏi: kết quả, Sổ lỗi, Ôn tập, trang giáo viên, CSV, slide, hai trình soạn. Mỗi điểm agent báo đều được đọc lại trong code trước khi sửa.
- Mở các trang tự học: thẻ từ, kanji, nghe, kana, pinyin. Đều mở được, không tràn ngang, không lỗi.

## Đã sửa

### Học viên

| Vấn đề | Đã sửa |
|---|---|
| Câu trắc nghiệm đã bấm Kiểm tra chỉ báo đáp án bằng chữ bên dưới. Lựa chọn sai vẫn tô xanh như "đang chọn" | Tô ngay trên các lựa chọn: đáp án đúng viền xanh kèm ✓, lựa chọn sai đã chọn viền đỏ kèm ✗. Có chữ ẩn cho trình đọc màn hình. Câu nhiều đáp án tô cả đáp án đúng chưa chọn |
| Đáp án nhiều lựa chọn ghi "りんご / いす", giống cách ghi "đáp án nào cũng được" của câu điền | Ghi "りんご + いす" (cần chọn đủ) ở mọi nơi: nhận xét, kết quả, Sổ lỗi, Ôn tập, trang giáo viên |
| Đáp án chép chính tả hiện "わたしはがくせいです。 / わたしはがくせいです" | Các cách viết chấm giống nhau chỉ hiện một lần |
| Gõ romaji "," "." "?" "!" vẫn ra dấu ASCII. Nếu đáp án giáo viên đặt là "はい、そうです", gõ "hai,soudesu" bị chấm sai | Đổi thành 、。？！ như bộ gõ tiếng Nhật |
| Ô điểm ở trang kết quả trên điện thoại vỡ thành "63,6% (7/11", khoảng trống lớn, rồi "điểm)" | "(7/11 điểm)" xuống dòng thành một khối ngay dưới con số. Áp dụng cho cả kết quả kana, kanji, pinyin, Ôn tập |
| Bấm Kiểm tra xong, focus rơi về đầu trang | Focus vào thẻ câu, như khi nhấn Enter |
| Ôn tập: số lần nghe và audio của thẻ trước mang sang thẻ sau. Câu giới hạn lượt nghe có thể báo "hết lượt" trước khi nghe | Mỗi thẻ bắt đầu mới |
| Ôn tập: Enter trong ô gõ không gửi câu trả lời. Sau khi bấm, focus rơi về đầu trang | Enter gửi câu trả lời, focus chuyển sang Thẻ tiếp theo, rồi sang thẻ mới |
| Câu nghe sai trong Ôn tập và Sổ lỗi không có "Lời nghe" (trang làm bài và kết quả có) | Hiện "Lời nghe" ở cả hai |
| Chép chính tả nhập "Văn bản" chấm theo quy tắc tiếng Nhật: "Xin chào!" sai, trong khi câu điền văn bản thì đúng | Chấm như câu điền văn bản tiếng Việt (bỏ qua chữ hoa, khoảng trắng, dấu câu; vẫn giữ dấu thanh) |
| Chữ dài không ngắt (link trong giải thích) có thể tràn ở kết quả, Sổ lỗi, trang giáo viên và ô nhận xét | Tự xuống dòng |

### Giáo viên và dữ liệu

| Vấn đề | Đã sửa |
|---|---|
| Giáo viên chấp nhận đáp án kana, sau đó bật "kanji bắt buộc" cho câu đó và xuất bản. Bộ bài mới (kể cả luyện tập hằng ngày) có đáp án không kanji, nên mọi học viên mở bài đều gặp trang lỗi | Lúc đọc bộ bài, đáp án không có kanji của câu kanji bắt buộc bị bỏ qua. Không cần migration |
| Trình soạn tiếng Nhật và form câu kiểm tra cho hai lựa chọn giống nhau. Học viên chọn bản không được đánh dấu bị chấm sai | Báo "có hai lựa chọn giống nhau" như trình soạn tiếng Trung |
| Câu điền "Văn bản" trong lớp tiếng Trung gắn `lang="ja"`, chữ Hán hiện kiểu Nhật | Theo ngôn ngữ của lớp |

## Kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Bài thử 11 dạng ở 360px | Làm, Kiểm tra, nộp được. Gõ "watasi" → わたし, "ko-hi-" → コーヒー, "watasihagakuseidesu." → わたしはがくせいです。 |
| Tô đáp án | Câu một đáp án: "Cái ghế" ✓ xanh, "Cái bàn" ✗ đỏ. Câu nhiều đáp án: cả りんご và いす ✓ |
| Trang kết quả 360px | "63,6%" và "(7/11 điểm)" ở dòng ngay dưới |
| Ôn tập 16 thẻ, đi bằng Enter | Enter gửi, focus sang Thẻ tiếp theo, Enter sang thẻ mới. Mỗi thẻ nghe bắt đầu "Đã nghe 0 lần". Phản hồi API có `transcript`, nhận xét hiện "Lời nghe" |
| Sổ lỗi | 3 câu nghe có "Lời nghe". Câu nhiều đáp án ghi "りんご + いす" |
| `npm run audit:layout` sau đăng nhập (kết quả, Sổ lỗi, Ôn tập, Lớp của tôi, kana, pinyin) | 18 lượt xem ở 360/768/1280px: 0 lỗi, 0 cảnh báo |
| Unit test mới | Snapshot kanji bắt buộc, dấu "+", gộp đáp án trùng, chấm chép chính tả văn bản, dấu câu romaji, lựa chọn trùng, câu văn bản trong lớp tiếng Trung |
| `npm run check` | Đạt |

Chưa chạy E2E, theo yêu cầu tạm hoãn. Các kịch bản hiện có không dùng những chữ đã đổi.

## Còn lại

- Trình soạn câu nghe chưa có ô đoạn văn. Đoạn văn nhập từ file vẫn được giữ, nhưng không xem hay xóa được trong trình soạn.
- Chưa có màn hình "ghép cặp". Nếu muốn thêm dạng bài, đây là dạng tiếp theo nên làm.
- Câu nghe cần audio do quản trị viên tạo (Azure/R2 chưa cấu hình trên production), nên giáo viên chưa tự tạo được câu nghe mới trên web.

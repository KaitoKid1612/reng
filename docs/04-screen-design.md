# Thiết kế màn hình

Danh sách S/T giai đoạn 1–5 bên dưới là nền Nhật. Màn hình ưu tiên dịch vụ Việt–Trung là SV01–SV07 trong [BD dịch vụ](basic-design/teaching-service.md): đăng ký giáo viên → lớp → soạn theo mẫu → dạy/giao → theo dõi. Route mới là dự kiến; chưa có wizard hoặc màn hình scan trong code.

Route mới dùng tiếng Anh. Hai URL đã phục vụ trước đây `/kana/luyen` và `/nguon-du-lieu` redirect 308 sang `/kana/practice` và `/sources`; query được giữ. Các màn hình chưa triển khai bên dưới dùng tên tiếng Anh làm baseline.

Mức basic design: liệt kê màn hình, nội dung chính, và luồng đi lại. Không vẽ chi tiết từng nút, vì code chính là detail design cho phần này.

## Danh sách màn hình

### Dành cho học viên

| Mã | Màn hình | Đường dẫn | Giai đoạn |
|---|---|---|---|
| S01 | Trang chủ | `/` | 1 |
| S02 | Bảng chữ cái | `/kana` | 1 |
| S03 | Luyện chữ cái | `/kana/practice` | 1 |
| S04 | Danh sách bài học | `/lessons` | 2 |
| S05 | Bài học, chế độ đọc | `/lessons/[id]` | 2 |
| S06 | Bài học, chế độ trình chiếu | `/lessons/[id]/slide` | 2 |
| S07 | Flashcard từ vựng | `/vocabulary/[lessonId]` | 3 |
| S08 | Ôn tập hằng ngày | `/review` | 3 |
| S09 | Tra cứu ngữ pháp | `/grammar` | 2 |
| S10 | Kanji N5 | `/kanji` | 5 |
| S11 | Làm bài tập | `/assignments/[id]` | 3 |
| S12 | Kết quả bài tập | `/assignments/[id]/results` | 3 |
| S13 | Sổ lỗi | `/mistakes` | 3 |
| S14 | Tiến độ của tôi | `/progress` | 3 |
| S15 | Luyện nghe | `/listening/[id]` | 5 |
| S16 | Đề thi thử | `/mock-exams` | 6 |
| S17 | Lớp của tôi | `/classes` | 3 |
| S18 | Lớp học: bài đã mở và bài tập | `/classes/[id]` | 3 |

### Dành cho giảng viên

| Mã | Màn hình | Đường dẫn | Giai đoạn |
|---|---|---|---|
| T01 | Bảng điều khiển | `/teach` | 3 |
| T02 | Danh sách lớp | `/teach/classes` | 3 |
| T03 | Theo dõi lớp | `/teach/classes/[id]` | 3 |
| T04 | Chi tiết một học viên | `/teach/classes/[id]/students/[uid]` | 3 |
| T05 | Giao bài tập | `/teach/classes/[id]/assign` | 3 |
| T06 | Soạn bài (tạo bài: `/teach/lessons/new`) | `/teach/lessons/[id]/edit` | 4 |
| T07 | Nhập từ vựng CSV | `/teach/import-csv` | 4 |
| T08 | Thi đấu trực tiếp | `/teach/live-quiz/[id]` | 6 |

### Màn hình dùng chung

| Màn hình | Đường dẫn | Giai đoạn |
|---|---|---|
| Đăng nhập, đăng ký, xác nhận email | `/sign-in`, `/sign-up`, `/verify-email`, `/auth/confirm`; `/teach/sign-in` chuyển 308 sang `/sign-in?next=/teach` | 3 |
| Quên/đặt lại mật khẩu | `/forgot-password`, `/reset-password` | 3 |
| Vào lớp | `/join-class` | 3 |
| Nguồn dữ liệu | `/sources` | 1, cập nhật khi thêm nguồn |
| Cài đặt thông báo | `/settings/notifications` | 4; thêm push ở 6 |

Giai đoạn 1–2 chưa có đăng ký công khai; người vận hành chuẩn bị tài khoản giảng viên và nhập bài bằng script. Giai đoạn 3 bổ sung xác thực học viên trước khi vào lớp/lưu kết quả. Trang chủ giai đoạn 1 chỉ giới thiệu và dẫn tới kana; thông tin thẻ đến hạn/bài tập chỉ xuất hiện từ giai đoạn 3.

## Chi tiết các màn hình chính

### S02 — Bảng chữ cái

Mục đích: học viên ba tuần đầu dùng màn hình này nhiều nhất.

Nội dung:
- Tab chuyển Hiragana / Katakana
- Bảng 5 cột theo hàng あ か さ た な は ま や ら わ
- Khối âm đục (が ざ だ ば) và âm nửa đục (ぱ) tách riêng
- Khối âm ghép (きゃ きゅ きょ...) tách riêng
- Bấm vào ô: phát âm, hiện romaji lớn; chỉ hiện nút xem thứ tự nét khi có asset, bổ sung ở giai đoạn 5

Lưu ý thiết kế: trên điện thoại bảng 5 cột vẫn phải đọc được. Dùng ô vuông co giãn, không để cuộn ngang.

### S05 — Bài học, chế độ đọc

Cuộn từ trên xuống, chia khối theo thứ tự: giới thiệu, từ vựng, ngữ pháp, ví dụ, ghi chú, bài tập.

Mỗi từ vựng có nút phát âm. Mỗi mẫu ngữ pháp hiện kèm phần "người Việt hay nhầm". Nút bật tắt furigana nằm cố định ở góc.

Cuối trang có nút chuyển sang chế độ trình chiếu và nút làm bài tập.

### S06 — Bài học, chế độ trình chiếu

Màn hình quan trọng nhất khi đứng lớp. Yêu cầu:

- Khung cố định 1280×720, dùng `transform: scale()` để vừa màn hình. Slide trên laptop và trên máy chiếu giống hệt nhau.
- Điều khiển: mũi tên trái phải, phím cách sang slide kế, `F` toàn màn hình, `Esc` xem lưới toàn bộ slide, vuốt trên điện thoại.
- Fragment: bấm mũi tên lộ dần từng phần. Dùng để hỏi học viên trước khi hiện đáp án.
- Chỉ số slide hiện ở góc, dạng `7 / 24`.
- Vị trí lưu vào hash URL: `/lessons/lesson-05/slide#7`.

Từ giai đoạn 2 có chế độ hai màn hình: nút mở cửa sổ thứ hai. Cửa sổ chiếu hiện slide, cửa sổ laptop hiện ghi chú, slide kế tiếp và đồng hồ. Đồng bộ bằng cơ chế presenter của reveal.js; chỉ bổ sung BroadcastChannel nếu kiểm chứng tích hợp cho thấy cần. Không đưa ghi chú vào payload của cửa sổ máy chiếu.

### S08 — Ôn tập hằng ngày

Vào là thấy ngay số thẻ cần ôn hôm nay, không phải chọn gì.

Mỗi thẻ: mặt trước hiện từ tiếng Nhật, bấm lật ra nghĩa và audio. Học viên tự đánh giá bốn mức theo FSRS: quên, khó, được, dễ.

Hết thẻ thì hiện tóm tắt phiên ôn và chuỗi ngày học liên tiếp.

### S11 — Làm bài tập

Một câu một màn hình trên điện thoại, nhiều câu một trang trên máy tính.

Ô nhập Nhật dùng wanakana theo inputMode và tôn trọng IME; ô Trung dự kiến dùng IME/Unicode, không chuyển romaji ra kana.

Chế độ luyện: chấm ngay sau mỗi câu, hiện giải thích. Chế độ kiểm tra: không chấm cho tới khi nộp hết.

Nút nộp cho phép câu trống, nhưng phải xác nhận số câu bỏ trống. Hiện trạng thái lưu draft, mất mạng, hết hạn và xung đột giữa hai tab theo `07`. Bài test chưa tới thời điểm phản hồi chỉ hiện xác nhận đã nộp.

### S15 — Luyện nghe

Player tối giản: nút phát, nút lùi 5 giây, nút chậm 0.75x. **Không có thanh tua** — có thanh tua là học viên mò đáp án.

Transcript nằm trong khối thu gọn, chỉ mở được sau khi đã trả lời.

Đếm số lần nghe hiện nhỏ ở góc, gửi kèm kết quả về server.

### T03 — Theo dõi lớp

Bốn ô thống kê ở trên: số bài đã nộp, điểm trung bình, số học viên đạt, số cần chú ý.

Bảng học viên: tên, số bài nộp, điểm trung bình, số lần nghe lại trung bình, nhãn trạng thái.

Nhãn tính lại khi xem báo cáo và hằng ngày. Ưu tiên Bỏ bài → Chưa đạt → Yếu phần nghe → Đạt; chưa có bài nộp và chưa bỏ bài thì hiện “Chưa có dữ liệu”. Ngưỡng nhãn chung dùng classes.pass_score, điều kiện chi tiết tại `07`:


| Nhãn | Điều kiện |
|---|---|
| Chưa đạt | điểm trung bình dưới `classes.pass_score` |
| Yếu phần nghe | điểm chung đạt nhưng phần nghe dưới 60%, hoặc số lần nghe trung bình trên 3 |
| Bỏ bài | 2 bài liên tiếp quá hạn chưa nộp |
| Đạt | còn lại |

Dưới bảng: danh sách câu cả lớp sai nhiều nhất, lọc từ 50% trở lên. Đây là phần giảng viên mở ra trước mỗi buổi dạy.

Có nút xuất CSV.

### T06 — Soạn bài

Chia hai cột: bên trái form nhập, bên phải xem trước slide theo thời gian thực.

Form theo khối: thông tin bài, danh sách từ vựng, danh sách ngữ pháp, thứ tự slide, danh sách câu hỏi luyện. Câu kiểm tra riêng nhập ở màn hình giao bài T05; không đưa vào nội dung bài học công khai.

Thứ tự slide kéo thả được. Mỗi slide chọn loại rồi trỏ tới từ vựng hoặc ngữ pháp đã nhập ở trên.

Nút lưu nháp và nút xuất bản tách riêng. Xuất bản tạo phiên bản mới, không sửa lịch sử. Hiện lỗi tham chiếu thiếu, audio thiếu và xung đột revision ngay tại form. Bài chưa xuất bản thì học viên không thấy. Bài có lịch sử chỉ lưu trữ, không xóa cứng.

## Luồng chính

### T05 — Giao bài và chọn nội dung lớp

Giảng viên thêm bài mình sở hữu vào lớp, chọn phiên bản, thứ tự và available_at. Khi giao bài chọn practice/test, hạn nộp, cho phép nộp muộn, điểm đạt và lượt làm. practice chọn câu luyện từ phiên bản; test nhập câu riêng và chính sách trả kết quả. Có cảnh báo xác nhận trước xuất bản vì điều kiện và snapshot không sửa sau đó. Tính năng này có ở giai đoạn 3, độc lập với editor bài học đầy đủ ở giai đoạn 4.

### Học viên vào lớp lần đầu

```
Nhận mã lớp từ giảng viên
   -> Mở /join-class
   -> Nhập mã
   -> Đăng nhập hoặc tạo tài khoản
   -> Vào thẳng danh sách bài học của lớp
```

Không bắt điền hồ sơ dài. Tên và email là đủ.

### Giảng viên dạy một buổi

```
Mở /lessons/lesson-05/slide trên laptop
   -> Bấm mở cửa sổ trình chiếu, kéo sang máy chiếu
   -> Dạy, dùng mũi tên lộ dần đáp án
   -> Tới slide quiz, hỏi cả lớp và hiện đáp án luyện
   -> Từ giai đoạn 3: giao bài và xem kết quả lớp
   -> Từ giai đoạn 6: thêm QR để học viên vào bài nhanh
```

### Học viên tự học ở nhà

```
Mở trang chủ
   -> Thấy "12 thẻ cần ôn hôm nay" và "bài tập bài 5 còn 1 ngày"
   -> Ôn thẻ
   -> Làm bài tập
   -> Câu sai tự rơi vào sổ lỗi, hẹn lịch ôn lại
```

## Quy ước giao diện

- Theo `12-ui-design.md`: tiếng Việt dùng Be Vietnam Pro; tiếng Nhật nội dung dùng Noto Sans JP; mẫu chữ kana/kanji để tập viết dùng Klee One
- Cỡ chữ Nhật mục tiêu trên slide 72px, nội dung đọc 22px; không nhỏ hơn 48px trên khung slide và 20px trên trang đọc. Kiểm tra thực tế với nội dung dài nhất
- Furigana dùng thẻ `<ruby>` gốc của HTML
- Màu dùng để mang thông tin, không dùng để trang trí: đỏ là sai, xanh là đúng, vàng là cần chú ý
- Mọi thao tác quan trọng phải bấm được bằng bàn phím, vì giảng viên đứng lớp không rảnh tay rê chuột

## Màn hình dịch vụ nhiều giáo viên — chưa triển khai

[BD dịch vụ](basic-design/teaching-service.md) bổ sung SV01–SV06: đăng ký giáo viên, cấu hình lớp có sức chứa/link Meet/ngôn ngữ, thư viện cá nhân/được chia sẻ, cấp/thu hồi quyền version và upload/duyệt bài scan. Trang lớp học sinh hiển thị link Meet và học liệu đã mở theo quyền, không hiển thị notes riêng. Chi tiết route là đề xuất, không phải màn hình đã có.

Luồng mới: giáo viên đăng ký → xác minh → tạo lớp 10 chỗ → học sinh join → giáo viên mở slide và share tab qua Meet → giao bài → theo dõi/nhắc. Giáo viên nhận slide phải có quyền copy để tạo bài riêng trước khi gắn lớp mình. Ô tiếng Trung dùng IME/Unicode, không gắn wanakana; Nhật giữ quy tắc hiện tại. Review scan có trang nguồn bên cạnh câu tương tác, duyệt đáp án trước xuất bản.

## SV07 — Soạn bài theo mẫu, thiết kế mới chưa triển khai

Mở rộng màn hình tạo/sửa bài hiện có thành luồng 5 bước: chọn mẫu/mục tiêu → bảng nội dung → dựng slide → câu luyện → xem trước/xuất bản/giao lớp. Giáo viên không cần nhập mã bài hoặc thao tác JSON trong luồng cơ bản. Luôn có lưu nháp, quay lại và chỉnh slide chi tiết; dữ liệu chưa đủ vẫn lưu được, lỗi xuất bản dẫn tới đúng dòng/câu.

Bảng Việt–Trung gồm chữ Hán/pinyin/nghĩa Việt/ví dụ, hỗ trợ dán Excel. Desktop có preview cạnh nội dung, mobile chuyển vùng nhìn mà không mất sửa. Bài đầu bỏ phần ôn cũ được; mẫu chỉ gợi ý trình tự từ dễ đến khó, không ép giáo viên theo giáo trình cố định. Dựng lại/chuyển mẫu phải xem thay đổi trước khi xác nhận, giữ sửa tay mặc định. Chi tiết [biên soạn](content-authoring.md), [BD](basic-design/teaching-service.md), [DD](detail-design/teaching-service.md).

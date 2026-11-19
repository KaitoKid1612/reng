# Kiểm chứng Luyện đề và đề Reng N5 — 19/11/2026

Thiết kế ở [BD Luyện đề](../basic-design/exam-center.md).

## Ngân hàng đề N5 (`content/review-banks/n5-jlpt-mock.json`, 201 câu)

- 63 câu từ vựng, 66 câu ngữ pháp và đọc hiểu, 72 câu nghe: 40 câu có sẵn và 32 câu mới (`content/listening/n5-viet-listening-mock-41-72.json`).
- Audio của 32 câu mới tạo bằng Unreal Speech cùng giọng với bộ 1–40 (người dẫn Yuki, nữ Sakura, nam Haruto, giáo viên và nhân viên Rina). Cần người dùng nghe duyệt.
- Đoạn văn, tính số chữ không kể dấu cách và furigana:
  - đọc ngắn 106–127 chữ;
  - đọc trung bình 303–313 chữ;
  - tìm thông tin 157–201 chữ;
  - ngữ pháp đoạn văn 237–253 chữ.
- Một agent riêng soát 161 câu mới. Đã sửa:
  - Câu ★ số 5 sai đáp án.
  - Câu ★ số 7 có hai cách xếp đều đúng. Viết lại thành コーヒーに / ミルクを / 入れて / から: đổi chỗ hai mảnh đầu câu vẫn đúng, nhưng ô ★ luôn là 入れて.
  - Hai phương án nhiễu dùng ngữ pháp vượt N5 (ながら, 見よう).
  - Hai câu bị câu khác trong cùng đề làm lộ đáp án (ねる まえに; べんきょうしに 来ました).
  - Tên nhân vật trong giải thích đọc hiểu (Hà, Minh); "cậu" cho anh trai của mẹ.
  - Slide giới thiệu của bộ nghe 41–72.
- `npm run audit:jlpt-bank`:
  - Đủ 3 đề cho mọi dạng chữ.
  - Không câu sai định dạng, không kanji vượt N5/N4 thiếu furigana.
  - Phương án nhiễu kanji của 表記 không bị tính là lỗi, như đề thật.
- `npm run bank:sql` (chạy thử): 201 câu, 72 audio.

Bộ kiểm tra đề được sửa cho khớp với đề thật:
- Tự nhận cấp N5/N4.
- Chấp nhận câu 表記 katakana.
- Không tính phương án 表記 và từ gạch chân của 漢字読み.
- Coi là trong phạm vi các chữ đề chính thức in không furigana.
- Nhận đủ chữ tiếng Việt có dấu.
- Trong 20 câu nghe N5 cũ, câu 17 chỉ có phép tính tiếng Nhật trong giải thích; đã viết lại bằng tiếng Việt, ở cả hai ngân hàng N5.

## Tự động

- `tests/jlpt.test.ts`:
  - Ngân hàng N4 cho đề 85 câu đúng số câu từng dạng và thứ tự.
  - Đề thứ hai không trùng câu.
  - Ngân hàng thiếu một dạng thì quay về 70 câu.
- `tests/exam-library.test.ts`: đề chính thức (cấp, năm, tên); ngân hàng N4 đủ 2 đề và số đề còn lại sau khi dùng câu; ngân hàng theo bài Minna không phải nguồn đề.
- `tests/n5-jlpt-mock-bank.test.ts`: đủ 3 đề N5; 3 đề liên tiếp, mỗi đề 21/22/24 câu, không trùng câu; mọi câu nghe có MP3; đáp án hợp lệ.
- `npm run check`: 451/451.
- `e2e-supabase/exam-center.spec.ts` chạy trọn luồng:
  - Lớp tự học ghim ngân hàng N5; form Thi thử xem trước "21 + 22 + 24: 67 câu".
  - Mục Luyện đề ở thanh đầu trang mở trang; thư viện ghi "Đề Reng N5 số 1, còn đủ 3 đề".
  - Mở đề thì bảng có đề số 1 (90 phút) và thư viện chuyển sang "số 2, còn đủ 2 đề".
  - Làm đề mở trang đề 67 câu có nút Bắt đầu thi.
- `npm run test:e2e`: 41/41. `npm run test:e2e:supabase`: 48/48.
- `npm run build`: `/exams` render theo yêu cầu.

## Trình duyệt

Trang Luyện đề của giáo viên local (35 lớp, 51 đề, 5 nguồn đề), ở 1280, 1366, 1920 và 390 px:
- axe 0 lỗi, không lỗi console.
- Lúc đầu cột kết quả không xuống dòng làm bảng tràn ở 1280 px. Nay chữ trạng thái xuống dòng, nút và link giữ một dòng; cả 4 khổ không tràn.
- Trên điện thoại mỗi đề thành một khối.

## Kiểm tra UI/UX lần hai (chiều 19/11/2026)

Giáo viên local (39 lớp, 56 đề) và học viên demo, ở 1024, 1280, 1440, 1920 và 390 px, sáng và tối, bấm thật trên dev server. Kết quả trước khi sửa:
- **Bấm đúp "Mở đề này" mở 2 đề** (bảng từ 1 lên 3 dòng), tốn câu chưa ra của ngân hàng.
- Sau khi mở đề, trang cuộn tới dòng đề mới nhưng thông báo "Đã mở đề mới" nằm ở đầu trang, cách khoảng 1.500 px nên không thấy. Dòng mới không được đánh dấu, tên lớp bị cuộn khuất.
- Ở bảng có kết quả dài, các cột "Đề thi thử N4", "115 phút", "23:59 17/11/2026" và tiêu đề "Thời gian" bị bẻ hai dòng. Mỗi lớp lại có độ rộng cột khác nhau.
- Trên điện thoại, ngày giờ đứng một dòng riêng không có nhãn. "(lớp tự học)" bị bẻ giữa chữ.
- Thư viện ghi "Đã mở 0 đề".

Đã sửa:
- Form mở đề chặn lần gửi thứ hai và nút ghi "Đang mở…". Bấm đúp nay mở 1 đề (thử 2 lần). Mở liên tiếp hai đề không tải lại trang vẫn được.
- Thông báo nằm dưới tên lớp vừa mở đề, trang cuộn tới tên lớp, dòng đề mới tô nền `--primary-soft`.
- Bảng cố định cột từ 1100 px: 277/170/110/170/409 px ở mọi lớp. Không ô nào tràn ở 1024–1920.
- Kết quả: điểm in đậm, lý do nhỏ bên dưới.
- Trên điện thoại có dòng "Loại · số phút · Hạn bắt đầu …", ngày giờ không bị bẻ.
- Thư viện ghi "Chưa mở đề nào".

Sau khi sửa:
- axe 0 lỗi, không lỗi console, không tràn ngang ở cả 5 khổ.
- Tab đi qua menu tới **Làm đề** và **Mở đề này**, có viền focus.
- `npm run check`: 456/456.
- `e2e-supabase/exam-center.spec.ts` nay bấm đúp nút mở đề, kiểm tra bảng chỉ có 1 đề và thông báo nằm trong khung nhìn. Spec này và `jlpt-mock-exam.spec.ts` đều qua.

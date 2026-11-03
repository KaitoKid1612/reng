# Rà soát bài tập học viên cho tiếng Nhật và tiếng Trung — 03/11/2026

## Kết luận

Nền bài tập vốn đã viết chung cho hai ngôn ngữ: dạng câu, chấm theo profile, bài hằng ngày, kết quả, sổ lỗi, ôn tập và flashcard. Nhưng đường làm bài của học viên còn nhiều chỗ ngầm định tiếng Nhật:

- Ô trả lời câu nghe luôn đổi romaji thành kana.
- Transcript và đáp án trong phản hồi bị gắn ngôn ngữ tiếng Nhật.
- Chỉ lớp tiếng Nhật có bài luyện chữ (kanji).
- Nhãn phần chỉ nhận tag tiếng Nhật.
- Ngân hàng ôn dạng JSON không ghi ngôn ngữ, nên một bộ câu tiếng Trung soạn thiếu sẽ bị chấm và hiển thị như tiếng Nhật.

Các điểm này đã sửa trong đợt này: hai ngôn ngữ dùng cùng tính năng, mỗi ngôn ngữ có cách nhập, chấm và hiển thị riêng. Những phần cần nội dung hoặc dịch vụ mới (audio tiếng Trung, trình soạn câu sắp xếp/đọc hiểu cho tiếng Trung) được ghi ở mục Còn lại.

Trước đó, ngày 02/11 đã sửa thẻ ngôn ngữ ở trang kết quả, sổ lỗi, trang học viên và danh sách câu sai nhiều. Ô pinyin cũng đã nhận số thanh. Xem [rà soát 02/11](user-flow-review-2026-11-02.md).

## Phạm vi

Màn hình học viên: làm bài, phản hồi khi kiểm tra câu, kết quả, sổ lỗi, ôn tập, bài hằng ngày, flashcard, luyện chữ. Phía giáo viên liên quan tới bài tập: nhật ký buổi dạy, mô tả bài hằng ngày. Công cụ ngân hàng ôn (`npm run bank:sql`) và tài liệu: [dạng bài và chấm](../07-exercises-and-grading.md), [biên soạn](../content-authoring.md), [luyện kanji](../basic-design/kanji-practice.md).

## Phát hiện và xử lý

Ưu tiên: P1 làm sai bài hoặc thiếu tính năng cho một ngôn ngữ; P2 hiển thị hoặc chấm sai một phần; P3 tên gọi, câu chữ.

| Mã | Ưu tiên | Vấn đề | Xử lý |
| --- | --- | --- | --- |
| EX-01 | P1 | Câu nghe dạng điền luôn dùng ô tiếng Nhật, nên học viên tiếng Trung gõ chữ Latin sẽ bị đổi thành kana | Ô theo ngôn ngữ câu: tiếng Nhật đổi romaji, tiếng Trung gõ bằng IME |
| EX-02 | P1 | Lớp tiếng Trung không có bài luyện chữ; trang luyện trả danh sách rỗng cho bài tiếng Trung | "Luyện chữ Hán" cho bài tiếng Trung: gõ pinyin (nhận số thanh), chọn chữ Hán, chọn nghĩa. Có link ở trang bài và trang lớp |
| EX-03 | P1 | Ngân hàng ôn JSON không ghi ngôn ngữ. Câu tiếng Trung thiếu `zh-exact-v1` bị chấm lỏng theo tiếng Nhật và hiện font Nhật. Từ vựng v1 có trường riêng của tiếng Nhật | `lib/review-bank.ts` kiểm tra bank theo ngôn ngữ; `npm run bank:sql -- --language` dừng khi không khớp |
| EX-04 | P2 | Transcript trong phản hồi gắn `lang="ja"` | Theo ngôn ngữ câu (`transcriptLang`) |
| EX-05 | P2 | Phản hồi khi ôn câu sai gắn đáp án pinyin/chữ Hán theo ngôn ngữ đề | Theo ô nhập (`answerLang`) như trang kết quả |
| EX-06 | P2 | Nhãn phần chỉ biết tag Nhật, nên câu tiếng Trung không có nhãn | Thêm `hanzi`, `pinyin`, `tones`, `meaning`, `measure-words`, `listening`. Tag trùng nhãn tiếng Việt ("Từ vựng" của trình soạn tiếng Trung) cũng hiện |
| EX-07 | P3 | Ô nhập dùng cho mọi ngôn ngữ nhưng tên là `JapaneseInput` | Đổi thành `AnswerInput` (`components/classroom/answer-input.tsx`) |
| EX-08 | P3 | Ví dụ ghi chú buổi dạy và mô tả bài hằng ngày chỉ lấy ví dụ tiếng Nhật | Ví dụ theo ngôn ngữ lớp; mô tả dùng "chữ Hán" |
| EX-09 | P3 | Tài liệu: bảng dạng bài ghi "Gõ tiếng Nhật"; chưa có hướng dẫn ngân hàng ôn cho hai ngôn ngữ; luyện kanji chỉ nói tiếng Nhật | Cập nhật [07](../07-exercises-and-grading.md), [biên soạn](../content-authoring.md#ngân-hàng-ôn-cho-lớp-nhật-và-trung), [luyện kanji](../basic-design/kanji-practice.md), BD/DD |

## Còn lại

| Việc | Lý do | Đề xuất |
| --- | --- | --- |
| Audio sinh sẵn và câu nghe cho tiếng Trung | `lib/audio-config.ts` chỉ nhận giọng Azure `ja-JP-*Neural`; kế hoạch audio đọc trường từ vựng của bài tiếng Nhật v1. Nút Nghe ở bài tiếng Trung dùng giọng `zh-CN`/`zh-TW` của thiết bị | Thêm giọng `zh-CN`/`zh-TW`, kế hoạch audio cho bài v2 và trình soạn câu nghe tiếng Trung; cần khóa Azure để kiểm thử |
| Câu sắp xếp và đọc hiểu có đoạn văn cho tiếng Trung | Trình soạn tiếng Trung tạo câu nghĩa/chữ Hán/pinyin; câu `order` và `passage` hiện soạn bằng JSON ngân hàng ôn | Thêm hai dạng này vào bước Câu luyện của trình soạn |
| Trang tự học công khai | Bảng chữ cái, luyện kana, ngữ pháp chỉ có tiếng Nhật | Bảng pinyin và luyện thanh điệu (đã đề xuất ở rà soát 02/11) |
| Mặc định lớp mới là tiếng Nhật | Lựa chọn của pilot | Giữ; giáo viên chọn ngôn ngữ khi tạo lớp |
| Đường dẫn `/kanji/[lessonId]` dùng cho cả chữ Hán | Giữ link cũ đã gửi cho học viên | Có thể đổi sang đường dẫn trung tính kèm redirect khi cần |

## Kiểm chứng

- Unit test:
  - `tests/kanji-practice.test.ts`: lấy từ bài tiếng Trung; pinyin đúng khi khác hoa/thường, khoảng trắng; sai khi thiếu hoặc sai dấu thanh; luật kana không áp cho pinyin.
  - `tests/review-bank.test.ts`: một ngân hàng tiếng Trung mẫu có sắp xếp, pinyin, đọc hiểu cùng đoạn văn; chấm, `lang`, nhãn phần và bài hằng ngày như ngân hàng tiếng Nhật. Bank tiếng Nhật nhập sai ngôn ngữ bị chặn.
- Kết quả `npm run check`, E2E và kiểm tra trình duyệt ghi ở [mục kết quả](#kết-quả-kiểm-thử).

### Kết quả kiểm thử

- `npm run check`: PASS 174/174, gồm Prettier, ESLint, TypeScript và test logic/database.
- `npm run test:e2e`: PASS 36/36. Luyện kanji tiếng Nhật giữ nguyên chữ và hành vi.
- `npm run test:e2e:supabase` trên stack local: PASS 35/35, gồm luồng soạn, đọc và chấm bài tiếng Trung.
- `npm run build`: PASS.
- Kiểm tra trình duyệt với dữ liệu local, học viên demo lớp tiếng Trung, màn hình 390px:
  - Trang lớp có link "Luyện chữ Hán", trang luyện có tiêu đề "Luyện chữ Hán: …", ô ghi "Pinyin có dấu thanh".
  - Gõ `xie4xie`, `ming2zi`, `lao3shi1`, `zai4jian4`, `ni3 hao3` ra đúng dấu thanh, đúng cả 5/5 từ.

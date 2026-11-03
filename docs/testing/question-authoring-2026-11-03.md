# Soạn câu sắp xếp và đọc hiểu — 03/11/2026

## Kết luận

Từ đợt này, giáo viên soạn được câu **sắp xếp** và câu **đọc hiểu có đoạn văn** ở ba nơi: trình soạn tiếng Nhật, trình soạn tiếng Trung và câu kiểm tra riêng khi giao bài. Trước đó hai dạng này chỉ nhập được bằng JSON ngân hàng ôn, nên giáo viên chưa tự làm được bài tập đa dạng.

Rà luồng soạn → giao → làm bài → slide phát hiện sáu lỗi, đã sửa cùng đợt. Lỗi nặng nhất có từ trước và đang ảnh hưởng ngân hàng ôn hiện có: sửa một câu đọc hiểu trên trình soạn tiếng Nhật làm mất đoạn văn.

Không đổi schema database, không cần migration; deploy code là đủ.

## Luồng đã rà

| Bước | Trước | Sau |
| --- | --- | --- |
| Soạn trên trình soạn tiếng Nhật | Trắc nghiệm, điền, nghe, chính tả. Câu sắp xếp của bank hiện "chưa sửa được"; câu đọc hiểu sửa được nhưng mất đoạn văn | Thêm câu sắp xếp, ô đoạn văn và nút thêm câu cho cùng đoạn văn; sửa câu giữ đoạn văn và ngôn ngữ |
| Soạn trên trình soạn tiếng Trung | Trắc nghiệm, điền | Thêm câu sắp xếp và đoạn văn; xác nhận lại đáp án khi sửa mảnh |
| Câu kiểm tra riêng khi giao bài | Trắc nghiệm, điền | Thêm câu sắp xếp và đoạn văn |
| Giao bài, làm bài, kết quả, sổ lỗi, bài hằng ngày | Đã nhận câu sắp xếp và đoạn văn từ ngân hàng ôn | Không đổi; kiểm chứng lại bằng E2E trên khổ điện thoại 390px |
| Slide câu luyện | Chỉ đề và lựa chọn | Hiện đoạn văn và các mảnh đã xáo; "Hiện đáp án" cho câu ghép đúng |

## Lỗi phát hiện và xử lý

Ưu tiên: P1 sai dữ liệu hoặc lộ đáp án; P2 sai trạng thái hoặc thiếu kiểm tra; P3 không nhất quán.

| Mã | Ưu tiên | Vấn đề | Xử lý |
| --- | --- | --- | --- |
| QA-01 | P1 | Trình soạn tiếng Nhật coi câu trắc nghiệm/điền có `passage` hoặc `gradingProfile` là sửa được, nhưng lưu lại chỉ với đề, lựa chọn, đáp án. Sửa một chữ của câu đọc hiểu trong bank N4 (50 câu có đoạn văn) làm mất đoạn văn; sửa câu của bank tiếng Trung làm câu mất `zh-exact-v1`, bị chấm theo luật tiếng Nhật và hiện font Nhật. Tài liệu DD lại ghi các câu này "chỉ đọc" | `lib/editor-questions.ts` giữ `passage`, `tags`, `gradingProfile`; nháp v1 có hai trường này; form hiện ngôn ngữ theo câu |
| QA-02 | P1 | Mã mảnh sinh theo thứ tự câu (`p1`, `p2`…) sẽ lộ đáp án: mã mảnh được gửi tới trình duyệt học viên kể cả trong bài kiểm tra. Phát hiện khi đối chiếu với quy ước của ngân hàng ôn, trước khi phát hành | Mã mảnh ngẫu nhiên (`createUniqueId("p")`) |
| QA-03 | P2 | Trình soạn tiếng Trung kiểm tra "đã xác nhận đáp án" bằng `JSON.stringify` với danh sách khóa cấp đầu. Danh sách này lọc cả object lồng nhau, nên sửa chữ trong một mảnh vẫn hiện "Đã xác nhận" trong khi server từ chối xuất bản | So sánh bằng `stableJson` sâu |
| QA-04 | P2 | Server action giao bài kiểm tra không parse lại câu hỏi bằng schema của form; chỉ schema câu chung chặn, nên giới hạn của form (đề ≤ 500 ký tự, ≤ 6 lựa chọn) không được server kiểm tra | `toTestQuestions` parse `testQuestionInputSchema` |
| QA-05 | P2 | Xem trước slide trong trình soạn tiếng Trung tự chép phần chuyển câu hỏi, thiếu đoạn văn và mảnh. E2E phát hiện | Dùng chung `toPublicQuestion` với bài đã xuất bản |
| QA-06 (CR-28) | P3 | Câu điền đổi ô nhập sang chữ Hán/pinyin trên trình soạn tiếng Nhật vẫn chấm theo luật tiếng Nhật | Ô chữ Hán/pinyin gắn `zh-exact-v1`, ô tiếng Nhật bỏ profile, như câu kiểm tra riêng |
| QA-07 | P3 | Trang lớp hiện "Flashcard" và "Luyện kanji/chữ Hán" cho cả ngân hàng câu hỏi không có từ vựng; trang đọc bài tiếng Nhật luôn hiện "Flashcard từ vựng". Học viên mở ra trang trống | `listClassLessons` đọc thêm từ đầu tiên của bài (`hasVocab`); hai link chỉ hiện khi bài có từ vựng |

## Giới hạn còn lại

- Câu sắp xếp có một thứ tự đúng và chưa có mảnh nhiễu.
- Slide bài tiếng Nhật chưa chọn được câu sắp xếp: schema slide v1 chỉ nhận câu trắc nghiệm và điền. Bài tiếng Trung có.
- Trình soạn tiếng Nhật đổi mã mảnh mỗi lần sửa câu sắp xếp. Bài đã giao không bị ảnh hưởng vì lưu bản chụp câu hỏi.
- Chưa thử trên điện thoại thật với bàn phím ảo và bộ gõ tiếng Nhật/Trung.

## Kiểm chứng

- `tests/question-authoring.test.ts`:
  - Sửa câu đọc hiểu và câu tiếng Trung của bank giữ đoạn văn và profile; ô nhập quyết định luật chấm.
  - Câu sắp xếp đi qua trình soạn web, giữ dòng đang gõ và bỏ mảnh trống khi xuất bản.
  - Câu cho cùng đoạn văn chèn ngay sau câu gốc, ở cả hai trình soạn.
  - Câu kiểm tra riêng có câu sắp xếp và đoạn văn; server áp cùng giới hạn.
  - Trình soạn tiếng Trung báo lỗi mảnh, bỏ đoạn văn trống, nhận ra mảnh đã sửa.
  - Slide hiện mảnh theo thứ tự xáo, không bao giờ trùng đáp án.
- `e2e-supabase/question-authoring.spec.ts`:
  - Giáo viên tiếng Nhật soạn câu sắp xếp và hai câu đọc hiểu cùng đoạn văn trên trình soạn web, xuất bản, giao luyện tập và bài kiểm tra có câu sắp xếp. Học viên làm bài trên khổ 390px, không cuộn ngang, đạt 100%; bài kiểm tra được chấm đúng. Bài không có từ vựng nên trang lớp và trang đọc bài không có link Flashcard/Luyện kanji.
  - Giáo viên tiếng Trung soạn câu sắp xếp có đoạn văn, xác nhận, sửa mảnh thì phải xác nhận lại. Xem trước slide hiện đoạn văn và mảnh đã xáo; slide đã xuất bản "Hiện đáp án" ra câu ghép đúng.

### Kết quả kiểm thử

- `npm run check`: PASS 182/182, gồm Prettier, ESLint, TypeScript và test logic/database.
- `npm run test:e2e`: PASS 36/36, gồm trang hướng dẫn đã bổ sung câu sắp xếp và đọc hiểu.
- `npm run test:e2e:supabase` trên stack local:
  - Cả bộ: PASS 38/38.
  - Sau khi đổi sang mã mảnh ngẫu nhiên và sửa trang hướng dẫn, chạy lại ba spec liên quan (soạn câu, lớp học, trình soạn tiếng Trung): PASS 14/14.
- Thử khôi phục lỗi cũ: QA-01 (bỏ `passage`/`gradingProfile` khi sửa) và QA-03 (replacer cấp đầu) đều làm test mới fail; trả code về thì đạt.
- `npm run build`: PASS.
- Ảnh chụp từ E2E: trang làm bài 390px (câu sắp xếp đã xếp, phản hồi "Đúng rồi!"), trình soạn (ô mảnh, dòng "Câu đúng", ô đoạn văn) và slide câu luyện tiếng Trung sau khi bấm "Hiện đáp án".

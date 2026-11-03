# Trang chung không gắn môn — 03/11/2026

Yêu cầu của người dùng: trang chủ và nhiều chỗ khác đang gắn cứng tiếng Nhật, bấm vào thấy giống trang học tiếng Nhật/tiếng Trung hơn là nơi dạy online. Reng cần là nơi dạy và học online nói chung, sau này dạy được toán hoặc lớp khác.

Nguyên tắc sau khi sửa: phần chung của trang (trang chủ, header, chân trang, tiêu đề, mô tả, ảnh chia sẻ) không nêu môn nào. Môn chỉ xuất hiện ở trang của môn đó, hoặc ở chỗ cần nói rõ môn nào đang có công cụ.

## Chỗ đã sửa

| Chỗ | Trước | Sau |
|---|---|---|
| Trang chủ | "Học và dạy ngoại ngữ trên Reng", mẫu chữ Hiragana, "Tôi muốn tự học tiếng Nhật", khối "Học theo nhịp của bạn" nói về chữ kana | "Dạy và học online trên Reng", ba bước của một buổi học (trước, trong, sau), ba lối vào (có mã lớp, giảng dạy, tự học), ba chức năng chung |
| Header | Chú thích "Học và dạy ngoại ngữ online"; Bài học, Ngữ pháp, Bảng chữ cái, Luyện kana hiện ở mọi trang | Chú thích "Dạy và học online"; một mục Tự học |
| Chân trang, tiêu đề mặc định, mô tả, ảnh chia sẻ | "Lớp học ngoại ngữ online…", "soạn slide tiếng Nhật và tiếng Trung" | "Lớp học online cho giáo viên và học viên" (`SITE_TAGLINE`); ảnh 1200×630 vẽ lại |
| Trang Tự học (mới, `/self-study`) | — | Bài học công khai và công cụ theo môn; hiện có Tiếng Nhật (Bảng chữ cái, Luyện kana, Tra ngữ pháp) |
| `/kana`, `/kana/practice`, `/grammar` | Chuyển qua lại bằng header | Thanh "Tự học / Tiếng Nhật" ở đầu trang; tiêu đề ngữ pháp ghi rõ "tiếng Nhật" |
| `/for-teachers` | "Dạy tiếng Nhật và tiếng Trung online cho học viên Việt Nam", câu hỏi "Tôi có thể dạy tiếng Nhật…" | "Mở lớp dạy online cho học viên Việt Nam", mục "Môn học hiện có", câu hỏi "Reng dạy được những môn nào?" |
| `/sign-up/teacher` | Mô tả "mở lớp tiếng Trung online" | "mở lớp online" |
| `/lessons` | "Bài học nhập môn", "Từ những câu chào đầu tiên…", nút "Tra ngữ pháp" | "Bài học công khai", nút "Công cụ tự học theo môn" |
| Trang 404 | Dẫn về bảng chữ cái | Dẫn về trang chủ và Lớp của tôi |
| Biểu mẫu lớp | Nhãn "Ngôn ngữ học", ví dụ "Tiếng Nhật Minna sơ cấp – tối thứ Ba" | Nhãn "Môn học", ví dụ "Lớp sơ cấp – tối thứ Ba"; giá trị lưu không đổi |
| Hướng dẫn | Mục "Tạo bài học" chỉ nói bài Nhật; câu hỏi nút Nghe chỉ nói giọng Nhật | Mục "Soạn bài tiếng Nhật"; giọng đọc theo ngôn ngữ của bài |

Giữ nguyên vì đúng là công cụ của một môn: trình soạn tiếng Nhật và tiếng Trung, nhập từ vựng tiếng Nhật bằng CSV, trang kana và ngữ pháp, trang nguồn dữ liệu, nhãn ngôn ngữ trên bài và lớp, ô trả lời theo ngôn ngữ của câu.

## Kiểm tra

- `npm run check` (format, ESLint, TypeScript, unit/database test): đạt, 191/191 test.
- Browser local (`next dev`, `LESSON_SOURCE=local`, không Supabase), 1280px và 360px: `/`, `/self-study`, `/for-teachers`, `/lessons`, `/kana`, `/kana/practice`, `/grammar` trả 200, đường dẫn lạ trả 404; không trang nào tràn ngang. axe (WCAG A/AA) lần đầu báo `link-in-text-block` ở 6 trang: link nằm trong câu chỉ khác màu chữ, vì preflight Tailwind bỏ gạch chân. Đã thêm gạch chân cho link trong đoạn đầu trang và thanh môn; chạy lại axe không còn lỗi.
- E2E (`npm run test:e2e`, `npm run test:e2e:supabase`): **chưa chạy**. Người dùng yêu cầu ngày 03/11/2026 làm xong chức năng trước, rà soát sau. Câu chữ mong đợi đã sửa sẵn trong `e2e/navigation.spec.ts`, `e2e/seo.spec.ts`, `e2e/kana.spec.ts`, `e2e-supabase/minna-teaching.spec.ts` và `e2e-supabase/teaching-authoring.spec.ts`.

## Phần còn gắn với ngôn ngữ

Lần này chỉ đổi phần chung của trang. Để dạy một môn không phải ngôn ngữ (ví dụ toán), còn cần:

| Phần | Hiện trạng | Cần làm |
|---|---|---|
| Dữ liệu lớp | `classes.subject` chỉ nhận `japanese`/`chinese`, `classes.language_tag` chỉ nhận `ja-JP`/`zh-Hans`/`zh-Hant` (migration `202610290001`) | Migration mở rộng danh sách môn; môn không phải ngôn ngữ không bắt buộc ngôn ngữ học |
| Soạn bài | Hai trình soạn: v1 tiếng Nhật (từ vựng, mẫu câu, furigana) và v2 tiếng Trung (`subject: "chinese"`, chữ Hán/pinyin) | Một loại bài chung: slide chữ/ảnh, câu hỏi trắc nghiệm, điền, sắp xếp, đáp số |
| Trang đọc bài, flashcard, ôn tập | Chia khối từ vựng, mẫu câu, hội thoại; flashcard và thẻ ôn lấy từ từ vựng | Trang đọc theo slide/mục của bài chung; ôn tập dựa trên câu sai khi bài không có từ vựng |
| Chấm điểm | Chuẩn hóa kana/romaji, `zh-exact-v1` cho chữ Hán/pinyin | Chấm đáp số (số thập phân, phân số, sai số cho phép) |
| Hiển thị | Font Nhật/Trung, audio/TTS theo ngôn ngữ | Công thức toán (ví dụ KaTeX) nếu dạy toán |
| Trang lớp và giáo viên | Link "Luyện kanji"/"Luyện chữ Hán" theo ngôn ngữ lớp; bộ lọc "Ngôn ngữ bài học"; trang Tạo bài mới chỉ có hai môn | Chọn môn trước, rồi mới hiện công cụ của môn đó |

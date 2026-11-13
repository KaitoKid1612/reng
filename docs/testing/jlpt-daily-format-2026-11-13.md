# Bài hằng ngày theo cấu trúc đề JLPT — 13/11/2026

Yêu cầu của người dùng: bài hằng ngày của lớp ôn thi N4 (Việt, thi ngày 06/12/2026) phải giống đề thật, khác lớp đang học theo bài (Nguyên). Người dùng chọn bài 67 câu, trần ngân hàng 500 câu, và chuyển câu gõ đáp án thành câu trắc nghiệm.

Thiết kế: [BD](../basic-design/teaching-service.md#bài-hằng-ngày-theo-cấu-trúc-đề-jlpt--13112026), [DD](../detail-design/teaching-service.md#bài-hằng-ngày-theo-cấu-trúc-đề-jlpt--13112026).

## Phân tích trước khi làm

Mô phỏng 20 ngày bằng bộ chọn câu thật trên ngân hàng N4 cũ (390 câu, 70 câu mỗi ngày, 10 câu nghe):

- Câu bắt đầu lặp từ ngày thứ 5–6. Bộ chọn không có lỗi: ngân hàng chỉ đủ khoảng 5 ngày.
- Mỗi ngày có 23 câu gõ đáp án (đọc kanji, biến đổi từ, trợ từ). Đề JLPT chỉ có trắc nghiệm.
- Ngân hàng thiếu 用法, 文章の文法 và 情報検索. Đọc hiểu chỉ có 10 đoạn khoảng 100 chữ.
- Bộ chọn chia câu theo tỉ lệ có sẵn trong ngân hàng và đặt câu nghe lên đầu, nên không ra được cấu trúc đề.

## Số câu từng もんだい

Bảng "大問のねらい" N4/N5 trên jlpt.jp (`guideline/pdf/n4_revised.pdf`, `n5_revised.pdf`, bản sửa 2022) chỉ liệt kê các もんだい và độ dài bài đọc: N4 có đoạn ngắn 100–200 chữ, đoạn trung bình khoảng 450 chữ, tờ thông tin khoảng 400 chữ. Bảng không in số câu. Reng dùng số câu phổ biến từ kỳ 12/2020. Nếu đề thật lệch một vài câu ở một もんだい, chỉ cần sửa `PART_COUNTS` trong `lib/jlpt-parts.ts`.

## Kết quả

- `npm run check`: PASS, gồm định dạng, ESLint, TypeScript và 379/379 test.
- `tests/jlpt-daily-practice.test.ts`: 6/6 test đạt.
- `tests/daily-practice-migration.test.ts`: migration chạy trên PGlite cùng mọi migration trước. Cột mặc định `balanced`, lưu được `jlpt-n4`, gọi 5 tham số giữ nguyên cách chia, `jlpt-n3` bị từ chối.
- E2E chưa chạy: theo thỏa thuận, đợt tính năng này hoãn E2E. Bước mới trong `e2e-supabase/teach-and-learn.spec.ts` đã viết nhưng chưa chạy.
- Chưa áp migration lên production.

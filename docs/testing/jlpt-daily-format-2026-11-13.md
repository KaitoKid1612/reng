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

## Soạn và soát ngân hàng N4

Ngân hàng 479 câu được soạn theo [quy ước](../content-authoring.md#ngân-hàng-n4-theo-cấu-trúc-đề--13112026).

1. **Soạn:** năm agent soạn song song, mỗi agent một nhóm もんだい. Mỗi agent dùng lại câu tốt của ngân hàng cũ và viết thêm câu mới. Một công cụ kiểm tra tạm (ngoài repo) bắt các lỗi: sai lời dẫn hoặc tag, không đủ 4 lựa chọn, vị trí đáp án lệch, đoạn văn sai độ dài hoặc sai số câu, thiếu dấu gạch chân hoặc chỗ trống, furigana để lộ đáp án.
2. **Soát độc lập:** ba agent khác đọc lại toàn bộ như giáo viên khó tính.

| Phần | Câu đã sửa | Lỗi chính |
|---|---|---|
| Chữ và từ vựng | 32 | Câu đọc kanji hoặc câu chính tả gần trùng câu 文脈規定 có đáp án là chính từ đó; furigana ở phần khác để lộ cách đọc |
| Ngữ pháp | 31 | Lựa chọn sai vẫn đúng ngữ pháp (受身, 聞けます, おいしいそう, おります…); câu ★ trùng câu ngữ pháp khác hoặc có mảnh ★ là đáp án của câu khác |
| Đọc hiểu | 6 | Ngày 12月7日（土） sai thứ (năm 2026 là thứ Hai); một câu trả lời được bằng hiểu biết chung; lựa chọn sai còn biện hộ được trong đoạn văn |

3. **Kiểm tra chéo bằng script:** bỏ 48 furigana trên những từ mà phần 漢字読み đang hỏi. Ba từ (準備, 途中, 値段) viết lại bằng chữ Hán trong đoạn văn. Phần 文脈規定 vẫn có vài lựa chọn sai viết bằng hiragana trùng cách đọc của từ phần 漢字読み. Đây là cách đề thật viết, và đó không phải đáp án đúng.

Các chỗ đã cân nhắc và giữ nguyên:

- `grammar-form-080` giữ 食べません làm lựa chọn sai, đối với câu trả lời まだ 食べて いません. Đây là cặp đối chiếu chuẩn của JLPT.
- Vài từ 漢字読み (地震, 習字, 途中) dùng chữ Hán trên N4, nhưng là từ vựng N4 của Minna.

Giáo viên vẫn nên đọc lại trước khi nạp lên production.

## Kết quả

- `npm run check`: PASS, gồm định dạng, ESLint, TypeScript và 381/381 test.
- `tests/n4-jlpt-bank.test.ts`: mỗi câu có một もんだい, là câu chọn 4 lựa chọn có đáp án chấm đúng, mỗi phần một lời dẫn, vị trí đáp án chia đều, số câu mỗi đoạn văn đúng. 7 ngày liền mỗi ngày 67 câu, đúng số câu từng もんだい, đúng thứ tự, không lặp câu ở phần chữ, ngữ pháp và đọc.
- `tests/daily-listening-review-banks.test.ts`: ngân hàng N4 có 479 câu, 60 câu nghe, audio đều có trong repo.
- `npm run bank:sql` chạy thử: 479 câu, đăng ký 60 audio đi kèm, file kết thúc bằng ROLLBACK.
- `tests/jlpt-daily-practice.test.ts`: 6/6 test đạt.
- `tests/daily-practice-migration.test.ts`: migration chạy trên PGlite cùng mọi migration trước. Cột mặc định `balanced`, lưu được `jlpt-n4`, gọi 5 tham số giữ nguyên cách chia, `jlpt-n3` bị từ chối.
- E2E chưa chạy: theo thỏa thuận, đợt tính năng này hoãn E2E. Bước mới trong `e2e-supabase/teach-and-learn.spec.ts` đã viết nhưng chưa chạy.
- Người dùng đã áp migration `20261113032756_daily_practice_format` lên production ngày 13/11/2026; `migration list --linked` xác nhận. Cùng ngày người dùng nạp ngân hàng vào bài `n4-viet-review-bank` bằng `bank:sql --lesson n4-viet-review-bank --commit`. Đọc lại production: phiên bản 8 có 479 câu, lớp Ôn JLPT N4 – Việt dùng phiên bản mới nhất và vẫn lấy câu hằng ngày từ bài này. Lúc kiểm tra, lớp vẫn đặt "Theo tỉ lệ", 70 câu, 10 câu nghe; giáo viên cần đổi sang "Theo cấu trúc đề JLPT N4" và 67 câu ở trang lớp.

## Ngân hàng Minna 1–16 cho lớp Nguyên

Đọc production (chỉ đọc): lớp Tiếng Nhật Minna – Lớp 1 lấy 60 câu mỗi ngày, 0 câu nghe, từ "Ngân hàng ôn Minna N5 – Nguyên" (phiên bản 8: 84 câu thường, 118 câu nghe). 16 bài Minna của lớp có khoảng 520 câu luyện nhưng bài hằng ngày không dùng.

- **Dung lượng:** database production 19 MB. Phiên bản bài lớn nhất 122 kB sau nén. Mỗi bài giao khoảng 40 kB. Ngân hàng 500 câu thêm khoảng 0,1 MB mỗi lần xuất bản. Trần 500 câu được giữ vì trình soạn lưu nháp qua server action giới hạn 1 MB; ngân hàng 479 câu của Việt đã khoảng 450 kB.
- **Lỗi bộ chọn câu phát hiện khi mô phỏng:** ghế dư luôn về cùng các dạng, nên 32 câu ghép đôi không bao giờ được chọn và câu lặp từ ngày thứ 4. Sau khi sửa: 8 ngày đầu không lặp, mọi câu đều được dùng ([DD](../detail-design/teaching-service.md#chia-phần-dư-theo-lượt-và-tạo-ngân-hàng-mới-bằng-banksql--13112026)).
- **Nội dung mới:** 32 câu sắp xếp và 16 câu đọc do một agent soạn, một agent khác soát; 32 câu ghép đôi tạo tự động từ danh sách từ đã duyệt và cũng được soát. 420 câu còn lại lấy nguyên từ bài mẫu đã duyệt.
- **Test:**
  - `tests/n5-minna-bank.test.ts`: 500 câu, đủ 16 bài (bài 11–16 nhiều hơn), 4 dạng câu, mọi đáp án chấm đúng, cột phải câu ghép đôi đã xáo, 8 ngày 60 câu không lặp và dùng hết kho.
  - `tests/review-bank-sql.test.ts`: tạo bài cho lớp, đặt nguồn bài hằng ngày.


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
- E2E chạy ngày 16/11/2026 trên Supabase local, sau khi áp migration `20261113032756_daily_practice_format`: `npm run test:e2e:supabase` 43/43 đạt, gồm bước mới trong `e2e-supabase/teach-and-learn.spec.ts`; `npm run test:e2e` 36/36 đạt.
- Người dùng đã áp migration `20261113032756_daily_practice_format` lên production ngày 13/11/2026; `migration list --linked` xác nhận. Cùng ngày người dùng nạp ngân hàng vào bài `n4-viet-review-bank` bằng `bank:sql --lesson n4-viet-review-bank --commit`. Đọc lại production: phiên bản 8 có 479 câu, lớp Ôn JLPT N4 – Việt dùng phiên bản mới nhất và vẫn lấy câu hằng ngày từ bài này. Lúc kiểm tra, lớp vẫn đặt "Theo tỉ lệ", 70 câu, 10 câu nghe; giáo viên cần đổi sang "Theo cấu trúc đề JLPT N4" và 67 câu ở trang lớp.

## Ngân hàng Minna 1–16 cho lớp Nguyên

Đọc production (chỉ đọc): lớp Tiếng Nhật Minna – Lớp 1 lấy 60 câu mỗi ngày, 0 câu nghe, từ "Ngân hàng ôn Minna N5 – Nguyên" (phiên bản 8: 84 câu thường, 118 câu nghe). 16 bài Minna của lớp có khoảng 520 câu luyện nhưng bài hằng ngày không dùng.

- **Dung lượng:** database production 19 MB. Phiên bản bài lớn nhất 122 kB sau nén. Mỗi bài giao khoảng 40 kB. Ngân hàng 500 câu thêm khoảng 0,1 MB mỗi lần xuất bản. Trần 500 câu được giữ vì trình soạn lưu nháp qua server action giới hạn 1 MB; ngân hàng 479 câu của Việt đã khoảng 450 kB.
- **Lỗi bộ chọn câu phát hiện khi mô phỏng:** ghế dư luôn về cùng các dạng, nên 32 câu ghép đôi không bao giờ được chọn và câu lặp từ ngày thứ 4. Sau khi sửa: 8 ngày đầu không lặp, mọi câu đều được dùng ([DD](../detail-design/teaching-service.md#chia-phần-dư-theo-lượt-và-tạo-ngân-hàng-mới-bằng-banksql--13112026)).
- **Nội dung mới:** 32 câu sắp xếp và 16 câu đọc do một agent soạn, một agent khác soát; 32 câu ghép đôi tạo tự động từ danh sách từ đã duyệt và cũng được soát. 420 câu còn lại lấy nguyên từ bài mẫu đã duyệt.
- **Test:**
  - `tests/n5-minna-bank.test.ts`: 500 câu, đủ 16 bài (bài 11–16 nhiều hơn), 4 dạng câu, mọi đáp án chấm đúng, cột phải câu ghép đôi đã xáo, 8 ngày 60 câu không lặp và dùng hết kho.
  - `tests/review-bank-sql.test.ts`: tạo bài cho lớp, đặt nguồn bài hằng ngày.
- **Nạp lên production (16/11/2026):** người dùng chạy thử `bank:sql --class <mã lớp Nguyên> --daily-source` (kết thúc bằng ROLLBACK), rồi chạy bản `--commit` bằng `npx supabase db query --linked`. Đọc lại production: lớp Tiếng Nhật Minna – Lớp 1 lấy bài hằng ngày từ `n5-minna-review-bank` (500 câu), vẫn 60 câu mỗi ngày, 0 câu nghe. Ngân hàng cũ vẫn ở trong lớp.

## Cân lại vị trí đáp án — 16/11/2026

Câu chọn hiện phương án theo đúng thứ tự soạn, nên vị trí đáp án phải chia đều. Khi soát bài mẫu 17, agent soát thấy bài mẫu 16 có đáp án ở các vị trí 8/23/9/0. Đếm lại toàn bộ:

| Nguồn | Trước | Sau | Câu đổi |
|---|---|---|---|
| Bài mẫu 1 | 6/15/8/5 | 9/8/8/9 | 7 |
| Bài mẫu 2 | 8/16/7/5 | 9/9/9/9 | 7 |
| Bài mẫu 12 | 6/11/9/4 | 8/7/7/8 | 6 |
| Bài mẫu 16 | 8/23/9/0 | 10/10/10/10 | 13 |
| Ngân hàng Minna 1–16 (cả kho) | 68/109/61/74 | cân theo từng bài | 57 |

Các bài mẫu khác đã đều. Ngân hàng bị lệch cả ở những bài có bài mẫu đều, vì cách chọn đều theo thứ tự lấy trúng chu kỳ vị trí của bài mẫu. Script tạm (ngoài repo) giữ câu có đáp án ở vị trí còn thiếu; với câu thừa, đáp án đúng đổi chỗ với phương án ở vị trí thiếu nhất. Mã câu, đề, lời giải và nội dung phương án giữ nguyên. Riêng lời giải `q1311` (ngân hàng và bài mẫu 13) viết lại vì nói "lựa chọn cuối".

- `tests/japanese-lessons.test.ts` và `tests/n5-minna-bank.test.ts`: mỗi vị trí chiếm 18–32% số câu chọn của một bài mẫu hoặc một bài trong ngân hàng. Trên nội dung cũ 5 test hỏng (bài mẫu 1, 2, 12, 16 và ngân hàng); trên nội dung mới đạt.
- 16/11/2026: ngân hàng đã nạp lại lên production bằng `bank:sql --commit` (không `--class`), thành phiên bản 2 với 500 câu; phương án B còn là đáp án đúng ở 75/312 câu chọn. Lớp của Nguyên dùng phiên bản mới nhất làm nguồn bài hằng ngày nên tự lấy bản 2. Bài 16 đã xuất bản trong lớp Nguyên giữ thứ tự cũ cho tới khi giáo viên dùng **so sánh và cập nhật từ mẫu** rồi xuất bản.

## Mở rộng ngân hàng Minna ra bài 1–25 — 18/11/2026

Người dùng xác nhận Nguyên thi JLPT N5 ngày 06/12/2026 và chọn thêm bài 17–25 vào ngân hàng hằng ngày, vẫn chia theo bài. File đổi tên thành `content/review-banks/n5-minna-1-25.json`; mã bài `n5-minna-review-bank` giữ nguyên.

- **Cách dựng (script tạm ngoài repo):** giữ trần 500 câu. Mỗi bài chia câu luyện thành các khúc liên tiếp theo thứ tự soạn và lấy một câu mỗi khúc: bài 1–10 giữ 13/24 câu, bài 11–16 giữ 14/30 câu (lấy từ câu đã có trong ngân hàng, giữ mã câu nên lịch sử bài hằng ngày vẫn khớp), bài 17–25 lấy 18/50 câu của bài mẫu. Mỗi dạng (chọn, điền, kanji) giữ tỉ lệ như trong bài; trong các cách chọn thỏa điều kiện, script giữ cách có vị trí đáp án đều nhất.
- **Nội dung mới:** 18 câu ghép đôi (10 từ mỗi bài 17–25, nghĩa viết ngắn), 18 câu sắp xếp và 4 đoạn đọc (bài 17, 19, 24, 25), mỗi đoạn 2 câu. Một agent độc lập soát đáp án, thứ tự mảnh duy nhất, độ tự nhiên, furigana và phạm vi ngữ pháp, và tìm ra 2 câu sắp xếp có thứ tự đúng thứ hai (`n5-order-40`, `n5-order-49`), đoạn đọc bài 25 dùng Vないで、V của bài 34, từ của bài sau trong câu và đoạn bài 19 (最近, 初め, 旅館) và hai nghĩa cùng "dẫn đi" trong `n5-match-24-1`. Đã sửa hết, kể cả câu `n5-order-50` viết lại để không giống câu ví dụ quen thuộc của bài 25.
- **Kết quả:** 500 câu: 308 chọn, 92 điền, 50 ghép đôi, 50 sắp xếp; vị trí đáp án mỗi bài chia đều, như 3/3/2/2 hoặc 4/4/4/4. File 284 kB, dưới giới hạn lưu nháp 1 MB.
- **Test:** `tests/n5-minna-bank.test.ts` kiểm tra đủ 25 bài, bài 17–25 nhiều câu hơn, 4 dạng câu, mọi đáp án chấm đúng, vị trí đáp án 18–32% mỗi bài, 8 ngày 60 câu không lặp và dùng hết kho. `npm run check` 418/418. `npm run bank:sql` (dry run) tạo được SQL cho 500 câu. E2E chưa chạy (chỉ đổi nội dung ngân hàng, không đổi mã).
- **Production:** người dùng báo đã nạp ngày 18/11/2026, nhưng đọc lại ngày 20/11/2026 thì production vẫn là bản 2 "Ôn Minna 1–16" (đề hằng ngày 20/11 chỉ có câu bài 1–16): file `n5.sql` đã chạy là bản thử, kết thúc bằng `rollback`. Người dùng chạy lại bản có `--commit`; đọc lại cùng ngày: bản 3 "Ôn Minna 1–25 – Nguyên", 500 câu (206 câu bài 17–25), lớp Nguyên vẫn lấy ngân hàng này 60 câu/ngày. Đề hằng ngày có bài 17–25 từ ngày 21/11. Cách nạp: chạy `npm run bank:sql -- --file content/review-banks/n5-minna-1-25.json --language ja-JP --out n5.sql`, đọc lại, thêm `--commit` rồi chạy `npx supabase db query --linked --file n5.sql`. Lớp Nguyên dùng phiên bản mới nhất làm nguồn bài hằng ngày nên tự nhận bản mới.

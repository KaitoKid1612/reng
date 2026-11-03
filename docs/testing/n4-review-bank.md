# Bổ sung ngân hàng ôn N4 — 02/11/2026

## Kết quả kiểm tra

Lớp tự học Ôn JLPT N4 – Việt đang ghim ngân hàng 40 câu và giao 40 câu/ngày. Ba bài ngày 31/10, 01/11 và 02/11 đều có 40 câu, nên cả bộ lặp lại mỗi ngày. Cron chỉ chọn câu từ ngân hàng, không sinh câu mới bằng AI.

Tài khoản chưa có thẻ SRS hoặc lượt làm bài trên Reng tại thời điểm kiểm tra. Mục `/review` chỉ lấy thẻ từ vựng đã được học/đánh giá và câu sai đến hạn; không tự tạo đề mới hoặc lấy lỗi từ lịch sử Sheet. Không tạo lượt học hay lịch ôn giả.

## Đã áp dụng trên production

- Xuất bản ngân hàng v2, cập nhật phiên bản trong lớp: **200 câu, 40 từ vựng**, giữ 40 câu gốc và mọi đáp án của chúng. Mức giao bài vẫn là 40 câu/ngày, nguồn vẫn được ghim.
- Thêm 160 câu tự biên soạn từ [nguồn bổ sung](../../content/review-banks/n4-minna-1-28-supplement.json): 40 cách đọc kanji, 40 biến đổi từ, 40 trắc nghiệm ngữ pháp và 40 đọc hiểu từ 8 đoạn văn gốc. Phạm vi Minna 1–28, trọng tâm 27–28; chưa phải bộ tổng ôn toàn bộ N4 và chưa có nghe.
- Thêm 40 từ vào ngân hàng để dùng trang luyện thẻ và kanji. Người học đánh giá thẻ lần đầu để bắt đầu lịch SRS.
- Giao riêng **Ôn N4 bổ sung 02/11 — 40 câu mới**, mỗi nhóm mới 10 câu, hạn 23:59:59 giờ Việt Nam, được nộp muộn, tối đa 3 lượt, giải thích sau nộp. Bài hằng ngày 02/11 vẫn dùng v1 với đúng 40 câu cũ; các ngày tới dùng v2.
- Thao tác dùng `publish_lesson`, `upsert_class_lesson`, `publish_assignment` trong một transaction có khóa và kiểm tra revision/nội dung/nguồn lớp. Có audit chống chạy lặp. Không sửa schema hoặc dữ liệu Sheet, không sửa snapshot/điểm của bài đã giao. Bản sao trước thay đổi lưu ngoài repo.

## Kiểm chứng

- `npm run check`: PASS, 159/159 test, format/ESLint/TypeScript đạt. Lần trong sandbox lỗi test pipeline tạo tiến trình con; chạy lại ngoài sandbox đạt toàn bộ.
- `tests/n4-review-bank.test.ts`: schema, ID/nội dung không trùng, đáp án đúng/sai qua bộ chấm thật; 160 câu bổ sung xoay thành bốn bộ 40 câu không trùng nhau. Đây là kiểm tra riêng phần bổ sung, không cam kết ngân hàng gộp không lặp trong bốn ngày vì tỉ lệ từng dạng cũ khác nhau.
- Kiểm tra nội dung gộp bằng `lessonContentSchema`: 200 câu/40 từ hợp lệ; so sánh sâu 40 câu đầu với snapshot cũ khớp toàn bộ.
- Chạy thử transaction production rồi rollback trước khi thực thi. Đọc lại sau thực thi: v2 đang gắn với lớp, nguồn ghim và 40 câu/ngày giữ nguyên; 40 câu gốc khớp JSONB; bài bổ sung có đúng 40 ID mới, ba bài hằng ngày cũ vẫn dùng v1.
- Không đổi route/tương tác/framework nên không chạy lại E2E hoặc build. Không đăng nhập thay tài khoản thật.

Xem [thiết kế cơ bản](../basic-design/teaching-service.md) và [thiết kế chi tiết](../detail-design/teaching-service.md).

## Mở rộng tổng ôn N4 theo lựa chọn người học — 02/11/2026

Sau đợt bổ sung 1–28, người học chọn **Mở rộng toàn bộ N4**. Đã tạo riêng **Tổng ôn N4 — Minna 1–50**, chuyển nguồn ghim của lớp sang bộ mới. Bộ 1–28 vẫn trong lớp, không sửa nội dung hoặc phiên bản. Bài hằng ngày và bài bổ sung 02/11 đã giao giữ nguyên; từ ngày 03/11 cron chọn bộ mới, vẫn 40 câu/ngày.

[Bản nháp tự biên soạn](../../content/review-banks/n4-comprehensive.json) có 200 câu, 80 từ: 40 câu nền tảng lấy từ phần bổ sung cũ, 160 câu mới mở rộng. Mỗi nhóm kanji/biến đổi từ/ngữ pháp/đọc hiểu có 50 câu; bốn quota bằng nhau tạo mỗi ngày 10 câu/nhóm. Phần mở rộng có câu gắn thẻ cho từng bài 29–50; gồm trạng thái tự/tha động từ, chuẩn bị, dự định/ý chí, lời khuyên/phỏng đoán, mệnh lệnh/cấm đoán, điều kiện, mục tiêu/thay đổi, bị động, danh từ hóa, nguyên nhân, câu hỏi gián tiếp, cho–nhận, mục đích, vẻ ngoài/truyền đạt, dễ–khó/quá mức, trường hợp/trái kỳ vọng, thời điểm/kỳ vọng, sai khiến, kính ngữ và khiêm nhường ngữ. Câu điền yêu cầu dạng từ/cách đọc cụ thể để chấm bằng đáp án khai báo.

Đây là ngân hàng ôn đọc–viết theo phạm vi Minna mở rộng, không phải đề JLPT chính thức hoặc cam kết bao phủ mọi mục thi. Chưa có phần nghe; [mô tả năng lực N4 chính thức](https://www.jlpt.jp/e/about/levelsummary.html) còn yêu cầu hiểu hội thoại đời sống nói chậm.

- PASS `npm run check`: 161/161 test, format/ESLint/TypeScript đạt sau nội dung cuối cùng.
- `tests/n4-comprehensive.test.ts` kiểm tra schema xuất bản và giới hạn editor, tag phạm vi 29–50, câu hỏi không trùng, đáp án qua bộ chấm thật, năm ngày liên tiếp mỗi ngày 40 câu/10 câu mỗi nhóm không trùng trước khi dùng hết 200 câu.
- Chạy thử transaction tạo bài/thêm lớp/ghim nguồn rồi rollback; sau đó thực thi với khóa lớp, kiểm tra revision/nguồn cũ/chủ lớp và audit chống chạy lặp. Có bản sao thiết lập lớp trước thay đổi ngoài repo. Không sửa schema, RLS hoặc tạo thẻ SRS/lượt học giả.
- Đọc lại production: bộ mới v1 có 200 câu/80 từ, visibility `class`, nằm trong lớp và là nguồn ghim; bộ cũ v2 vẫn có 200 câu/40 từ. Chủ lớp đọc được bộ mới qua `read_lesson_version`, người không đăng nhập không đọc được. Bốn bài đã giao trước đó vẫn dùng bộ cũ và mỗi bài 40 câu.
- Không thêm bài giao hôm nay ở đợt mở rộng này. Không đổi route/tương tác/framework nên không chạy lại E2E/build; không đăng nhập thay người học.

## Đa dạng dạng bài — 03/11/2026

Người học thấy bài N4 "lộn xộn" và ít kiểu bài. Phân tích bộ 200 câu và cách chọn câu cho thấy:

- Chỉ có 4 kiểu, câu chữ lặp lại y hệt: gõ cách đọc kanji, gõ dạng biến đổi, trắc nghiệm ngữ pháp, trắc nghiệm đọc hiểu.
- Đoạn văn đọc hiểu nằm trong từng đề. Đề không giữ xuống dòng nên đoạn văn và câu hỏi dính thành một khối. Các câu cùng một đoạn bị xáo xen kẽ trong bài, nên phải đọc cùng một đoạn nhiều lần ở các chỗ khác nhau.

Không đọc được dữ liệu production để xem bài 03/11: quyền đọc production bị chặn trong phiên này.

[Bộ mới](../../content/review-banks/n4-comprehensive.json) có **304 câu, 10 dạng**, vẫn 80 từ vựng:

| Dạng | Số câu | Mỗi ngày (40 câu) |
| --- | --- | --- |
| Đọc kanji, gõ hiragana (cũ) | 50 | 7 |
| Chọn cách đọc kanji trong câu (mới) | 18 | 2 |
| Chọn chữ Hán đúng, có cặp đồng âm như 機会/機械, 人口/人工 (mới) | 18 | 2 |
| Chọn từ hợp ngữ cảnh (mới) | 18 | 2 |
| Chọn câu cùng nghĩa (mới) | 14 | 2 |
| Biến đổi từ, gõ hiragana (cũ) | 50 | 7 |
| Điền trợ từ, gõ romaji (mới) | 16 | 2 |
| Ngữ pháp trắc nghiệm (cũ) | 50 | 7 |
| Sắp xếp câu, bấm mảnh theo thứ tự (mới) | 20 | 3 |
| Đọc hiểu, 10 đoạn × 5 câu (cũ, tách đoạn văn) | 50 | 6 |

Câu mới tự biên soạn, dùng lại 80 từ của bộ để ôn cùng một từ qua nhiều dạng. Câu sắp xếp theo các mẫu ngữ pháp bài 16–50, mỗi câu chỉ có một thứ tự đúng với nghĩa đã cho. Câu trợ từ nhận các đáp án đúng khác (に/へ, を/から…).

Bài hằng ngày đi theo thứ tự: Kanji → Chữ Hán → Từ vựng → Câu cùng nghĩa → Biến đổi từ → Trợ từ → Ngữ pháp → Sắp xếp câu → Đọc hiểu. Mỗi câu có nhãn phần. Câu đọc hiểu lấy trọn một đoạn trước, các câu cùng đoạn đi liền nhau, và đoạn văn nằm trong khung riêng phía trên câu hỏi.

Kiểm chứng:

- `tests/n4-comprehensive.test.ts`: schema xuất bản và giới hạn editor; mọi câu giao được. Chỉ đáp án khai báo được chấm đúng: kiểm từng lựa chọn, mọi biến thể đáp án điền, câu sắp xếp đúng và đảo. Có 10 đoạn × 5 câu. Năm ngày liên tiếp: mỗi ngày đúng số câu từng dạng như bảng, đúng thứ tự dạng, không trùng câu, không tách đoạn văn.
- Chạy local đầy đủ: xuất bản bộ mới cho giáo viên thử, bấm "Giao bài hôm nay ngay" trên trang lớp. Server giao 40 câu đủ 9 nhãn phần, 6 câu đọc hiểu có khung đoạn văn, 3 câu sắp xếp. Học viên ở 390px bấm mảnh, xếp lại, nhảy câu bằng danh sách câu.
- `npm run bank:sql` trên database local: tạo bộ cũ v1 trong một lớp. File chạy thử hiện v2 304 câu rồi rollback. File commit đưa lớp sang v2. Chạy lại không tạo v3.

**Trạng thái production:** code đã deploy khi push. Sau deploy, câu đọc hiểu cũ cũng tách đoạn văn khỏi câu hỏi, vì đề giữ xuống dòng. **Bộ 304 câu chưa áp dụng**, vì phiên này không có quyền ghi production. Để áp dụng (chỉ chạy sau khi deploy đã xong):

```bash
# Bộ "Tổng ôn N4 — Minna 1–50" trên production được tạo tay ngày 02/11 nên có mã khác `n4-comprehensive-review-bank`
# trong file JSON; truyền mã thật bằng --lesson. Tra mã bằng tiêu đề:
set -a; . ~/.config/reng/supabase-prod.env; set +a
npx supabase db query --linked "select l.id, v.version_no, jsonb_array_length(v.content->'questions') as questions from public.lessons l join public.lesson_versions v on v.id = l.published_version_id where l.title = 'Tổng ôn N4 — Minna 1–50';"
npm run bank:sql -- --file content/review-banks/n4-comprehensive.json --language ja-JP --lesson <mã bài> --out /tmp/n4-v2.sql          # chạy thử
npm run bank:sql -- --file content/review-banks/n4-comprehensive.json --language ja-JP --lesson <mã bài> --out /tmp/n4-v2-commit.sql --commit
set -a; . ~/.config/reng/supabase-prod.env; set +a
npx supabase db query --linked --file /tmp/n4-v2.sql         # xem phiên bản và lớp, rồi rollback
npx supabase db query --linked --file /tmp/n4-v2-commit.sql  # áp dụng; chạy lại không tạo phiên bản thừa
```

Lớp "Ôn JLPT N4 – Việt" giữ nguồn ghim cũ và số câu mỗi ngày; bài từ ngày hôm sau dùng v2. Bài đã giao (kể cả 03/11) giữ snapshot cũ.

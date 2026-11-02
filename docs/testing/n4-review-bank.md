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

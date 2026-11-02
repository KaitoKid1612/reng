# Kiểm chứng vừa dạy vừa học — 02/11/2026

## Phạm vi

Đối chiếu [BD Luồng 7](../basic-design/teaching-service.md#luồng-7--vừa-dạy-vừa-học-lớp-tự-học-nhật-ký-buổi-dạy-và-cập-nhật-bài-mẫu-02112026), [DD](../detail-design/teaching-service.md#vừa-dạy-vừa-học--đã-triển-khai-02112026). Bối cảnh: giáo viên pilot dạy lớp Minna (học viên ôn N5 60 câu/ngày) và tự ôn JLPT N4. Năm vấn đề được xử lý:

1. Bài luyện hằng ngày đổi nguồn khi thêm bài mới vào lớp: chỉ lấy câu từ bài mở gần nhất. Thêm bài 12 (50 câu) vào lớp đang ôn ngân hàng N5 (200 câu) thì ngân hàng bị bỏ, và vì 50 < 60 nên ngày nào cũng ra đúng 50 câu.
2. CR-20: giáo viên nhập mã lớp mình thì thành học viên, làm lệch báo cáo; chưa có chỗ để giáo viên tự ôn.
3. Trình nhập Sheet chỉ biết ngân hàng N5 và bắt buộc có bài hôm nay chưa làm.
4. Không có nhật ký buổi dạy.
5. Bài tạo từ mẫu không nhận được nội dung mẫu bổ sung sau này (hình, slide).

Dữ liệu kiểm thử là dữ liệu tự soạn hoặc bài mẫu của repo; không dùng tài khoản hay dữ liệu học viên thật.

## Bằng chứng

| Kiểm tra | Bằng chứng |
|---|---|
| Ghim nguồn đứng trước bài mới nhất; tự động/ghim/tạm dùng bài khác; cảnh báo khi số câu ít hơn số câu mỗi ngày | `tests/daily-practice.test.ts` |
| Migration ghim lớp đang chạy vào bài của lần luyện gần nhất (dữ liệu tạo trước migration), đổi/bỏ ghim, bài ngoài lớp, giáo viên khác, lời gọi 3 tham số cũ, khóa ngoại | `tests/teach-and-learn-migration.test.ts` trên PostgreSQL nhúng |
| Lớp tự học tự thêm chủ lớp; chủ lớp nhập mã lớp dạy nhận `own_class`; mã lớp tự học vô hiệu với người khác kể cả khi bật nhận mã; chủ lớp đã lỡ vào không chiếm chỗ; câu sai nhiều không tính chủ lớp lớp dạy nhưng tính ở lớp tự học | `tests/teach-and-learn-migration.test.ts` |
| Nhật ký: khóa ngoại bài/phiên bản trong lớp, slide cần bài, authenticated không đọc được | `tests/teach-and-learn-migration.test.ts`; schema form, ngày tương lai, link slide ở `tests/class-sessions.test.ts` |
| Ngân hàng N4 riêng, chế độ chỉ nhập ngân hàng với ngày đã làm dở và câu thiếu đáp án | `tests/daily-sheet-import.test.ts` |
| Nhận diện bài tạo từ mẫu và đếm slide/câu/hình trước–sau | `tests/starter-refresh.test.ts` |
| Trình duyệt: ghim bài 11 với 60 câu/ngày → cảnh báo lặp; thêm bài 12 vẫn giữ bài 11; về Tự động thì nguồn thành bài 12 | `e2e-supabase/teach-and-learn.spec.ts` |
| Trình duyệt: ghi buổi dạy (bài, slide 12, ghi chú), dòng Buổi gần nhất, form trống lại, 360px không tràn, Mở slide 12 hiện 12 / 38, xóa buổi | như trên |
| Trình duyệt: nhập mã lớp mình dạy bị từ chối; tạo lớp tự học không có mã/ô sức chứa/nhật ký, chủ lớp nằm trong bảng học viên; bài hôm nay đến Lớp của tôi với nhãn "Lớp tự học của bạn"; lớp dạy không hiện ở Lớp của tôi | như trên |
| Trình duyệt: bài 12 có nháp mất hình → trang Cập nhật từ mẫu cho số liệu khác mẫu; thay nháp rồi về editor, phiên bản xuất bản vẫn là 1; số liệu nháp bằng mẫu | như trên |

## Kết quả

- `npm run check`: PASS, 150/150 test (Prettier, ESLint, TypeScript, test logic và database).
- `npm run test:e2e`: PASS, 35/35. Một lượt chạy song song với check/build ở bản sao riêng có `e2e/kana.spec.ts` › báo không có giọng Nhật hỏng vì quá thời gian chờ; chạy riêng file 5/5 và chạy lại cả suite khi máy rảnh 35/35. Phần này không thay đổi trong đợt.
- `npm run build`: PASS, có route động `/teach/lessons/[id]/starter`.
- `npm run test:e2e:supabase` (Supabase local chạy bằng CLI 2.95.3 với bản cấu hình tương thích, như ghi chú môi trường ở [lịch sử học tập](learning-history.md)): `teach-and-learn.spec.ts` 4/4. Toàn bộ suite lần đầu 34/35; ca hỏng là `teaching-authoring.spec.ts` › lọc bài và câu tiếng Trung, kiểm tra trang Giao bài ở 360px. Chạy cùng ca trên bản sao `HEAD` chưa sửa cũng hỏng, nên đây là lỗi có từ trước, lần đầu được chạy (TM-01 đến TM-07 trước đây NOT RUN). Nguyên nhân: ô chọn "Ô nhập" rộng theo nhãn dài nhất, 391px trong khung 294px. Đã sửa bằng `select { max-width: 100% }`; chạy lại `teaching-authoring.spec.ts` và `teach-and-learn.spec.ts`: 8/8, rồi cả suite: 35/35.

## Production

Ba migration `202611020001`–`202611020003` **chưa áp dụng** lên production và phần mã phụ thuộc chưa đẩy lên `main`, vì đẩy `main` là deploy ngay. Nếu mã chạy trước migration, trang lớp và job 6:00 sẽ đọc cột chưa có. Thứ tự khi được đồng ý:

1. Sao lưu `npx supabase db dump --linked` ra ngoài repo.
2. `npx supabase db push` (chỉ ba migration trên). Migration tự ghim lớp đang bật luyện hằng ngày vào bài của lần luyện gần nhất.
3. Đẩy mã lên `main`, chờ Vercel Ready.
4. Mở trang lớp Minna: ô Lấy câu từ phải là ngân hàng N5. Nếu là bài khác (lớp đã thêm bài mới trước đó), chọn lại ngân hàng N5.
5. Giáo viên tạo lớp tự học N4. Nhập ngân hàng N4 cần bản xuất Sheet N4 (`{ today, history, keys }`): `npm run daily:import -- --source <n4.json> --level N4 --bank-only --teacher-id <uuid> --class-id <lớp tự học> --out <file.sql>`, xem lại rồi chạy file SQL.

## Giới hạn

- Chưa kiểm chứng trên production và chưa dùng Sheet N4 thật.
- Chủ lớp đã lỡ vào lớp mình trước 02/11/2026 vẫn thấy lớp đó ở Lớp của tôi; chưa có thao tác rời lớp cho học viên. Báo cáo, CSV, sức chứa và câu sai nhiều không tính người này.
- Bài luyện hằng ngày vẫn lấy câu từ một bài mỗi ngày (bài giao gắn một bài học); trộn ngân hàng với bài mới cần đổi mô hình bài giao.
- Nhật ký buổi dạy hiện 12 buổi gần nhất; chưa ghi tự động slide cuối từ cửa sổ trình chiếu.

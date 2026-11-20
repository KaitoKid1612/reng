# Mã bài dễ đọc và thứ tự danh sách bài — 20/11/2026

Người dùng yêu cầu: giao diện không in mã (UUID) ra, danh sách sắp xếp hợp lý, dữ liệu chuẩn hơn.

## Rà soát

- **Mã hiện trên giao diện:** quét mọi biểu thức JSX hiện id dưới dạng chữ (không tính thuộc tính `href`, `id`, `key`…). Chỉ còn 2 chỗ: ô **Mã bài** ở form tạo bài tiếng Nhật (gợi ý `lesson-NN-xxxxxx`, giáo viên phải giữ hoặc sửa) và cột **Đối tượng** ở nhật ký hoạt động của admin (`resource_id` thô). Mã lớp (ví dụ BZA2-4935) là mã để học viên vào lớp, giữ nguyên.
- **Mã trong đường dẫn:** bài tạo từ mẫu, bản sao và bài theo mẫu lấy mã `lesson-` + 32 ký tự hex từ hai hàm SQL `insert_lesson_copy` và `create_teaching_lesson`. Production 20/11: 26/44 bài của giáo viên có dạng này, kể cả bài 18 vừa tạo từ mẫu.
- **Thứ tự:** danh sách bài ở trang Giảng dạy, ô chọn bài ở trang Giao bài và Nhập CSV dùng `listOwnedLessons`, vốn chỉ xếp theo `order_no`. Production 20/11: bảy bài có số thứ tự 1 (Minna bài 1, hai ngân hàng N5, ngân hàng N4, Mẹo N4 · 1, Bản đồ ngữ pháp N4, một bản sao nháp) đứng xen nhau, rồi bài 2 của từng khóa…
- Các truy vấn khác xếp theo id chỉ để phân trang ổn định (bài nộp, thứ tự phụ của bài giao cùng giờ). Danh sách lớp, bài trong lớp, nhật ký dạy, ngày luyện tập đều đã xếp theo thời gian hoặc thứ tự giáo viên đặt.

## Thay đổi

- `lib/lesson-id.ts` và hàm SQL `public.new_lesson_id` (migration `20261120050000_readable_lesson_ids.sql`): mã mới `<khóa>-<thứ tự>-<6 hex>`, ví dụ `minna-1-18-a8e144`. Hai hàm tạo bài gọi hàm này, chữ ký giữ nguyên nên bản web cũ và mới đều chạy được trước hay sau khi áp migration. Mã cũ không đổi: mã bài là khóa chính, nằm trong phiên bản, bài giao, bài nộp, nhật ký và các link đã gửi cho học viên.
- Form **Soạn bài tiếng Nhật từ đầu** bỏ ô Mã bài; `createLesson` tự đặt mã khóa `n5` và thử lại nếu trùng.
- `lib/lesson-order.ts`: xếp theo khóa (Minna theo số, rồi JLPT N5 trước N4, khóa chính trước khóa phụ cùng cấp, rồi khóa khác), sau đó thứ tự bài, rồi tiêu đề (so sánh tiếng Việt).
- Nhật ký hoạt động của admin hiện tên bài, bài tập, phiên bản, lớp hoặc người; không tìm thấy thì "—".

## Kiểm chứng

- `tests/lesson-id-order.test.ts`: dạng mã, giới hạn 64 ký tự và quy tắc ký tự; thứ tự 10 bài thuộc 7 khóa.
- `tests/readable-lesson-id-migration.test.ts` (PGlite, mọi migration): bài từ mẫu nhận `minna-1-18-xxxxxx`, gửi lại cùng yêu cầu trả đúng mã cũ, yêu cầu mới ra mã khác, khóa lạ được chuẩn hóa (`n4-tips-1-…`), bài theo mẫu tiếng Trung nhận `chinese-3-…`.
- 4 E2E tạo bài từ đầu (`authoring`, `listening`, `match-question`, `question-authoring`) nay đọc mã bài từ đường dẫn sau khi tạo (`createBlankLesson` trong `e2e-supabase/support.ts`). **E2E chưa chạy:** Supabase local trên máy đã mất container và volume.
- `npm run check` đạt.

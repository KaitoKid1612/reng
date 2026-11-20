# Lộ trình khóa học và bảng xếp hạng tuần — 20/11/2026

Thiết kế: [learner-motivation](../basic-design/learner-motivation.md).

## Test tự động

- `tests/course-map-weekly-board.test.ts`: nhãn chặng theo khóa (`minna-17`, `chukyu-1-3`); ngưỡng sao (3 sao cần ≥ 90% và ≥ 10 câu); bài xa nhất trong nhật ký làm các bài trước thành "Đã học", bài đó chỉ xong khi dạy tới slide cuối; bài học viên tự đánh dấu đọc xong vẫn "Đã học" dù lớp chưa tới; sao lấy từ câu mang nhãn bài; tuần chạy thứ 2 → chủ nhật giờ Việt Nam (23:30 chủ nhật vẫn thuộc tuần đó); mỗi bài tính lần làm cao nhất, bài nộp ngoài tuần và người ngoài bảng không tính.
- `npm run check` đạt (lint, typecheck, format, 467 test).

## Kiểm tra trên trình duyệt (Supabase local, dữ liệu thử)

Dữ liệu: giáo viên `teacher@reng.local`; lớp "Minna thử" có bài mẫu Minna 1–5 (bài 5 mở sau 3 ngày), nhật ký buổi dạy bài 3 tới slide 10, hai bài luyện 10 câu (bài 1, bài 2); hai học viên Nguyên (thử), Thảo (thử); lớp tự học của giáo viên. Cả hai lớp bật bảng tuần.

- Nguyên làm bài luyện bài 1 trên giao diện thật (chế độ Cả bài, chọn phương án đầu, gõ chữ vào câu điền, Xác nhận nộp): đúng 2/10.
- **Lộ trình** ở 1280, 1440 và 390 px: bài 1–2 "Đã học" (✓ xanh), bài 3 "Học tiếp" (lớp mới dạy tới slide 10), bài 4 "Đã mở", bài 5 "Sắp mở" (🔒, không link). "Đã học 2/5 bài". Bài 1: 1/3 sao (nhãn đọc màn hình "1/3 sao độ thuộc bài, 10 câu đã làm trong 30 ngày"), các bài khác "Chưa luyện". Không cuộn ngang.
- **Bảng tuần** ở Tiến độ: Nguyên 🥇 2 câu đúng, 1/7 ngày; Thầy Việt (lớp tự học) và Thảo 0. Câu "Bạn đang dẫn đầu tuần này". Lớp của tôi: "Bảng tuần: bạn đang hạng 1/3 với 2 câu đúng. Xem bảng".
- **Ẩn mình:** Thảo tick "Ẩn tôi khỏi bảng tuần" → thông báo; Thảo vẫn thấy dòng của mình ghi "chỉ bạn thấy"; bảng của Nguyên còn 2 dòng.
- **Giáo viên tắt:** bỏ tick "Đưa lớp này vào bảng tuần chung" → "Lớp đã rời bảng tuần."; trang Tiến độ của Nguyên không còn bảng. Bật lại hoạt động như trước.
- Không có lỗi console trên mọi trang đã mở.
- Chỉnh sau khi xem ảnh: bảng tuần giới hạn rộng 40rem để điểm nằm gần tên; sao rỗng đậm hơn; lớp có lộ trình mà không có ngân hàng ôn hay đề thì ẩn mục "Tài liệu ôn tập"; mỗi chặng giữ link **Đọc bài** như danh sách cũ, tên bài là chữ thường.

## E2E (Supabase local dựng lại bằng CLI 2.95.3, 20/11/2026)

- `npm run test:e2e`: 41/41.
- `npm run test:e2e:supabase`: 45 đạt, 1 hỏng, 2 không chạy (các bước sau trong cùng file). Đã sửa spec theo giao diện mới: lớp có lộ trình kiểm tra chặng (`classroom`, `minna-teaching`), nút **Lưu bảng tuần** không trùng nút Lưu khác, đường dẫn bài mới theo mã dễ đọc (8 chỗ).
- Ca hỏng: `minna-teaching.spec.ts` › học viên làm bài luyện bài 11, bước tải lại trang ngay sau khi gõ "ふたり" ra ô trống. Hỏng giống hệt trên mã đã commit (chỉ sửa mẫu đường dẫn trong spec), mã trang làm bài không đổi từ lần E2E 18/11 (khi ca này đạt), và thử tay trên cùng máy (gõ rồi tải lại ngay, hoặc đợi "Đã lưu" rồi tải lại) vẫn giữ đáp án. Ghi nhận là ca phụ thuộc môi trường Supabase dựng lại, chưa sửa.

## Production

Cần áp `20261120090000_weekly_board.sql` (`npx supabase db push --linked`). Code chạy được trước migration: lộ trình không phụ thuộc migration; bảng tuần, công tắc giáo viên và tùy chọn ẩn đọc cột mới kiểu "có thì dùng", lỗi thì bỏ qua.

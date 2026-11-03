# Công cụ giáo viên và chuẩn bị dạy thật — 03/11/2026

Bốn việc trong mục "Đề xuất tiếp theo" của [rà soát 02/11](user-flow-review-2026-11-02.md) và [báo cáo soạn câu](question-authoring-2026-11-03.md), cùng một lỗi tìm ra khi kiểm thử.

## Trạng thái

| Việc | Trạng thái | Điều kiện còn lại |
| --- | --- | --- |
| 1. Giáo viên chấp nhận đáp án tương đương ngay trên trang học viên | Đã làm và kiểm thử local; giữ ở `refs/held/accept-answers`, chưa có trên `main` | Duyệt và áp migration `202611030001` lên production trước, rồi mới đưa code lên `main` |
| 2. Từ chối yêu cầu làm giáo viên; yêu cầu cũ hết kẹt khi tắt duyệt (CR-30) | Đã có trên `main` | — |
| 3. Audio sinh sẵn cho bài tiếng Trung (từ vựng, hội thoại) | Code đã có trên `main`; dry-run trên dữ liệu local | Khóa Azure Speech và R2 trong `.env.local`; giáo viên nghe duyệt rồi xuất bản lại |
| 4. Buổi học thử trên điện thoại thật | [Kịch bản](device-trial-plan-2026-11-03.md) | Người dạy và học viên với iPhone/Android thật; WebKit chưa chạy được trên máy kiểm thử |

## 1. Chấp nhận đáp án tương đương

Ở trang học viên, câu gõ chữ bị chấm sai có nút **Chấp nhận câu trả lời này**. Trong một transaction:
- thêm đáp án vào bản chụp câu hỏi của bài giao;
- cộng điểm cho mọi bài nộp có câu trả lời tương đương, do server chấm lại bằng `lib/grading`;
- tính lại điểm và kết quả đạt;
- đóng thẻ sổ lỗi;
- ghi nhật ký.

Với bài luyện tập, đáp án còn được lưu theo bài học: các bài luyện sau, kể cả bài hằng ngày, tự chấp nhận đáp án đó. Thao tác này thay cho việc sửa điểm bằng migration như đợt N5 ngày 02/11. Chi tiết ở [07](../07-exercises-and-grading.md) trong commit giữ riêng.

Lịch sử chấm vẫn bất biến. Trigger chỉ cho đổi đúng các trường cần đổi, và chỉ trong transaction của RPC.

**Kiểm thử (local):**
- Test PGlite cho migration:
  - trigger vẫn chặn sửa trực tiếp;
  - giáo viên lớp khác bị từ chối;
  - chấm lại hai bài, giữ nguyên câu trả lời gốc;
  - điểm và kết quả đạt cập nhật đúng;
  - thẻ lỗi của người trả lời khác vẫn mở;
  - chấp nhận lần hai không đổi gì;
  - bài luyện sau có đáp án, trừ khi đề đã đổi;
  - câu kiểm tra riêng không lan sang bài luyện.
- Unit test luật chấm lại: tiếng Nhật bỏ khoảng trắng và dấu chấm cuối; tiếng Trung khớp chính xác; ô tiếng Việt; câu bắt buộc kanji.
- E2E: hai học viên viết `ありがとう` và `ありがとう。`. Giáo viên bấm chấp nhận trên trang một người, cả hai được 100%, và bài luyện mới đã có đáp án này.
- Toàn bộ E2E Supabase: 39/39 khi có tính năng này.

**Đưa lên production (cần duyệt):**
1. Sao lưu database production.
2. Áp `supabase/migrations/202611030001_accept_answer_variants.sql` (có trong commit giữ riêng).
3. Đọc lại:
   - có `accept_answer_variant`, `with_answer_variants`, bảng `answer_variants`;
   - sửa trực tiếp `answers` vẫn báo `history_immutable`.
4. `git cherry-pick refs/held/accept-answers` lên `main`, chạy `npm run check`, rồi đẩy lên (deploy).
5. Xóa `refs/held/accept-answers`.

Nếu code lên trước migration thì chỉ nút chấp nhận báo lỗi, các trang khác không đổi. Vẫn giữ đúng thứ tự trên.

## 2. Yêu cầu làm giáo viên (CR-30)

- Quản trị viên có nút **Từ chối** cho yêu cầu đang chờ. Yêu cầu bị từ chối hiện "Đã từ chối" kèm nút Duyệt. Người gửi thấy "Yêu cầu giảng dạy chưa được chấp nhận" thay cho thông báo tạm dừng.
- Tắt bước duyệt thì người đang chờ thấy lại nút Kích hoạt giảng dạy, không còn kẹt ở "đang chờ".
- Không cần migration: từ chối dùng trạng thái tạm dừng có sẵn, phân biệt nhờ chưa từng được kích hoạt. E2E quản trị có thêm hai luồng này.

## 3. Audio tiếng Trung

`npm run audio:generate -- --r2 --lessons --db --sync-db` giờ sinh audio cho từ vựng và hội thoại của bài tiếng Trung. Giọng mặc định: giản thể `zh-CN-XiaoxiaoNeural`, phồn thể `zh-TW-HsiaoChenNeural`. Hash audio tiếng Nhật giữ nguyên, và metadata ghi đúng giọng của từng file.

Dry-run trên dữ liệu local đã đọc được nháp tiếng Trung. Trước đây các nháp này bị bỏ qua vì "không khớp hợp đồng". Chi tiết ở [06](../06-audio.md).

## Lỗi tìm ra khi kiểm thử: danh sách ID quá dài

Trang Giáo viên của quản trị lỗi khi stack kiểm thử có 231 giáo viên. Bộ lọc `in` mang mọi ID trong URL, và khoảng 200 UUID đã vượt giới hạn URL của gateway.

Lớp có bài hằng ngày cũng thêm một bài giao mỗi ngày. Vì vậy, sau vài tháng, trang lớp, trang chủ, trang học viên, báo cáo lớp và sổ lỗi của lớp chạy lâu cũng sẽ gặp đúng lỗi này. Nay các truy vấn đó đọc theo lô 100 ID (`selectRowsIn`).

## Kết quả kiểm thử

- `npm run check` trên `main`: PASS 187/187. Commit giữ riêng thêm 4 test.
- `npm run test:e2e`: PASS 36/36.
- `npm run test:e2e:supabase` (local, có tính năng 1): PASS 39/39.
- `npm run build`: PASS.

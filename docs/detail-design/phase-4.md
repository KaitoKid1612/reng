# Detail Design giai đoạn 4

Theo [BD](../basic-design/phase-4.md), dữ liệu 03, thông báo 08. Dependency thêm: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (kéo thả có cảm biến bàn phím và chạm).

## Soạn bài

| Module | Trách nhiệm |
|---|---|
| lib/lesson-draft.ts | Schema nháp nới lỏng, sinh ID, tham chiếu, lỗi xuất bản bằng tiếng Việt, cảnh báo audio |
| lib/vocab-csv.ts | Parser CSV/TSV RFC 4180, nhận diện dấu phân cách và tiêu đề, kiểm tra từng dòng |
| lib/server/lessons.ts | Đọc bài của giảng viên, tạo bài, lưu nháp compare-and-swap, xuất bản qua RPC |
| app/actions/lessons.ts | Server Action tạo/lưu/xuất bản/nhập CSV; mỗi action kiểm tra lại giảng viên |
| components/editor/* | Reducer editor, form từng phần, danh sách slide kéo thả, xem trước |

- Bản nháp gồm metadata (cột lessons: title, title_ja, summary, order_no, course_id) và content trong draft_content. Schema nháp giữ cấu trúc union của 03 nhưng cho phép chuỗi rỗng, refs chưa đủ và mảng rỗng; giới hạn 300 từ, 100 mẫu ngữ pháp, 200 slide, 200 câu, JSON ≤ 512 KB. Câu luyện khác choice/fill được giữ nguyên theo schema đầy đủ và chỉ hiển thị đọc.
- ID mới: tiền tố theo loại (v, g, s, q) + số tăng dần, duy nhất trong bài, không tái sử dụng khi xóa trong cùng phiên soạn; ID cũ giữ nguyên qua phiên bản.
- Lưu nháp: `UPDATE lessons ... SET draft_revision = draft_revision + 1 WHERE id, owner_id, draft_revision = expected` (một câu lệnh, compare-and-swap). Không có dòng nào: bài không thuộc giảng viên → 404, ngược lại conflict kèm revision hiện tại. "Ghi đè" gửi lại với revision mới nhất sau khi giảng viên xác nhận.
- Xuất bản: kiểm tra đầy đủ (metadata; từ vựng jp/romaji/vi; ngữ pháp có ví dụ; slide theo loại, refs tồn tại, vocab 1–8 mục không trùng, quiz trỏ câu choice/fill; câu có lựa chọn/đáp án hợp lệ; ảnh local/HTTPS) rồi `lessonContentSchema` làm chốt cuối. Hash audio có mặt phải tồn tại trong audio_assets; thiếu audio là cảnh báo. Gọi `publish_lesson` với revision đang mở; RPC cập nhật nháp, tạo version và đổi con trỏ trong một transaction, `is_sample = false` vì giảng viên sở hữu đã duyệt khi xuất bản.
- Xóa mục đang được slide tham chiếu bị chặn ở UI và lỗi xuất bản vẫn kiểm tra lại.
- Xem trước dùng SlideContent ở chế độ tĩnh (không gọi API đáp án) trong khung 1280×720 co theo chiều rộng cột; slide ảnh thiếu/sai đường dẫn hiện ô báo thay vì gọi next/image. Ghi chú giảng viên chỉ hiện trong form, không vào khung xem trước.
- Danh sách slide: dnd-kit sortable (chuột, chạm, bàn phím Space/mũi tên) kèm nút Lên/Xuống.

## Nhập CSV

- Nhận file ≤ 200 KB hoặc văn bản dán. File phải giải mã UTF-8 nghiêm ngặt; bỏ BOM. Dấu phân cách: tab nếu dòng tiêu đề có tab, sau đó `;` nếu nhiều hơn `,`, mặc định `,`.
- Cột theo tiêu đề không phân biệt hoa thường/dấu: jp|kana|hiragana|tieng nhat → jp; kanji|han tu → kanji; romaji → romaji; vi|nghia|tieng viet → vi; note|ghi chu → note. Thiếu cột jp/romaji/vi thì từ chối cả file.
- Mỗi dòng: jp chỉ gồm kana/ー/khoảng trắng, romaji chữ Latin/khoảng trắng/'/-, vi bắt buộc; độ dài theo schema; tối đa 300 dòng. Dòng trùng (jp + vi) với bản nháp hoặc dòng trước bị bỏ qua có báo.
- Thêm vào cuối danh sách từ vựng của nháp bằng compare-and-swap như lưu nháp; không tạo slide tự động.

## Thông báo

Migration 202610280005 tạo `notification_preferences` và `email_log` theo 03, thêm `delivery_paused_at`, `delivery_pause_reason` (bounce/complaint) và trạng thái `cancelled` cho job đã hủy. RLS: người dùng đọc tùy chọn của mình; ghi qua server. email_log chỉ server.

| Thành phần | Hợp đồng |
|---|---|
| lib/notifications/schedule.ts | Ngày Việt Nam của lượt chạy, khóa idempotency `type:user:date`, backoff |
| lib/notifications/templates.ts | Template chuỗi có escape HTML; tiêu đề có tên và con số cụ thể; chân thư có lý do nhận, link đổi tần suất, link hủy |
| lib/notifications/unsubscribe.ts | Token `base64url(user).base64url(HMAC-SHA256)` với EMAIL_LINK_SECRET, so sánh thời gian hằng |
| lib/server/email-provider.ts | `resend` (HTTP, Idempotency-Key), `mailpit` (local `/api/v1/send`); không có cấu hình thì không gửi |
| lib/server/notifications.ts | Chọn người cần nhắc, tạo job, nhận job, gửi, ghi kết quả |
| app/api/cron/[job] | `Authorization: Bearer CRON_SECRET`; student-reminders, weekly-summary, teacher-digest |
| app/api/webhooks/email | Xác thực chữ ký Svix của Resend; opened → opened_at; bounced/complained → tạm dừng và hủy job |
| app/api/unsubscribe/[token] | POST một chạm (RFC 8058) |

Quy trình mỗi lượt cron:

1. Tính for_date theo Asia/Ho_Chi_Minh. Với người có tùy chọn bật, chưa tạm dừng và có việc, tạo job pending `ON CONFLICT DO NOTHING` theo PK (user, type, date).
2. RPC `claim_email_jobs` lấy tối đa N job pending, failed còn lượt và hết backoff, hoặc sending hết lease bằng `FOR UPDATE SKIP LOCKED`; chuyển sending, tăng attempts, đặt lease 5 phút.
3. Với mỗi job: kiểm tra lại tùy chọn và việc; không còn cần thì cancelled. Gửi với idempotency key cố định (Resend chống trùng 24 giờ).
4. Thành công: sent, provider_message_id, sent_at (chỉ khi attempts khớp lượt đã nhận). Lỗi 4xx xác định chưa gửi: failed, last_error ngắn, retry tối đa 3 lần với backoff 15/60 phút. Timeout/5xx: để sending tới hết lease; lượt sau gửi lại cùng key. Không ghi nội dung thư hoặc token vào log/last_error.

Nội dung: nhắc tối gồm chuỗi ngày, số thẻ đến hạn, bài sắp hạn (tối đa 3), một từ trong bài lớp đang học và một nút chính. Tổng kết tuần: số lượt ôn, bài đã nộp, điểm trung bình so với tuần trước. Tóm tắt giảng viên: theo lớp, số bài nộp 24 giờ qua, câu sai ≥ 50%, học viên bỏ bài. Không gửi khi không có gì để nói.

## Kiểm chứng

Unit test: schema nháp/lỗi xuất bản/tham chiếu, parser CSV (quote, xuống dòng trong ô, BOM, tab/;), template escape, token hủy, ngày/khóa/backoff. Database (PGlite): job không trùng, claim không nhận job đang lease, hủy. E2E Supabase: tạo bài → xuất bản → học viên thấy; CSV lỗi từng dòng; xung đột hai tab; bật nhắc → cron hai lần → một thư trong Mailpit; hủy một chạm → cron không gửi.

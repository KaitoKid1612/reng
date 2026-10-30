# Detail Design giai đoạn 4

> Phạm vi nền Nhật: tài liệu giai đoạn này giữ thiết kế/bằng chứng triển khai trước dịch vụ Việt–Trung; không chứng minh tính năng mới đã có. Thiết kế hiện hành xem [BD dịch vụ](../basic-design/teaching-service.md), [DD dịch vụ](../detail-design/teaching-service.md) và [checklist dịch vụ](../testing/teaching-service.md). Kết quả PASS/Chưa chạy lịch sử được giữ nguyên.

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
- ID mới: tiền tố theo loại (v, g, s, q) + hậu tố ngẫu nhiên 6 ký tự (`createItemId`), duy nhất trong bài, không tái sử dụng sau khi xóa; ID cũ giữ nguyên qua phiên bản.
- Hình: từ vựng có `image` tùy chọn, chọn trong ô Hình (danh mục `lib/vocab-icons.ts`, giữ được đường dẫn khác đã có); slide tiêu đề có ô Hình mở đầu. Xuất bản kiểm tra đường dẫn như slide ảnh (`/…` không `//`, hoặc `https://`) và bỏ giá trị trống; trình soạn không hiển thị đường dẫn đang gõ dở.
- Mã bài gợi ý khi tạo bài là `lesson-NN-xxxxxx` (NN theo số bài của giáo viên, hậu tố ngẫu nhiên) vì mã bài dùng chung cho mọi giáo viên; giáo viên vẫn sửa được.
- Lưu nháp: `UPDATE lessons ... SET draft_revision = draft_revision + 1 WHERE id, owner_id, draft_revision = expected` (một câu lệnh, compare-and-swap). Không có dòng nào: bài không thuộc giảng viên → 404, ngược lại conflict kèm revision hiện tại. "Ghi đè" gửi lại với revision mới nhất sau khi giảng viên xác nhận.
- Xuất bản: kiểm tra đầy đủ (metadata; từ vựng jp/romaji/vi; ngữ pháp có ví dụ; slide theo loại, refs tồn tại, vocab 1–8 mục không trùng, quiz trỏ câu choice/fill; câu có lựa chọn/đáp án hợp lệ; ảnh local/HTTPS) rồi `lessonContentSchema` làm chốt cuối. Hash audio có mặt phải tồn tại trong audio_assets; thiếu audio là cảnh báo. Gọi `publish_lesson` với revision đang mở; RPC cập nhật nháp, tạo version và đổi con trỏ trong một transaction, `is_sample = false` vì giảng viên sở hữu đã duyệt khi xuất bản.
- Xóa mục đang được slide tham chiếu bị chặn ở UI và lỗi xuất bản vẫn kiểm tra lại.
- Giữ thay đổi chưa lưu (30/10/2026): khi trình soạn có thay đổi, localStorage `reng:draft:lesson:{lessonId}` giữ bản nháp kèm revision gốc (debounce 800 ms); lưu, xuất bản hoặc tải bản server thành công thì xóa; đăng xuất xóa cùng các bản `reng:draft:*`. Trang soạn tải trình soạn chỉ phía client (`components/editor/editor-loaders.tsx`, `ssr: false`) để khôi phục bản trên máy ngay trong state ban đầu khi revision gốc bằng revision server (báo "Đã khôi phục…", vẫn tính là chưa lưu); revision khác thì bỏ bản trên máy vì server mới hơn. Lỗi khi gửi request (mất mạng, deploy mới làm action cũ không còn, lỗi máy chủ) được bắt trong trình soạn, form nhập CSV và form giao bài: giữ nguyên nội dung trên trang và báo thử lại hoặc tải lại để khôi phục; lỗi điều hướng của Next (ví dụ chuyển tới đăng nhập) được ném lại bằng `unstable_rethrow`. `app/error.tsx` là trang lỗi chung có nút Thử lại thay cho màn "Application error".
- Xem trước dùng SlideContent ở chế độ tĩnh (không gọi API đáp án) trong khung 1280×720 co theo chiều rộng cột; slide ảnh thiếu/sai đường dẫn hiện ô báo thay vì gọi next/image. Ghi chú giảng viên chỉ hiện trong form, không vào khung xem trước.
- Danh sách slide: dnd-kit sortable (chuột, chạm, bàn phím Space/mũi tên) kèm nút Lên/Xuống.

## Nhập CSV

- Nhận file ≤ 200 KB hoặc văn bản dán. File phải giải mã UTF-8 nghiêm ngặt; bỏ BOM. Dấu phân cách: tab nếu dòng tiêu đề có tab, sau đó `;` nếu nhiều hơn `,`, mặc định `,`.
- Cột theo tiêu đề không phân biệt hoa thường/dấu: jp|kana|hiragana|tieng nhat → jp; kanji|han tu → kanji; romaji → romaji; vi|nghia|tieng viet → vi; note|ghi chu → note. Thiếu cột jp/romaji/vi thì từ chối cả file.
- Mỗi dòng: jp chỉ gồm kana/ー/khoảng trắng, romaji chữ Latin/khoảng trắng/'/-, vi bắt buộc; độ dài theo schema; tối đa 300 dòng. Dòng trùng (jp + vi) với bản nháp hoặc dòng trước bị bỏ qua có báo.
- Thêm vào cuối danh sách từ vựng của nháp bằng compare-and-swap như lưu nháp; không tạo slide tự động.

## Thông báo

Migration 202610280005 tạo `notification_preferences` và `email_log` theo 03, thêm `delivery_paused_at`, `delivery_pause_reason` (bounce/complaint), `next_attempt_at` cho backoff và trạng thái `cancelled` cho job đã hủy. RLS: người dùng đọc tùy chọn của mình; ghi qua server. email_log chỉ server. Hàm `email_recipients` (security definer, chỉ service_role) đọc email từ auth.users để gửi.

| Thành phần | Hợp đồng |
|---|---|
| lib/notifications/schedule.ts | Ngày Việt Nam của lượt chạy, khóa idempotency `type:user:date`, backoff |
| lib/notifications/templates.ts | Template chuỗi, CSS inline, escape HTML (không dùng react-email để tránh render React ở route handler); tiêu đề có tên và con số cụ thể; chân thư có lý do nhận, link đổi tần suất, link hủy |
| lib/notifications/unsubscribe.ts | Token `base64url(user).base64url(HMAC-SHA256)` với EMAIL_LINK_SECRET, so sánh thời gian hằng |
| lib/server/email-provider.ts | `resend` (HTTP, Idempotency-Key, timeout 10 giây), `mailpit` (chỉ URL local, `/api/v1/send`); thiếu EMAIL_FROM/khóa thì không có provider |
| lib/server/notifications.ts | Chọn người cần nhắc, tạo job, nhận job, gửi, ghi kết quả |
| app/api/cron/[job] | `Authorization: Bearer CRON_SECRET`; student-reminders, weekly-summary, teacher-digest |
| app/api/webhooks/email | Xác thực chữ ký Svix của Resend; opened → opened_at; bounced/complained → tạm dừng và hủy job |
| app/api/unsubscribe/[token] | POST một chạm (RFC 8058, trả 200) hoặc form xác nhận (303 về trang); token là quyền, không kiểm tra Origin |
| app/unsubscribe/[token], app/settings/notifications | Trang xác nhận hủy (GET không đổi gì); trang tùy chọn có Server Action, gọi `refresh()` sau khi lưu để form (React tự reset sau action) hiện giá trị đã lưu; báo rõ khi hệ thống chưa cấu hình email (`getEmailProvider()` trả null) |
| vercel.json | Lịch cron UTC theo bảng của 08 |

Quy trình mỗi lượt cron:

1. Tính for_date theo Asia/Ho_Chi_Minh. Với người có tùy chọn bật, chưa tạm dừng và có việc, tạo job pending `ON CONFLICT DO NOTHING` theo PK (user, type, date).
2. RPC `claim_email_jobs` lấy tối đa N job pending, failed còn lượt và hết backoff, hoặc sending hết lease bằng `FOR UPDATE SKIP LOCKED`; chuyển sending, tăng attempts, đặt lease 5 phút.
3. Với mỗi job: kiểm tra lại tùy chọn và việc; không còn cần thì cancelled. Gửi với idempotency key cố định (Resend chống trùng 24 giờ).
4. Mọi cập nhật kết quả điều kiện theo `status = sending` và `attempts` của lượt đã nhận, nên worker chậm không ghi đè kết quả của worker nhận lại job. Thành công: sent, provider_message_id, sent_at. 429/5xx/timeout/mạng: failed với backoff 15 rồi 60 phút, tối đa 3 lần, gửi lại cùng idempotency key (Resend chống trùng 24 giờ; Mailpit local không chống trùng). 4xx khác: failed và đặt attempts tối đa để chờ xử lý tay. Worker dừng giữa chừng: hết lease 5 phút thì lượt sau nhận lại; hết lượt thì failed `lease_expired`. Không ghi nội dung thư hoặc token vào log/last_error.

Nội dung: nhắc tối gồm chuỗi ngày, số thẻ đến hạn, bài sắp hạn (tối đa 3), một từ trong bài lớp đang học (đổi theo ngày) và một nút chính. Tổng kết tuần: số lượt ôn, bài đã nộp, điểm trung bình so với tuần trước; điểm bài test chỉ tính khi đã tới thời điểm phản hồi. Tóm tắt giảng viên: theo lớp, số bài nộp 24 giờ qua, học viên bỏ bài/chưa đạt/yếu nghe, câu sai ≥ 50%. Không gửi khi không có gì để nói. Cron trả 503 khi thiếu CRON_SECRET, Supabase, nhà cung cấp email hoặc EMAIL_LINK_SECRET; link trong thư dùng SITE_URL, thiếu thì dùng origin của request cron.

## Kiểm chứng

Unit test: schema nháp/lỗi xuất bản/tham chiếu, parser CSV (quote, xuống dòng trong ô, BOM, tab/;), template escape, token hủy, ngày/khóa/backoff. Database (PGlite): job không trùng, claim không nhận job đang lease, hủy. E2E Supabase: tạo bài → xuất bản → học viên thấy; CSV lỗi từng dòng; xung đột hai tab; bật nhắc → cron hai lần → một thư trong Mailpit; hủy một chạm → cron không gửi.

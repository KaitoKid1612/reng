# Rà soát giao diện, luồng và database — 06/11/2026

Người dùng yêu cầu: kiểm tra giao diện còn lỗi không, kiểm tra luồng, database và quan hệ dữ liệu; sau đó đồng ý làm tiếp các ý tưởng bổ sung ([roadmap](../09-roadmap.md#ý-tưởng-bổ-sung-cho-pilot--06112026)). Commit ở máy, chưa push.

## Cách kiểm tra

| Phần | Cách làm |
|---|---|
| Mốc ban đầu | `npm run check` trên `main` sạch (commit `236268a`): 284/284 test |
| Database | Dựng toàn bộ 27 migration trong PGlite rồi đọc catalog: bảng, khóa ngoại và hành vi xóa, index, ràng buộc, policy RLS, quyền bảng/cột, quyền gọi hàm, `search_path`, trigger. Đối chiếu quyền trên Postgres của Supabase local (có default privileges thật, PGlite không có) và so cột/hàm giữa DB local với migration |
| Code và schema | Script đọc AST TypeScript: mọi `.from()`, `.select()`, bộ lọc, `insert/update/upsert`, `onConflict` và `callRpc`/`.rpc` (tên hàm, tên tham số, tham số bắt buộc) so với schema. Đã thử script trên một file cố tình sai: bắt đủ 8/8 lỗi cài sẵn |
| Dữ liệu | 24 truy vấn bất biến chỉ đọc trên Supabase local (250 bài nộp, 826 câu trả lời): điểm bằng tổng điểm câu, điểm tối đa bằng snapshot, `passed`, số lượt, đồng bộ vai giáo viên, sức chứa, con trỏ phiên bản xuất bản, bài hằng ngày cùng lớp… |
| Luồng | `npm run test:e2e:supabase` (38 kịch bản) và `npm run test:e2e` (34 kịch bản) trên Supabase local |
| Giao diện | Script crawl theo vai (khách, học viên, giáo viên lớp Nhật, giáo viên lớp Trung, quản trị) ở 390px và 1280px: 326 trang, ghi lỗi HTTP, lỗi JS, console error/warning (gồm hydration), request hỏng, tràn ngang, trang lỗi và 404; thêm trang sửa hiển thị và chi tiết học viên. Chụp và xem tay 390px: trang chủ học viên, trang bài tập, trang lớp, trang sửa hiển thị (cả lúc mở khung sửa) |
| Đọc code | Ba lượt đọc song song (học viên, giáo viên, tài khoản/quản trị/cron) dừng giữa chừng vì tổ chức hết hạn mức chi tiêu tháng. Tự rà có trọng tâm: mọi server action và route handler có kiểm tra người gọi (script AST), route câu hỏi công khai không lộ đáp án bài kiểm tra, `check_open_attempt`, `submit_attempt`, `is_display_fix`, `proxy.ts`, hydration của đồng hồ đếm ngược, làm mới dữ liệu sau action |
| Production | `vercel ls`: mọi deployment gần đây Ready. Gói Hobby chỉ giữ log 30 phút và 30 phút đó không có request nên không có log lỗi để xem. Không đọc database production |

## Kết quả

- **Database:** 28 bảng đều bật RLS; `anon` không có quyền nào; `authenticated` chỉ đọc theo policy. 55 hàm nghiệp vụ nhận ID người gọi chỉ `service_role` gọi được, mọi hàm có `search_path = ''`; chỉ `teaches_class` và `teaches_assignment` (dùng trong policy) cho `authenticated`. Kết quả giống nhau trên PGlite và Supabase local. DB local khớp migration 100% (233 cột, 57 hàm). 49 khóa ngoại; khóa ngoại kép giữ phiên bản thuộc đúng bài, bài giao thuộc bài trong lớp; khóa idempotency (một bài hằng ngày mỗi lớp mỗi ngày, một lượt đang mở mỗi bài, `request_id` khi ôn) và trigger bất biến lịch sử đều đúng thiết kế.
- **Code và schema:** 186 truy vấn bảng và 49 lời gọi RPC khớp schema (sau đợt: 187 và 50).
- **Dữ liệu:** mọi bất biến đạt trên dữ liệu do app tạo. Ba chỗ lệch đều giải thích được: một phiên bản 0 slide là bài tái hiện sự cố 05/11 ở local; 37 câu bài giao không có trong phiên bản bài là câu kiểm tra soạn riêng (đúng thiết kế); 88 câu sai thiếu thẻ ôn thuộc 13 bài nộp seed chèn thẳng vào DB (giờ tròn, `submitted_at` trước `started_at`).
- **Luồng:** lần chạy đầu 5 kịch bản lỗi, 16 không chạy; cả 5 là kịch bản chưa cập nhật theo giao diện mới vì E2E tạm hoãn từ 03/11 (URL sau khi giao bài có `?assigned=`, thông báo "Đã giao", số thập phân dấu phẩy, thông báo thiếu audio gộp, tên trợ năng của lựa chọn sau khi chấm, học viên mở trang giáo viên được đưa tới `/teach/start`). Sau khi sửa kịch bản: **38/38** và **34/34** đạt. Không phát hiện lỗi app trong các luồng này.
- **Giao diện:** crawl 326 trang + 10 trang bổ sung: 0 lỗi HTTP, 0 lỗi JS, 0 console error/warning, 0 request hỏng, 0 tràn ngang, 0 trang lỗi. Xem tay phát hiện hai lỗi chữ (mục 4 và 5 dưới đây). Log dev có cảnh báo React "Encountered a script tag" khi điều hướng phía client tới trang có JSON-LD: chỉ ở chế độ dev, JSON-LD vẫn có trong HTML server trả về, không ảnh hưởng người dùng.

## Phát hiện

| # | Mức | Phát hiện | Trạng thái |
|---|---|---|---|
| 1 | Trung bình (tiềm ẩn) | `authenticated` có quyền INSERT/UPDATE cột trên `lessons` (gồm `visibility`, `archived_at`, `draft_content`) và policy cho chủ bài, nên giáo viên gọi thẳng Supabase REST bằng token của mình sẽ vượt qua kiểm tra trong RPC: công khai bài sao chép từ giáo viên khác (`reshare_not_allowed`), lưu trữ bài đang dùng trong lớp, hạn mức 2000 bài, kiểm tra nội dung. Đã chứng minh trên PGlite: RPC từ chối, UPDATE trực tiếp sửa 1 dòng, truy vấn danh mục công khai trả về bản sao. App không dùng các quyền này (chỉ API ghi chú dùng phiên người dùng, và chỉ đọc). Hiện publishable key không có trong HTML/JS gửi cho trình duyệt (đã kiểm 31 file JS), nhưng Supabase coi key này là công khai nên DB không nên dựa vào việc giữ bí mật nó | Chưa sửa. Đề xuất migration thu hồi INSERT/UPDATE trên `lessons` của `authenticated` và thêm ràng buộc bản sao không được `public`; cần sửa `tests/migration.test.ts` đang kiểm tra quyền chèn trực tiếp |
| 2 | Trung bình (vận hành) | Không xóa được dữ liệu một học viên đã nộp bài: trigger chặn mọi DELETE trên `submissions`, `answers`, `review_events`, còn khóa ngoại tới `profiles` là NO ACTION nên xóa tài khoản Auth bị lỗi. Bản nháp chính sách quyền riêng tư hứa xử lý yêu cầu xóa | Chưa sửa, cần quyết định xóa hẳn hay ẩn danh hóa |
| 3 | Thấp | `profiles.full_name` không có giới hạn độ dài trong DB; app kiểm 1–80 ký tự, trigger đăng ký cắt 200, nhưng UPDATE trực tiếp qua REST thì không giới hạn | Chưa sửa, đề xuất ràng buộc độ dài |
| 4 | Thấp (giao diện) | Danh sách "Cần sửa trước khi xuất bản" ghi "Câu luyện: Câu luyện 1–2: …" | **Đã sửa**: bỏ nhãn mục khi thông báo đã tự nêu |
| 5 | Thấp (giao diện) | Trang sửa hiển thị và Hướng dẫn ghi "bên trái… bên phải…" nhưng ở 390px hai khung xếp trên dưới | **Đã sửa**: "khung Trước… khung Sau…" |
| 6 | Thấp (hiệu năng) | 15 khóa ngoại không có index hỗ trợ (ví dụ `review_events`→`srs_cards`, `lesson_progress.lesson_id`, `lesson_shares.lesson_id`); các bảng còn nhỏ | Chưa cần làm |
| 7 | Quy trình | E2E tạm hoãn ba ngày làm 5 kịch bản lệch giao diện mà không ai biết; các tính năng mới nhất (sửa hiển thị, furigana trong bài tập, tự nộp khi hết hạn, lưu trữ/gỡ bài) chưa có kịch bản E2E | Kịch bản đã cập nhật; đề xuất chạy E2E trước mỗi lần push hoặc thêm CI |
| 8 | Vận hành | Chưa xác minh production đã áp `20261104110635`, `20261105012503`, `20261105044634`; code dùng hai migration sau đã deploy (có xử lý khi thiếu). Bài nguồn 0 slide của sự cố 05/11 còn cần thêm slide và xuất bản lại | Cần chạy `npx supabase db push --linked --dry-run` |

## Đã làm trong đợt

- Cập nhật 7 kịch bản E2E theo giao diện mới (commit `8117b48`).
- Sửa hai lỗi chữ ở mục 4 và 5 (commit `1fda40a`).
- Tin nhắn giao bài cho nhóm lớp ([DD](../detail-design/phase-3.md#tin-nhắn-giao-bài-cho-nhóm-lớp--06112026)).
- Điểm danh trong nhật ký buổi dạy, migration `20261106102652` ([DD](../detail-design/teaching-service.md#điểm-danh-trong-nhật-ký-buổi-dạy--06112026)).

## Kiểm tra sau thay đổi

- `npm run check`: 291/291 test.
- Trình duyệt 390px trên Supabase local: hai nút sao chép tin nhắn chép đúng nội dung (đọc lại clipboard); điểm danh mở sẵn sau khi ghi buổi, lưu hiện "có mặt 1/2" và dòng vắng nhiều; giả lập production chưa áp migration (đổi tên bảng) thì trang lớp vẫn 200 và chỉ ẩn phần điểm danh; không lỗi console, không tràn ngang.
- Máy tính 1280, 1440 và 1920px (ưu tiên trước điện thoại cho trang giáo viên): bấm nút chép bằng phím Enter, có viền focus, clipboard đúng; điểm danh mở, bỏ chọn, lưu và tóm tắt đúng ở cả ba độ rộng; nội dung trang lớp rộng 1136px trong khung 1200px, không tràn ngang, không lỗi console; axe (WCAG 2 A/AA) sạch trên trang lớp có bài giao. Trên lớp chưa có bài giao, axe báo `link-in-text-block` ở link "Giao bài đầu tiên" của dòng "Chưa có bài tập nào" (có từ trước, chưa sửa).
- `npm run test:e2e:supabase` chạy lại sau mọi thay đổi trên trang lớp: 38/38 đạt. Chưa thêm kịch bản E2E riêng cho tin nhắn giao bài và điểm danh (kịch bản nhật ký buổi dạy hiện dùng lớp chưa có học viên).

## Cần áp lên production

`20261106102652_class_session_attendance.sql` (cùng các migration ở mục 8 nếu chưa áp). Chưa áp thì web vẫn chạy, chỉ chưa có điểm danh.

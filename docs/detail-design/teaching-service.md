# Detail Design dự kiến — Dịch vụ hỗ trợ giảng dạy

Ngân hàng N4 (02/11/2026): [JSON bổ sung 1–28](../../content/review-banks/n4-minna-1-28-supplement.json) lưu 160 câu tự biên soạn và 40 mục từ; đã nối vào ngân hàng gốc qua `publish_lesson`. Sau khi người học chọn mở rộng, [bản nháp tổng ôn 1–50](../../content/review-banks/n4-comprehensive.json) cung cấp 200 câu (40 câu nền tảng chọn từ phần bổ sung 1–28 và 160 câu mới), 80 mục từ theo schema v1. Bộ mới được xuất bản thành bài riêng có mã kèm 8 ký tự đầu mã lớp, thêm vào lớp bằng `upsert_class_lesson`, rồi ghim bằng `set_daily_practice(..., 40, new_lesson_id)`. Bốn nhóm 50 câu (kanji, biến đổi từ, ngữ pháp, đọc hiểu) tạo bốn quota 10 câu; tag `minna:N` đánh dấu bài nguồn nhưng không chia nhỏ quota. Bộ cũ và bài đã giao giữ nguyên; cron từ 03/11 dùng bộ tổng ôn. Vocab dùng lại thẻ và luyện kanji, không tự khởi tạo SRS khi xuất bản. Không thêm schema, endpoint hoặc AI runtime. Xem [kiểm chứng](../testing/n4-review-bank.md).

Ngày: 29/10/2026. **Đã triển khai lát A** (migration 202610290001–0002): `teacher_accounts`, kích hoạt giảng dạy sau xác minh email, xuất bản không tự công khai, loader theo owner/lớp/version, sức chứa lớp và link Meet. **Đã triển khai lát B1 bản đầu** (migration 202610290003): schema v2 Việt–Trung, profile chấm `zh-exact-v1`, wizard soạn theo mẫu, xác nhận đáp án phía server. **Đã triển khai lát B2 bản đầu** (migration 202610290004): chia sẻ phiên bản view/copy, thu hồi, sao chép và dùng lại bài. Các phần media riêng tư, scan/OCR và TTS web dưới đây vẫn là hợp đồng dự kiến, **chưa phải schema/API đang chạy**. Hành vi gốc theo [BD](../basic-design/teaching-service.md); cần chi tiết hóa migration/API theo từng lát triển khai trước code.

## Đối chiếu mã nguồn

- `lib/server/account.ts`: `requireStudent` chỉ yêu cầu đăng nhập; quyền dạy lấy từ `teacher_accounts` (đồng bộ vào `profiles.role` cho RLS/RPC cũ), quyền học từ enrollment.
- `lib/server/classes.ts`: owner check, tạo/đổi mã, join qua RPC khóa hàng lớp; settings lưu capacity, meeting URL, ngôn ngữ và revision CAS. `listOwnedLessons` chỉ chọn bài của giáo viên.
- `lib/server/lesson-access.ts`: mọi trang/API đọc bài đi qua RPC `read_lesson_version`; bài public đọc mọi version, bài class chỉ chủ bài hoặc thành viên đang học lớp đã ghim đúng version và đã mở.
- `supabase/migrations/202610280001_foundation.sql`: đăng ký sinh student; quyền role chưa tự phục vụ. `202610280004_classroom.sql` kiểm tra student khi join, teacher khi sở hữu lớp; phải cập nhật toàn bộ gate/RLS/RPC liên quan, không chỉ đổi form đăng ký.
- `lib/lesson-schema.ts`: fill có inputMode hiragana/katakana/japanese; nội dung, font và audio đang thiên về Nhật. Schema đa ngôn ngữ phải tương thích snapshot cũ.
- Editor, grading, assignment snapshots, báo cáo và `lib/notifications/` là nền tái sử dụng. Chưa có job OCR, storage scan, grant chia sẻ hay quyền sao chép.

## Biên quyền và dữ liệu dự kiến

Bản đầu mỗi giáo viên là một chủ sở hữu độc lập. Không thêm mô hình tổ chức/workspace nhiều thành viên khi chưa có nhu cầu. Khả năng dạy không tự cấp quyền đọc lớp người khác; tư cách học sinh đến từ enrollment, không phải chỉ một role toàn cục.

| Thay đổi dự kiến | Dữ liệu và bất biến |
|---|---|
| `teacher_accounts` | `user_id` duy nhất, trạng thái pending/active/suspended, email_verified_at, accepted_terms_at, activated_at. Server sở hữu chuyển trạng thái; không lấy user_metadata làm quyền. Xác minh email là xác minh tài khoản, không phải chứng nhận nghiệp vụ giáo viên |
| Metadata lớp | `capacity` nullable hoặc số nguyên dương, `subject`, `language_tag`, `instruction_language_tag`, `meeting_url` nullable, `revision` cho CAS settings. Null capacity là chưa giới hạn; không tự áp quota 10 cho mọi lớp |
| Metadata nội dung | `schema_version`, `subject`, `language_tag`, `instruction_language_tag`, `locale`, `source_language`, `attribution`. Mapping schema cũ mặc định ja-JP; metadata mới được chụp vào lesson_versions |
| `lesson_shares` | owner, recipient, source_version_id, permission view/copy, granted_at/revoked_at; một grant hoạt động cho mỗi version/người nhận. Không share bằng URL đoán được |
| Nguồn bản sao | source owner/version, copied_at, điều kiện sử dụng và quyền chia sẻ tiếp; không có FK kéo quyền đọc dữ liệu riêng của chủ nguồn |
| `media_assets` | owner, private storage key, mime, size/hash, trạng thái, nguồn/quyền dùng; quan hệ asset với snapshot/grant. Không đặt scan vào bucket audio công khai |
| `import_jobs` | owner, request_id duy nhất theo owner, trạng thái, source_asset_ids, locale, adapter/model version, usage, attempts, revision, lỗi an toàn, retention deadline |
| `import_items` | job/page/bounding box, proposed question, vùng chưa nhận dạng, review state, reviewed_by/at, revision; giáo viên sửa không bị worker ghi đè |
| `audit_events` | actor, action, resource, timestamp, request_id; ghi cấp/thu hồi/copy/chuyển trạng thái job, không log nguyên ảnh/đáp án hoặc token |

Tên cột/bảng cần chốt khi viết migration. Không trộn proposal vào danh sách bảng đã triển khai ở 03. Nâng cấp phải giữ role cũ hoạt động trong giai đoạn chuyển tiếp và backfill quyền dạy cho teacher hiện hữu. Không vô tình cấp quyền dạy cho mọi student. Snapshot cũ không bị ghi lại để thêm locale.

## Quản trị nền tảng và duyệt giáo viên — đã triển khai

Migration 202610290005 thêm `platform_admins` (chỉ cấp bằng SQL hoặc `npm run admin:grant` trên máy local), `platform_settings.teacher_approval_required` (mặc định bật cho POC giáo viên thuê) và các cột `requested_at`, `access_until`, `admin_note` trong `teacher_accounts`. Khi bật duyệt, `activate_teacher` tạo yêu cầu `pending`; quản trị viên mở quyền bằng `admin_set_teacher_status` (active/suspended), ghi hạn thuê/ghi chú bằng `admin_update_teacher_plan` và bật/tắt duyệt bằng `admin_set_teacher_approval`; mỗi RPC kiểm tra `is_platform_admin` và ghi `audit_events`. Tắt duyệt thì yêu cầu đang chờ được kích hoạt ở lần gửi tiếp theo; từ 03/11/2026 `/teach/start` hiện lại nút Kích hoạt giảng dạy cho yêu cầu đó thay vì báo chờ duyệt. Từ chối yêu cầu dùng `admin_set_teacher_status(suspended)` (CR-30): yêu cầu bị từ chối chưa từng có `activated_at`, nên trang quản trị ghi "Đã từ chối" với nút Duyệt, còn người gửi thấy "Yêu cầu giảng dạy chưa được chấp nhận" thay cho thông báo tạm dừng. Không cần migration. `access_until` chỉ để theo dõi: hệ thống không tự khóa, trang quản trị báo "Quá hạn thuê".

Trang `/admin` (tổng quan và cài đặt), `/admin/teachers`, `/admin/activity` gọi `requireAdmin`; người không phải quản trị viên nhận 404, mỗi server action kiểm tra lại quyền. Email giáo viên đọc qua Auth admin API một trang 1.000 tài khoản, đủ cho POC; quy mô lớn hơn cần phân trang. Quản trị viên chỉ thấy số liệu tổng hợp, không đọc bài nộp, nháp hay ghi chú riêng.

## Onboarding và sức chứa lớp

Luồng server đăng ký giáo viên: xác thực email → kiểm tra giới hạn đăng ký/điều khoản → kích hoạt teacher account → ghi audit. Mặc định onboarding dịch vụ tự kích hoạt sau xác minh email, chấp nhận điều khoản và kiểm tra lạm dụng/quota; pending dùng khi xác minh chưa xong hoặc cần xử lý ngoại lệ. Đây không phải chứng nhận chuyên môn giáo viên. Client không được gửi role để ghi thẳng vào profiles. Một người bị đình chỉ dạy không mất quyền đọc bài của mình với tư cách học sinh nếu tài khoản vẫn hợp lệ.

Join RPC khóa hàng classes trước khi kiểm tra active/join_enabled/capacity và ghi enrollment. Thứ tự: kiểm tra mã và rate limit → nếu đã là thành viên hiện hành thì trả idempotent → đếm chỗ còn lại → thêm hoặc kích hoạt enrollment trong cùng transaction. Retry, join đồng thời và rejoin đều đi cùng khóa. Lớp đầy không trả danh sách thành viên. Giảm capacity dưới số đang học bị từ chối; thành viên rời lớp giải phóng chỗ nhưng giữ lịch sử. Học sinh đã rời không dùng được link riêng/slides mới; xử lý lịch sử cá nhân theo chính sách truy cập hiện tại, không cascade xóa điểm.

Bản đầu meeting_url chỉ chấp nhận HTTPS host `meet.google.com` và đường dẫn hợp lệ, không có credentials; cấm javascript/data URL. Chỉ chủ lớp cập nhật, thành viên đang học đọc; không xuất vào catalog công khai, email công khai hoặc log. Không gọi server fetch URL, không cần OAuth Google cho việc lưu link. Meeting link có thể được sao chép ra ngoài; Reng không đảm bảo kiểm soát người vào Google Meet.

## Chia sẻ, sao chép và media

**Bản đã triển khai** (`app/actions/lesson-sharing.ts`, `lib/server/lesson-sharing.ts`): chủ bài chọn phiên bản đã xuất bản và nhập email giáo viên nhận; RPC security definer chỉ dùng để tra email trong `auth.users`, người nhận phải là giáo viên khác đang active. Mỗi lần thử được ghi audit trước khi tra để giới hạn 60 lần/giờ/chủ bài, hạn chế dò email; kết quả chỉ báo chung "không chia sẻ được". Nâng view lên copy dùng lại quyền đang hiệu lực. Người nhận đọc đúng phiên bản qua `read_lesson_version`, không xem được ghi chú (API notes chỉ cho chủ bài). Bản sao: bỏ `teacherNotes`, giữ ID nội bộ (ID chỉ duy nhất trong một bài nên không cần remap), ghi `copied_from_version_id` và dòng nguồn có tên tác giả; bài v2 sao chép về mẫu "starter", không mang review đáp án nên người nhận phải xác nhận lại trước khi xuất bản. Gửi lại cùng requestId trả về đúng bản sao, kể cả khi quyền đã bị thu hồi sau đó. Bản sao và bản nhân bản của bản sao không chia sẻ tiếp được. Dùng lại bài của mình (`duplicate_lesson`) sao chép nháp hiện tại kèm ghi chú và review, không mang lớp/bài giao/điểm. Chưa có media riêng tư nên chưa cần entitlement/signed URL; audio vẫn là asset công khai theo hash.


API cấp quyền phải kiểm tra chủ bài, phiên bản xuất bản và quyền dùng media. Người nhận phải là giáo viên active; mỗi lần xem/copy kiểm tra grant hiện hành phía server, không tin recipient/owner trong request. Khách hoặc lớp khác nhận not-found/forbidden phù hợp, không lộ dữ liệu qua tìm kiếm.

Bản copy tạo lesson ID/owner mới và draft mới trong transaction, remap ID nội bộ/refs, giữ attribution và version nguồn. Không sao chép teacherNotes, draft, assignment_items test, enrollment, submission hay kết quả. Kiểm tra lại schema, nguồn asset và quota trước commit; retry theo request_id không tạo nhiều bản. Người nhận duyệt rồi tự xuất bản/gắn vào lớp mình. Không tự đồng bộ bản gốc.

Không dùng URL public cho media riêng. Tài nguyên được đọc qua endpoint kiểm tra quyền và signed URL ngắn hạn; tệp không được cache công khai. Với copy hợp lệ, tạo bản sao asset thuộc người nhận hoặc entitlement độc lập trước khi hoàn tất transaction; thu hồi grant nguồn không làm hỏng bản sao hợp lệ. Dọn asset mồ côi nếu copy thất bại. Nội dung bản sao giữ quyền chia sẻ tiếp từ nguồn; không cho tự nâng quyền.

Thu hồi version share ngăn yêu cầu xem/copy mới. Signed URL đã phát có thể còn hiệu lực tới khi hết TTL; bản đã tải không thu hồi vật lý được. UI nêu giới hạn này. Không sửa public DTO hiện tại để thêm ghi chú/answer test phục vụ chia sẻ.

## Hợp đồng nhập scan

Luồng dự kiến: `uploaded → queued → processing → needs_review → ready → imported`; nhánh lỗi `failed`, `cancelled`, `expired`. Ready chỉ khi giáo viên duyệt mọi câu được chọn, đủ đáp án và validator qua. Imported là tạo draft trong editor/bộ câu hỏi, không phải tự xuất bản hoặc giao bài. Câu ngoài phạm vi chuyển thành unresolved, không ép thành choice/fill.

Upload dùng URL ký ngắn hạn, storage key do server sinh theo owner/job; kiểm tra MIME thực tế, kích thước, số trang, ảnh hỏng, PDF có mật khẩu, giới hạn giải nén/render và nội dung độc hại. Không fetch link ngoài làm nguồn. File chưa kiểm tra không có public URL; xóa metadata nhạy cảm và dùng preview an toàn. Giới hạn bản thử: JPG/PNG/PDF, 20 MB và 10 trang/job, quota dự kiến 100 trang/tháng/giáo viên, concurrency 1 job/giáo viên. Đây là cấu hình thử nghiệm, chưa là gói giá.

Worker nền chạy OCR/layout qua adapter, không xử lý toàn bộ job trong request Next.js. Tách nhận dạng chữ, gợi ý cấu trúc và review giáo viên. Nếu dùng mô hình sinh, coi nội dung ảnh là dữ liệu, không phải lệnh; output JSON phải qua allowlist/schema, không thực thi HTML/script/công cụ từ nội dung nhận dạng. Đáp án không có trong nguồn để null/unresolved hoặc ghi rõ gợi ý chưa xác nhận; không tự nhận gợi ý là đáp án chuẩn.

Dữ liệu nguồn tham chiếu page/bounding box để đối chiếu; confidence chỉ ưu tiên chỗ cần kiểm tra. Worker claim bằng lease, heartbeat/timeout, retry hữu hạn/backoff; job/request_id chống nhân đôi. Retry chỉ cập nhật phần chưa được giáo viên sửa, dùng revision CAS. Lỗi provider không mất ảnh/câu đã sửa; giáo viên có thể nhập tay. Không ghi đè draft bài học mới hơn khi import lần nữa.

Khi xác nhận import, server kiểm tra owner, revision, trạng thái review, refs và grading schema; tạo draft/idempotency record trong transaction. Với test, câu/đáp án luôn nằm ở kho riêng phía server; không đưa vào bài luyện công khai. Ảnh gốc có đáp án ở cuối trang phải được crop/che hoặc loại khỏi media học sinh; kiểm tra cả ảnh preview, PDF và signed URL trước xuất bản.

Chính sách lưu dự kiến: xóa nguồn và OCR trung gian sau 30 ngày hoặc khi giáo viên yêu cầu, job lỗi cũng chịu retention. Hình đã được chọn làm học liệu được quản lý như asset của bài, giữ khi còn snapshot tham chiếu; UI phân biệt xóa bản scan và xóa học liệu. Không dùng tệp giáo viên để huấn luyện; trước khi bật nhà cung cấp phải xác minh điều khoản xử lý/lưu dữ liệu và thông báo việc gửi tệp ra bên ngoài.

## Đa ngôn ngữ và chấm

Mốc đầu là Việt–Trung: `subject=chinese`, `instruction_language_tag=vi-VN`; nội dung tiếng Trung chọn `language_tag=zh-Hans` hoặc `zh-Hant` theo bài. Mã ngôn ngữ nội dung, locale giọng đọc và ngôn ngữ hướng dẫn là các giá trị riêng; không đặt chung một giá trị “Việt–Trung”. Không tự chọn giản thể hay phồn thể chỉ từ ngôn ngữ giao diện. Từ/câu có chữ Hán, pinyin và nghĩa/giải thích Việt.

`subject` giữ khả năng thêm môn ngoài ngoại ngữ, không hard-code mọi lớp đều có pinyin/kana/TTS. MVP chỉ triển khai profile tiếng Trung cần thiết; module Nhật cũ được giữ và kiểm tra hồi quy. Môn khác cần thiết kế nội dung/chấm riêng trước khi bật.

Versioned schema có language profile. `ja-JP` giữ wanakana/kana; `zh-Hans`/`zh-Hant` dùng IME/Unicode và trường pinyin riêng. Không bỏ thanh điệu, tự chuyển giản/phồn hoặc dùng romaji chuẩn hóa cho tiếng Trung. Quy tắc chuẩn hóa là metadata bất biến của snapshot; thêm đáp án thay thế do giáo viên xác nhận. Regression NFKC tiếng Nhật phải giữ nguyên.

Font và giọng TTS chọn theo locale, asset hash có locale/voice/config để không dùng nhầm audio Nhật cho chữ Trung giống nhau. Search/filter theo ngôn ngữ. Chưa cần nhập bộ giáo trình Trung hàng loạt; thử một bài do giáo viên cung cấp/được phép dùng.

Chấm tay chưa triển khai. Trước khi thêm phải thiết kế pending_review/graded, người chấm, điểm và audit sửa điểm; điểm chờ chấm không thành 0, báo cáo/nhắc học không tính như thiếu nộp. MVP scan chỉ bật câu có quy tắc chấm đã hỗ trợ.

## Lựa chọn OCR và điều kiện triển khai

Chưa chốt nhà cung cấp. [Document AI OCR](https://docs.cloud.google.com/document-ai/docs/enterprise-document-ocr) mô tả nhận dạng văn bản/layout và kiểm tra chất lượng ảnh; điều đó không đồng nghĩa tự hiểu đáp án bài tập. Thử adapter trên bộ ảnh thực của giáo viên trước khi chọn, ưu tiên đo chữ Trung, pinyin và tiếng Việt trên cùng trang; kiểm tra hồi quy Nhật khi tái sử dụng adapter; đo chi phí/trang, thời gian sửa và nơi xử lý dữ liệu. Không cam kết chữ viết tay/bố cục phức tạp hoặc tự chấm toàn bộ.

Next.js/Supabase hiện tại tiếp tục làm web/Auth/database; object storage riêng tư và worker/queue là phần bổ sung. Chưa mua dịch vụ, thêm key hay bật OCR trong đợt này. Cần benchmark và quyết định ngân sách trước khi triển khai adapter thật; không cần chờ OCR để làm onboarding/chia sẻ.

## Điểm phải hoàn thiện trước mỗi lát code

Chốt migration/backfill và quyền role trước A; API request/response, lỗi, cache và test RLS trước A/B; storage policy, worker host/queue, provider/quota/cost trước C. Tất cả là công việc kỹ thuật còn lại, không tự xem bản DD dự kiến này là đầy đủ để chạy dịch vụ thật.

## Soạn bài theo mẫu — hợp đồng bổ sung

Nguồn UX: [luồng biên soạn](../content-authoring.md). Đã triển khai bằng Server Actions trong `app/actions/teaching-lessons.ts` (cùng kiểm tra như các API đề xuất bên dưới, không thêm endpoint trùng chức năng):

- Tạo bài: requestId do server render vào form; `create_teaching_lesson` khóa theo giáo viên + requestId, cùng payload trả lại bài cũ, khác payload báo `request_conflict`; server sinh lesson ID, bài mới riêng tư.
- Trình soạn v2 dùng cùng cơ chế giữ thay đổi chưa lưu trên máy và bắt lỗi request như trình soạn v1 ([DD giai đoạn 4](phase-4.md)), khôi phục bằng `teachingDraftSchema`.
- Lưu nháp: `save_teaching_draft` CAS theo revision; lỗi tab khác trả conflict, không ghi đè. Cùng lệnh lưu nhận danh sách câu cần xác nhận; server ghi md5 của câu đã lưu vào `authoring_state.reviewedQuestions`, `get_teaching_editor` chỉ trả về câu còn khớp hash.
- Dựng slide chạy xác định ở client (`lib/teaching-templates.ts`), cho xem số slide thêm/cập nhật/bỏ/giữ trước khi áp dụng, rồi lưu bằng CAS như nháp; không có endpoint generate-slides riêng.
- Xuất bản: server kiểm tra lại toàn bộ nháp (`reviewTeachingDraft`) và review; RPC từ chối nội dung khác nháp đã lưu (`save_before_publish`) hoặc câu chưa xác nhận (`review_required`). Không tự công khai, không tự giao lớp hay gửi email.

Editor v1 (`create-lesson-form.tsx`, `vocabulary-import.tsx` cột jp/romaji/vi) giữ nguyên cho bài tiếng Nhật.

| Thành phần dự kiến | Quy tắc |
|---|---|
| Template | `template_id`, `template_version`, loại bài, section có thứ tự và slot; chỉ là cấu trúc, không chứa dữ liệu lớp/đáp án mặc định được coi là đã duyệt |
| Draft metadata | mục tiêu, đối tượng, điều kiện kiến thức dạng mô tả, thứ tự/độ khó gợi ý, template nguồn; lưu cùng draft và chụp khi xuất bản. Không tự khóa truy cập theo thứ tự |
| Bảng Việt–Trung | ID dòng ổn định, chữ Hán, pinyin, nghĩa Việt, ví dụ và phần mở rộng; preview lỗi/duplicate theo dòng, chỉ ghi dữ liệu sau xác nhận. Không nhét pinyin vào romaji hoặc nghĩa vào trường Nhật |
| Slide sinh từ mẫu | provenance gồm template/slot/source item ID, phân biệt generated và chỉnh tay; renderer nhận slide chuẩn, không cần biết wizard |
| Câu luyện tạo từ nội dung | tham chiếu nguồn và revision của prompt/options/answers, trạng thái needs_review/confirmed; sửa nội dung chấm làm mất xác nhận trước đó |
| Lưu và tiếp tục | Dùng draft revision/CAS hiện tại; bước wizard lưu cùng draft nếu schema mới hỗ trợ, không tự publish. Hai tab xung đột phải được báo trước khi ghi |

Dựng slide là chuyển đổi xác định từ template + nội dung đã nhập, không phụ thuộc AI. Có preview diff trước áp dụng; tạo ID mới khi thêm, giữ ID/ref không đổi cho mục còn dùng, không xóa nội dung bị slide thủ công tham chiếu. Nội dung dài được phân trang theo bố cục và kiểm tra thực tế 1280×720; không cắt chữ hoặc tự rút gọn ý. Dựng lại cùng đầu vào không nhân đôi slide. Nếu source thay đổi xung đột phần giáo viên đã sửa, yêu cầu chọn giữ/sinh lại; mặc định giữ sửa tay. Revision đổi từ tab khác thì không áp dụng diff cũ.

Dùng lại bài mình tạo draft mới có ID/owner đúng, không mang assignments/lớp/hạn nộp/điểm. Copy bài đồng nghiệp theo grant hiện hành và attribution ở hợp đồng chia sẻ; sau copy mới áp dụng mẫu/chỉnh nội dung. Thay mẫu chỉ sửa draft, không sửa snapshot cũ.

Lưu nháp cho phép thiếu nội dung. Xuất bản kiểm tra mục tiêu/slide/ref và câu được chọn đã xác nhận đáp án ở revision hiện tại. Trạng thái review do server đối chiếu dữ liệu lưu, không tin cờ confirmed client gửi độc lập với nội dung. Với pinyin trống có cảnh báo cho giáo viên kiểm tra, không tự thêm đọc âm rồi đánh dấu đã duyệt. Câu listening chỉ xuất bản khi media đúng điều kiện riêng; thiếu audio không được gắn nhãn sẵn sàng. Nếu giữ yêu cầu đủ audio của publisher hiện tại thì UI phải cung cấp tác vụ tạo/nhập/duyệt audio và lỗi dễ xử lý trước khi bật wizard, không buộc giáo viên chạy CLI.

Giao practice từ câu luyện đã chọn theo version xuất bản; test vẫn dùng kho câu riêng. Publish trả version ID, giao lớp là bước riêng có kiểm tra owner/membership/version và idempotency; nếu giao thất bại giữ version đã xuất bản và cho thử lại, không báo hoàn tất giả hoặc xuất bản lại chỉ vì retry giao. Lưu/xuất bản không tự chọn public visibility hoặc bật gửi nhắc bài.

Trước code cần chốt schema migration tương thích dữ liệu Nhật, mapping bảng/template → schema renderer, API/save review states và hợp đồng TTS web. Template không tự kèm câu/đáp án AI; tính năng gợi ý về sau vẫn đi qua giáo viên duyệt. Checklist tương ứng AUTHOR-01 đến AUTHOR-08 ở tài liệu nghiệm thu.

## API dự kiến và quy ước lỗi

Các đường dẫn sau là hợp đồng đề xuất cho dịch vụ, **chưa tồn tại đầy đủ trong app**. Khi thực hiện bằng Server Action vẫn phải giữ cùng kiểm tra/quy tắc; không tạo thêm endpoint trùng chức năng chỉ để khớp tên tài liệu. API hiện có ở DD phase-3/4/5 giữ nguyên cho schema v1.

| Thao tác dự kiến | Đầu vào chính | Kết quả và kiểm tra |
|---|---|---|
| POST `/api/teacher-account` | chấp nhận phiên bản điều khoản, requestId | Trạng thái pending/active; user từ phiên đã xác minh, không nhận role/owner do client cấp |
| PATCH `/api/teach/classes/[id]/settings` | expectedRevision, capacity, languageTag, instructionLanguageTag, subject, meetingUrl | Settings + revision mới; chủ lớp, capacity không dưới số học sinh, URL Meet allowlist |
| POST `/api/classes/join` | joinCode, requestId | joined/already_member/class_full/invalid_code; khóa lớp/đếm chỗ trong transaction, không lộ roster |
| POST `/api/teach/lessons` | tên, context, mục tiêu, templateId/version, requestId | lessonId + draftRevision; server tạo ID, draft riêng tư, template không kèm quyền lớp |
| PUT `/api/teach/lessons/[id]/draft` | expectedRevision, draft, authoring changes | revision + savedAt; chủ bài, schema theo version; cho nháp chưa hoàn chỉnh, CAS |
| POST `/api/teach/lessons/[id]/generate-slides` | expectedRevision, template version, source IDs | Preview thay đổi với baseRevision; chưa ghi. Áp dụng qua lưu draft CAS sau giáo viên chọn giữ/sinh lại |
| POST `/api/teach/lessons/[id]/reviews` | expectedRevision, question IDs, content hashes | Review hash server tính từ nội dung hiện tại, actor/time; sửa câu thì hết hiệu lực. Không nhận confirmed cho revision khác |
| POST `/api/teach/lessons/[id]/publish` | expectedRevision, requestId | versionId hoặc lỗi theo field; transaction snapshot/pointer và review check, không tự giao/public/email |
| POST `/api/teach/lessons/[id]/shares` | sourceVersionId, recipientId, view/copy, requestId | Grant scoped version; owner/recipient active/quyền media, không share test/notes |
| DELETE `/api/teach/lessons/[id]/shares/[shareId]` | requestId | revokedAt, retry cùng kết quả; chủ bài, chặn đọc/copy mới |
| POST `/api/teach/shared-lessons/[shareId]/copy` | requestId | lessonId draft mới; grant copy hiện hành, snapshot/media/attribution, idempotent |
| POST `/api/teach/imports` | metadata tệp, locale, requestId | jobId + upload URL ngắn hạn; quota/owner và hậu kiểm bytes/page trước OCR |
| GET/PATCH `/api/teach/imports/[id]` | GET hoặc expectedRevision + câu sửa/duyệt | Trạng thái/draft/revision; chỉ owner; no-store; không ghi đè phần sửa tay |
| POST `/api/teach/imports/[id]/apply` | expectedRevision, targetLessonId, targetRevision, selected IDs, requestId | Draft revision hoặc conflict; kiểm tra review và hai tài nguyên cùng owner, không publish |
| POST `/api/teach/lessons/[id]/audio-jobs` | item IDs, expectedRevision, locale/voice, requestId | jobId/status; quota và hash nội dung server tính; nghe duyệt sau khi worker xong |

Giao bài vẫn theo hợp đồng assignment hiện có, được mở rộng hỗ trợ schema/profile v2; dùng versionId từ publish, không dùng draft. Server sinh timestamp, owner và hash; client không quyết định điểm/quyền/review bằng cờ độc lập.

Mọi mutation xác thực phiên, same-origin/CSRF theo cơ chế hiện có, validate unknown JSON, giới hạn kích thước và rate limit. Resource không thuộc người gọi trả 404 hoặc 403 theo chính sách nhất quán không lộ tồn tại. Lỗi chuẩn dự kiến: 400 invalid_input/schema_version, 401 unauthenticated, 403 teacher_inactive, 404 not_found, 409 revision_conflict/class_full, 413 payload_too_large, 422 review_required/invalid_refs, 429 quota_exceeded/rate_limited, 503 provider_unavailable. Trả mã/field/requestId để UI dịch, không trả token/SQL/ảnh/đáp án riêng. Thông số byte/rate limit từng API chốt trong implementation DD trước code.

Read nháp/share/private media/job dùng private no-store; public lesson DTO chỉ version public và đã lọc. Token/signed URL không xuất hiện trong log hoặc response của người không có quyền. Retry requestId cùng payload trả lại kết quả, khác payload bị conflict, không tạo hai bản copy/job/assignment.

## Pilot tiếng Nhật theo Minna — đã triển khai

Không thêm migration. Schema bài Nhật v1 (`lib/lesson-schema.ts`, nháp ở `lib/lesson-draft.ts`) thêm slide tự chứa `dialogue` (1–8 lượt) và `table` (1–6 cột, 1–12 hàng, mọi hàng đủ ô; `revealLastColumn`). Snapshot cũ vẫn hợp lệ; RPC đọc/sao chép xử lý slide chung nên không đổi. Editor có ô nhập từng lượt thoại và ô bảng (`lib/slide-table.ts`: Tab khi dán, `|` khi gõ; bảng vượt giới hạn không vào nháp). Kiểm tra trước xuất bản báo thiếu tiêu đề, thiếu ô và hàng lệch cột bằng tiếng Việt.

Furigana `{base|reading}` được parse ở `lib/japanese-text.ts` và render bằng `components/lessons/japanese-text.tsx` (ruby, đoạn chữ Nhật trong câu Việt gắn `lang="ja"`). Giọng thiết bị, flashcard và kế hoạch audio dùng `toSpeechText` (đọc phần furigana, bỏ 〜); câu không có cú pháp giữ nguyên hash audio cũ. Slide từ vựng trên 3 từ, ví dụ trên 1 câu, hội thoại trên 5 lượt và bảng trên 8 hàng dùng bố cục dày hơn; 38 slide của bài 11 đo được cao tối đa 676/720px.

Bài mẫu (`lib/starter-lessons.ts`, JSON trong `content/starters/`) được tạo bằng RPC `insert_lesson_copy` sẵn có: ID `lesson-<uuid>`, idempotent theo `requestId` (fingerprint `starter:<id>`), quota 2000 bài, không ghi nguồn sao chép nên bài là của giáo viên và chia sẻ được; nhật ký ghi `lesson.copied`. Ô điền tiếng Nhật hoàn tất romaji còn dở khi blur (`finalizeRomaji`), chỉ đổi đoạn Latin nên kana/kanji đã nhập giữ nguyên. Form lớp mặc định `ja-JP`. `supabase/config.toml` thêm `http://127.0.0.1:3017/**` vào allowlist để link xác nhận/đặt lại mật khẩu của dev server cổng 3017 không rơi về `site_url`.

Bổ sung 02/11/2026: `minna-1-13` đăng ký sau bài 12 trong `STARTER_LESSONS`, dùng nguyên luồng sao chép nháp và cập nhật từ mẫu. JSON schema v1 gồm 46 từ, 5 ngữ pháp, 41 slide, 50 câu choice/fill; không đổi RPC, schema hoặc bản bài đã tạo.

Bổ sung 03/11/2026: `minna-1-03` đăng ký sau bài 2 (52 từ, 5 ngữ pháp, 39 slide, 50 câu). Đo slide trong deck 1280×720 thì thấy năm dòng hội thoại ở cỡ chữ đầy đủ đã tràn mép dưới, và bảy, tám dòng ở bố cục gọn cũng tràn (schema cho tối đa 8 lượt). `DialogueSlide` (`components/slides/slide-content.tsx`) nay chuyển sang bố cục gọn khi ước tính hơn 4 dòng (`COMPACT_DIALOGUE_ROWS`) và bố cục dày (`is-dense`, `app/lesson-visuals.css`) khi hơn 6 dòng (`DENSE_DIALOGUE_ROWS`). Áp dụng cho cả bài giáo viên tự soạn. `minna-1-04` (48 từ, 5 ngữ pháp, 38 slide, 50 câu) đăng ký sau bài 3. Bảng 8 hàng ở cỡ đầy đủ cũng tràn (733 px), nên `COMPACT_TABLE_ROWS` đổi từ 8 xuống 7. Đo trong deck, hàng đầy đủ cao khoảng 62 px, hàng gọn khoảng 44 px, nên bảng 12 hàng (tối đa) vẫn vừa. `minna-1-05` (47 từ, 5 ngữ pháp, 38 slide, 50 câu) đăng ký sau bài 4; `minna-1-06` (48 từ, 5 ngữ pháp, 37 slide, 50 câu) sau bài 5; `minna-1-07` (48 từ, 5 ngữ pháp, 36 slide, 50 câu) sau bài 6; `minna-1-08` (50 từ, 5 ngữ pháp, 36 slide, 50 câu) sau bài 7; `minna-1-09` (48 từ, 5 ngữ pháp, 35 slide, 50 câu) sau bài 8; `minna-1-10` (48 từ, 5 ngữ pháp, 37 slide, 50 câu) sau bài 9, nên `STARTER_LESSONS` liền mạch từ bài 1 đến 13; `minna-1-14` (48 từ, 5 ngữ pháp, 35 slide, 50 câu) thêm ngày 04/11/2026, động từ có `note` ghi nhóm và thể て; `minna-1-15` (40 từ, 5 ngữ pháp, 34 slide, 50 câu) theo sau. Lớp an toàn cuối cùng: `fitSlide` trong `components/slides/slide-deck.tsx` chạy sau khi font tải xong và ở mỗi `slidechanged`. Nếu `section.scrollHeight` của slide hiện tại vẫn lớn hơn 720 px, hàm đặt CSS `zoom` cho phần nội dung, theo tỉ lệ chỗ trống chia chiều cao nội dung, chừa 4 px, tối thiểu 0,6, rồi gọi `deck.layout()` để reveal căn giữa lại. Slide vừa khung thì không bị đụng tới. Số đo là pixel CSS nên phép co giãn cả sân khấu của reveal không ảnh hưởng. Slide mẫu câu có phần giải thích dài cũng tràn (723 px). `GrammarSlide` nay ước tính số dòng theo độ rộng: chữ Nhật tính 1, chữ Việt tính 0,55; mẫu câu khoảng 16 đơn vị mỗi dòng (mỗi dòng tính gấp đôi), giải thích khoảng 36. Quá 8 dòng thì dùng `data-size="compact"` (mẫu câu 52 px, giải thích 26 px). Ngưỡng hiệu chỉnh theo chiều cao đo được của 60 slide mẫu câu trong 12 bài: cao nhất là 664 px ở 7 dòng, slide tràn ở 9 dòng. Khung xem trước của Presenter khai báo lại cỡ chữ cho hội thoại gọn/dày (`:is(.is-compact, .is-dense)`), vì quy tắc của deck cụ thể hơn và trước đó làm chữ trong khung nhỏ to lên 26–30 px. Slide ví dụ có hai câu hỏi-đáp dài bị xuống dòng thì tràn (790 px), nên `ExampleSlide` ước tính số dòng (khoảng 26 ký tự mỗi dòng, `EXAMPLE_ROW_CHARACTERS`) và dùng `data-size="dense"` (chữ Nhật 34 px) khi hơn 4 dòng (`DENSE_EXAMPLE_ROWS`).

### Bài luyện hằng ngày — đã triển khai

Migration `202610290006_daily_practice.sql`: cột `classes.daily_practice_size` (null = tắt, 3–20), bảng `daily_practice_runs` (khóa chính lớp + ngày Việt Nam, `assignment_id` duy nhất; chỉ service role đọc/ghi), RPC `set_daily_practice` (chủ lớp) và `publish_daily_practice` (khóa advisory theo lớp + ngày; đã có run thì trả bài cũ; gọi `publish_assignment` sẵn có với mode practice, cho nộp muộn, 3 lượt, điểm đạt của lớp, tiêu đề "Luyện tập hằng ngày DD/MM"). `lib/server/daily-practice.ts` xét tối đa 20 bài đã mở theo `available_at` mới nhất và chọn bài đầu tiên có câu choice/fill trong phiên bản lớp đang ghim (từ 30/10/2026: bài mới chỉ có slide không làm lớp mất bài luyện), lỗi theo lớp được ghi log kèm mã lớp và mã lỗi dịch vụ, đọc câu đã dùng trong 14 ngày rồi `selectDailyQuestions` (`lib/daily-practice.ts`: chưa dùng trước, dùng lâu nhất sau, hòa thì theo hash lớp + ngày nên ổn định khi chạy lại). Từ 30/10/2026: "đã dùng" tính mọi bài giao của cùng bài học trong 14 ngày (không chỉ bài hằng ngày), nên bộ giao tay như bài nhập từ Sheet không lặp lại sáng hôm sau; `selectBalancedDailyQuestions` chia câu theo dạng = loại câu + tag phân biệt (bỏ tag chung của cả bài và tag riêng từng câu có dấu `:` như `kanji:v1201`), mỗi dạng lấy phần tương ứng tỉ lệ trong bài theo phương pháp phần dư lớn nhất, theo thứ tự xuất hiện trong bài, trong mỗi dạng vẫn xoay vòng như trên. Ví dụ ngân hàng 85/45/30/40 câu (ngữ pháp/từ vựng/kanji/tổng hợp) với 60 câu/ngày cho 26/13/9/12; bài Minna 11 với 7 câu/ngày trộn câu chọn và câu điền. Hạn là 23:59:59 giờ Việt Nam. Cron `GET /api/cron/daily-practice` (Bearer `CRON_SECRET`, không cần email) chạy `0 23 * * *` UTC = 6:00 sáng Việt Nam; mỗi lớp lỗi riêng, không chặn lớp khác. Câu nghe không được chọn vì cần audio. Migration `202610300002_daily_practice_sixty.sql` mở giới hạn lên 3–60 câu/ngày và 1–60 câu mỗi bài giao, giữ nguyên quyền và bài đã giao.

Ngân hàng ôn từ Google Sheet (30/10/2026): `lib/daily-sheet-import.ts` kiểm tra header ba tab (bài hôm nay, lịch sử, đáp án), lấy đủ 60 câu hôm nay rồi thêm câu lịch sử gần nhất có đáp án chuẩn (tối đa 200 câu), mỗi câu là câu điền gắn tag "Dạng bài" của Sheet. Đáp án chỉ có chữ Việt dùng `inputMode: "text"`: ô nhập không đổi sang kana và chấm không phân biệt hoa/thường, khoảng trắng, dấu câu (dấu thanh vẫn phải đúng). `npm run daily:import -- --source <rows.json> --teacher-id <uuid> --class-id <uuid> --out <file.sql>` kiểm tra như khi xuất bản trong trình soạn rồi viết một câu lệnh SQL gọi `publish_lesson`, `upsert_class_lesson`, `publish_assignment` (bài hôm nay đúng 60 câu, hạn theo Sheet, cùng thiết lập với bài hằng ngày) và `set_daily_practice`; chạy bằng `npx supabase db query --linked --file <file.sql>`. Từ 02/11/2026 SQL ghim ngân hàng làm nguồn bài luyện hằng ngày của lớp (`set_daily_practice(..., p_lesson_id)`), nên thêm bài mới vào lớp không đổi nguồn. `--level N4|N5` (mặc định N5) chọn tên bài ngân hàng theo cấp trong `SHEET_BANKS` ("Ngân hàng ôn JLPT N5 — Minna Bài 1–10" hoặc "Ngân hàng ôn JLPT N4"); mã bài là mã cấp kèm 8 ký tự đầu của mã lớp (ví dụ `n4-sheet-review-bank-ac4b473b`) vì mã bài là duy nhất toàn hệ thống. Ngân hàng N5 đã nhập ngày 30/10 giữ mã `n5-sheet-review-bank`. Mã câu so khớp không phân biệt hoa thường giữa ba tab. `--bank-only` dùng cho Sheet có ngày hôm nay đã làm dở: không kiểm tra đủ 60 câu chưa làm, chỉ lấy dòng có đáp án chuẩn và không tạo bài hôm nay. Lần nhập thứ hai cùng cấp bị chặn bằng `reng:bank_exists`.

Bài học mẫu 11 có 50 câu (14 câu gốc giữ mã q1101–q1114, thêm q1115–q1150) để đổi câu khoảng một tuần không trùng.

### Vừa dạy vừa học — đã triển khai (02/11/2026)

Thiết kế sản phẩm ở [BD Luồng 7](../basic-design/teaching-service.md#luồng-7--vừa-dạy-vừa-học-lớp-tự-học-nhật-ký-buổi-dạy-và-cập-nhật-bài-mẫu-02112026). Ba migration cộng thêm, không xóa dữ liệu:

- `202611020001_daily_practice_source.sql`: cột `classes.daily_practice_lesson_id`, khóa ngoại kép `(id, daily_practice_lesson_id)` tới `class_lessons(class_id, lesson_id)`; null nghĩa là tự động. Migration ghim mỗi lớp đang bật luyện hằng ngày vào bài mà lần luyện gần nhất (`daily_practice_runs` → `assignments.lesson_id`) đã dùng, nên lớp đang chạy giữ nguồn hiện tại và không còn tự đổi khi thêm bài mới (hai lớp production đều đang lấy từ ngân hàng ôn); giáo viên muốn tự động thì chọn lại Tự động. `set_daily_practice` thêm `p_lesson_id text default null` (bỏ hàm 3 tham số cũ; lời gọi 3 tham số vẫn khớp hàm mới và trả về tự động), kiểm tra chủ lớp rồi `reng:lesson_not_in_class`.
- `202611020002_self_study_classes.sql`: cột `classes.self_study` (mặc định false) và trigger `self_study_owner_enrollment` thêm chủ lớp vào `enrollments` khi tạo lớp tự học. `join_class` trả `own_class` khi chủ lớp nhập mã lớp dạy của mình; mã lớp tự học với người khác coi như mã sai (ghi lượt sai để giới hạn dò mã); đếm sức chứa bỏ chủ lớp. `guard_class_capacity` cũng bỏ chủ lớp lớp dạy. `assignment_question_stats` chỉ tính chủ lớp khi lớp là lớp tự học. Lớp mà thành viên hiện tại duy nhất là chủ lớp (chủ lớp đã tự vào bằng mã trước khi bị chặn, như lớp ôn N4 của giáo viên pilot) được chuyển thành lớp tự học: `self_study = true`, ngừng nhận mã, sức chứa 1.
- `202611020004_reshare_guard.sql`: `set_lesson_visibility` từ chối đặt công khai bài có `copied_from_version_id` (`reng:reshare_not_allowed`, cùng quy tắc với chia sẻ lại); bản sao đang công khai trở về `class`.
- `202611020003_class_sessions.sql`: bảng `class_sessions` (ngày dạy, `lesson_id` + `lesson_version_id` theo khóa ngoại tới `class_lessons` và `lesson_versions`, `slide_reached` 1–500 chỉ khi có bài, ghi chú ≤ 2.000 ký tự), index lớp + ngày. RLS bật, không cấp quyền cho anon/authenticated; chỉ service role đọc/ghi/xóa.

Mã nguồn:

- `lib/server/daily-practice.ts`: `findDailyPracticeSource(classId, pinnedLessonId, now)` thử bài ghim khi đã mở (`orderDailySourceLessons` trong `lib/daily-practice.ts`), sau đó 20 bài mở mới nhất; dùng chung cho job sáng, nút "Giao bài hôm nay ngay" và trang lớp. `createDailyPractice` kiểm tra bài của ngày trước khi tìm nguồn, nên chạy lại hoặc bấm lần hai luôn trả bài đã có. Trang lớp chỉ tìm nguồn khi đang bật luyện hằng ngày. `components/teach/daily-practice-status.tsx` hiện trạng thái tự động/ghim/tạm dùng bài khác (`dailySourceState`) và cảnh báo khi `repeatsEveryDay(số câu, số câu/ngày)`. Form có ô "Lấy câu từ" liệt kê bài trong lớp (bài chưa mở có ghi chú).
- `lib/server/classes.ts`: `countsAsLearner` (lớp tự học hoặc không phải chủ lớp) dùng cho số học viên ở trang Giảng dạy; `createClass(..., isSelfStudy)` tạo lớp tự học với 1 chỗ, `join_enabled=false`. `lib/server/reports.ts` lọc chủ lớp khỏi danh sách, lượt nộp, lượt đang làm và số học viên đã rời; CSV và email tóm tắt dùng cùng báo cáo, email bỏ qua lớp tự học. Trang lớp tự học ẩn mã mời và ô sức chứa; trang Lớp của tôi ghi "Lớp tự học của bạn".
- Nhật ký buổi dạy: `lib/class-sessions.ts` (schema form, chặn ngày sau hôm nay, đường dẫn `/lessons/[id]/slide?version=…#N`), `lib/server/class-sessions.ts` (kiểm tra chủ lớp bằng `getTeacherClass`, lấy phiên bản lớp đang ghim khi ghi, đọc 12 buổi gần nhất kèm tên/số phiên bản), Server Action `classSessionAction` (ghi/xóa), `components/teach/class-session-form.tsx`, `class-session-list.tsx`, `delete-session-button.tsx`.
- Cập nhật từ mẫu: `findStarterForLesson` đọc `lessons.creation_fingerprint` (`starter:<id>`), `summarizeLessonContent` đếm slide/câu/hình (hình từ vựng, hình slide tiêu đề, slide hình). `loadStarterRefresh` và `replaceDraftWithStarter` (`lib/server/lessons.ts`) giữ metadata của giáo viên, ghi nội dung mẫu bằng cùng UPDATE có điều kiện revision như lưu nháp; trùng revision cũ trả conflict. Trang `app/teach/lessons/[id]/starter/page.tsx` với `refreshFromStarterAction` chuyển về editor sau khi thay; bản sao nháp trong trình duyệt dựa trên revision cũ bị bỏ khi editor mở lại.

### Trang theo dõi lớp với dữ liệu lớn — 02/11/2026

Lớp ôn 60 câu/ngày có một học viên làm mục "Câu cả lớp sai nhiều" liệt kê mọi câu sai của mọi bài (mỗi câu sai của người duy nhất là 100%), dài hàng nghìn pixel. `components/teach/hard-question-list.tsx` hiện mỗi bài giao là một `<details>`, bài mới nhất mở sẵn, tiêu đề có số câu và dấu ▸/▾; mỗi câu một dòng lưới đề bài + "sai/đã nộp", phần "học viên sai" chỉ dành cho trình đọc màn hình. "Bài đã giao" hiện 5 bài mới nhất, bài cũ hơn trong `<details>` "Bài cũ hơn (N)". Không đổi RPC thống kê hay quy tắc 50%.

Ô số câu luyện hằng ngày: `DAILY_PRACTICE_SIZES` thêm 20/30/40; `dailyPracticeSizeOptions` luôn thêm số câu đang dùng nếu ngoài danh sách (lớp ôn N4 đặt 40 câu lúc nhập), và action nhận mọi số nguyên 3–60 như ràng buộc database. React đặt lại form sau khi action xong, mà `<select>` chỉ nhận giá trị mặc định mới khi được tạo lại, nên ô số câu, ô Lấy câu từ và ô ngôn ngữ ở cài đặt lớp có `key` theo giá trị đã lưu; trước đây sau khi Lưu ô quay về giá trị cũ, lần Lưu sau có thể tắt bài luyện.

### Lọc câu trả lời và bố cục danh sách — 02/11/2026

`lib/answer-outcome.ts` (`parseAnswerOutcome`, `matchesOutcome`, `numberAnswers`, `countOutcomes`, `outcomeHref`) và `components/ui/outcome-filter.tsx` (liên kết, `scroll={false}`, `prefetch={false}`) dùng cho `app/assignments/[id]/results/page.tsx` và `app/teach/classes/[id]/students/[uid]/page.tsx`; giá trị lạ hoặc lặp coi như không lọc. Kiểu nút lọc của trang lịch sử chuyển thành lớp dùng chung `.filter-pills`/`.filter-pill-count` trong `app/globals.css`. `.collapse-card` (summary dạng hàng có dấu ▸/▾ và số bên phải) dùng cho nhóm câu sai ở trang lớp và nhóm bài ở trang học viên. Thẻ `.result-row` giãn dòng 1,6, nhãn `.result-row-meta`. `.site-header nav` cho cả mục xuống hàng (`flex-wrap`, `white-space: nowrap`), ở màn hẹp căn trái với khoảng cách 18px. Dữ liệu dựng lại (6 bài, 254 câu trả lời): trang học viên từ khoảng 37.000px còn 3.400px ở 1280px.

### Dễ dùng và dạy online — 02/11/2026

Chỉ đổi giao diện và API đọc; không có migration, RPC hay thay đổi quyền. Báo cáo: [rà soát 02/11](../testing/user-flow-review-2026-11-02.md).

- **Header.** `components/account-summary.ts` (`useAccountSummary`) tải `/api/me` sau hydration như trước: `undefined` khi đang tải, `null` cho khách. Từ 03/11/2026, trình duyệt nhớ đã có người đăng nhập (`localStorage["reng-signed-in"]`, `lib/account-hint.ts`). Một script inline trong `<head>` của `app/layout.tsx` đặt `html[data-account="member"]` trước lần vẽ đầu (`<html suppressHydrationWarning>`). Trong lúc chờ `/api/me`, CSS ẩn hai link chỉ dành cho khách (`data-guest-only`), nên người đã đăng nhập không còn thấy menu khách nháy qua. Kết quả `/api/me` ghi lại hoặc xóa gợi ý này; đăng xuất xóa nó. Không dùng `next/script` `beforeInteractive`: App Router đưa script đó vào hàng đợi chạy khi JS của Next đã tải, tức là sau lần vẽ đầu. `/api/me` trả `name`, `role`, `isAdmin`. Trường `hasLearningHistory` cho link Lịch sử Sheet đã bỏ ngày 04/11/2026, cùng trang `/history`; `next.config.ts` chuyển `/history` và `/history/:path*` về `/progress`. `components/site-header.tsx` dựng danh sách theo vai (khách: Vào lớp, Cho giáo viên; đã đăng nhập: Quản trị, Giảng dạy, Lớp của tôi, Lịch sử Sheet nếu có), rồi nhóm tự học và Hướng dẫn. Dưới 600px nav có `data-open`: nút Menu (`aria-expanded`, `aria-controls`) mở/đóng; trạng thái mở gắn với `pathname` nên chuyển trang tự đóng; Escape đóng và trả focus về nút. `.header-shortcut` là trang chính theo vai.
- **Ngôn ngữ hiển thị.** `lib/assignment.ts`: `INPUT_LANGS` (dùng chung với `AnswerInput`), `answerLang(view)` theo `inputMode` (câu chọn theo `view.lang`), `classQuestionLang(languageTag)` cho `HardQuestionList`. Trang kết quả, sổ lỗi, trang học viên phía giáo viên và phản hồi khi làm bài dùng các hàm này thay cho `lang="ja"` cố định.
- **Pinyin số thanh.** `lib/pinyin-input.ts`: `convertPinyinBeforeCaret` đổi cụm chữ ngay trước con trỏ khi vừa gõ số 0–5; `addToneMark` đặt dấu trên a/e, rồi o của "ou", còn lại nguyên âm cuối của nhóm nguyên âm cuối; nhóm đã có dấu giữ nguyên; `v` thành `ü`; 5/0 bỏ số. Chỉ áp dụng cho `inputMode: "pinyin"`.
- **Làm bài.** `components/classroom/question-map.tsx` (từ 6 câu, `<details>` gập, trạng thái blank/answered/correct/wrong, `aria-current="step"`, chọn xong tự gập). `AttemptRunner.handleMove(index, focus)` dùng `flushSync` để thẻ câu hiện trước khi nhận focus (thẻ `tabIndex=-1` khi nhảy, ô nhập khi Enter). `AnswerInput.onEnter` bỏ qua Enter khi `isComposing`, hoàn tất romaji trước; Enter trên thẻ đã khóa sang câu sau; câu cuối không mở hộp nộp. Sau khi nộp bài luyện tập, nếu đáp án trên trang chấm ra sai thì chuyển tới `?outcome=wrong`; bài kiểm tra không có đáp án trên trang nên giữ URL cũ.
- **Trang học viên.** `app/classes/page.tsx` thêm nút Làm bài/Làm tiếp (`.item-actions` giữ badge không giãn), mục Ôn lại và tiến độ, tên lớp khi học nhiều lớp (link Sheet theo `hasLearningHistory` đã gỡ ngày 04/11/2026). `app/classes/[id]/page.tsx` tách bài cần làm/bài khác (5 + `details`). `HomeAgenda` đặt trước phần giới thiệu, ẩn khi không có bài và thẻ. `app/progress/page.tsx` bỏ nút Sheet ở đầu, gập bài sau 5.
- **Buổi dạy.** `components/teach/teaching-panel.tsx` (không có ở lớp tự học): buổi gần nhất, Mở Google Meet hoặc Thêm link (`#class-settings`), Trình chiếu tiếp từ slide của buổi gần nhất hoặc Chọn bài để trình chiếu (`#class-content`). `slidePresenterPath(lessonId, versionId, slide, classId?)` thêm `&class=`; `app/lessons/[id]/slide/page.tsx` chỉ nhận UUID và truyền `classId` cho `SlideDeck`, nơi hiện "Ghi buổi dạy (slide N)" tới `sessionLogPath()`. Trang lớp đọc `?lesson=&slide=` qua `parseSessionPrefill` (chỉ bài thuộc lớp, slide 1–500) và remount `ClassSessionForm` theo giá trị điền sẵn.

### Đa dạng dạng bài và đoạn văn đọc hiểu — 03/11/2026

Không có migration: `assignment_items` đã cho phép `order`, `publish_assignment` chép nguyên câu hỏi vào snapshot. Báo cáo: [ngân hàng N4](../testing/n4-review-bank.md#đa-dạng-dạng-bài--03112026).

- **Câu sắp xếp (`order`).** `lib/assignment.ts` cho giao `order` (câu phải dùng mỗi mảnh đúng một lần). `toQuestionView` gửi mảnh theo thứ tự xáo cố định theo mã câu (`shuffleOrderTokens`, không bao giờ trùng đáp án). `parseViewAnswer` dùng `parseTokenOrder`. `describeCorrectAnswer`/`describeRawAnswer` ghép chữ (`joinOrderTokens`: tiếng Nhật/Trung không cách, chữ Latin có cách). `toStoredRawAnswer` nhận danh sách mã mảnh. `components/classroom/order-field.tsx`: bấm mảnh để xếp, bấm mảnh đã xếp để bỏ, "Xếp lại từ đầu", vùng `aria-live` đọc câu đang xếp. `match` vẫn chưa giao được.
- **Đoạn văn.** `questionBase.passage` (tùy chọn) trong `lib/lesson-schema.ts`, đi vào view. `QuestionField` hiện khung `.question-passage` trên đề; trang kết quả, sổ lỗi và trang học viên hiện "Xem đoạn văn" gập (`PassageDetails`). Đề và legend giữ xuống dòng (`white-space: pre-line`), nên câu cũ viết đoạn văn trong đề cũng tách dòng.
- **Nhãn phần.** `questionSection(tags)` đặt `section` cho view từ các tag `kanji`, `writing`, `vocabulary`, `forms`, `particles`, `grammar`, `paraphrase`, `sentence-order`, `reading`; dòng đầu câu hiện "Câu n / N · Đọc hiểu".
- **Bài hằng ngày.** `DAILY_QUESTION_TYPES` = choice, fill, order. `DailyCandidate.group` = đoạn văn: câu cùng nhóm dùng chung hash nên được chọn liền nhau, câu được chọn của một nhóm hiện liền và theo thứ tự trong bài.
- **Giới hạn editor.** `MAX_QUESTIONS` = 400 trong `lib/lesson-draft.ts` (ngân hàng ôn vài trăm câu; vẫn chặn bởi 512KB), dùng chung cho bộ tạo câu kanji. Từ 03/11/2026 câu `order` và đoạn văn `passage` soạn được trên cả hai trình soạn, xem mục bên dưới.
- **Đưa ngân hàng lên phiên bản mới.** `npm run bank:sql -- --file <bank.json> --out <file.sql> [--commit]` viết một transaction: khóa bài, gọi `publish_lesson` với `draft_revision` hiện tại (bỏ qua khi phiên bản mới nhất đã có đúng nội dung), rồi `upsert_class_lesson` cho mọi lớp của chủ bài đang dùng bài đó, giữ thứ tự và giờ mở; cuối file đọc lại phiên bản và lớp. Không có `--commit` thì kết thúc bằng `ROLLBACK`. Chạy bằng `npx supabase db query --linked --file <file.sql>` sau khi code mới đã deploy (code cũ không đọc được `passage`/`order`).

### Bài tập dùng chung cho tiếng Nhật và tiếng Trung — 03/11/2026

Rà soát luồng làm bài của học viên tìm các chỗ gắn cứng tiếng Nhật: [báo cáo](../testing/exercise-languages-2026-11-03.md).

- `components/classroom/answer-input.tsx` (`AnswerInput`, trước là `JapaneseInput`) là ô nhập chung. Câu nghe dạng điền theo ngôn ngữ câu: tiếng Nhật `japanese`, tiếng Trung `chinese` (không đổi romaji thành kana). `AnswerFeedback` nhận `transcriptLang`; phản hồi ôn tập dùng `answerLang`.
- `questionSection` có thêm tag tiếng Trung (`hanzi`, `pinyin`, `tones`, `meaning`, `measure-words`, `listening`). Tag trùng một nhãn tiếng Việt cũng thành nhãn, nên câu "Từ vựng" của trình soạn tiếng Trung có nhãn phần.
- `lib/kanji-practice.ts`: `KanjiWord.lang` (`ja`, `zh-Hans`, `zh-Hant`), `extractHanziWords` từ từ vựng bài v2, `normalizePinyin`. `isCorrectReading` chọn chuẩn hóa theo ngôn ngữ. `components/kanji/kanji-practice.tsx` lấy tên, nhãn ô, `inputMode` và `lang` từ `SCRIPT_SETTINGS`. `/kanji/[lessonId]` phục vụ cả bài v2; `TeachingReader` và trang lớp tiếng Trung có link "Luyện chữ Hán".
- `ClassSessionForm.languageTag` chọn ví dụ ghi chú theo ngôn ngữ lớp.
- `lib/review-bank.ts`: `findBankLanguageProblems(content, language)`. Bank tiếng Trung: mọi câu phải có `zh-exact-v1` và `vocab` trống. Bank tiếng Nhật: không có profile hoặc ô nhập tiếng Trung. `npm run bank:sql` nhận `--language` (mặc định `ja-JP`) và dừng khi bank không khớp.

### Độ đúng dữ liệu học tập — 03/11/2026

Sửa các lỗi còn mở trong rà soát hiện trạng 02/11: [báo cáo](../testing/data-correctness-2026-11-03.md). Phần ôn tập và flashcard ghi ở [DD giai đoạn 3](phase-3.md#ôn-tập).

- **ID mục.** `createUniqueId(prefix, usedIds)` trong `lib/item-ids.ts` dùng chung cho `createItemId` (trình soạn v1) và `createTeachingId` (trình soạn tiếng Trung v2): tiền tố + 6 ký tự ngẫu nhiên, không trùng ID đang có trong bài. ID của mục đã xóa không bị cấp lại, nên thẻ ôn gắn theo bài + ID không chuyển sang từ khác. Script dùng ID của nháp phải đọc ID trong nội dung, không đoán `vocab-1`.
- **Cảnh báo lặp bài hằng ngày.** `repeatsEveryDay(số câu, số câu/ngày)` đúng khi số câu ≤ số câu mỗi ngày. Trường hợp bằng nhau cũng lặp toàn bộ mỗi ngày.

- **Danh sách ID dài (03/11/2026).** Bộ lọc `in` của PostgREST nằm trong URL. Khoảng 200 UUID đã vượt giới hạn URL của gateway, nên trang Giáo viên của quản trị lỗi `database_error` khi stack E2E có 231 giáo viên. Lớp có bài hằng ngày cũng thêm một bài giao mỗi ngày. `selectRowsIn` (`lib/server/supabase.ts`) đọc theo lô 100 ID rồi gộp kết quả; nơi cần thứ tự thì sắp xếp lại sau khi gộp. Dùng cho trang Giáo viên của quản trị, `listUserAttempts` (mọi bài giao của lớp), báo cáo lớp và sổ lỗi.

### Giáo viên chấp nhận đáp án tương đương — 03/11/2026

Migration `202611030001_accept_answer_variants.sql`. Luồng và quy tắc ở [bài tập và chấm điểm](../07-exercises-and-grading.md#giáo-viên-chấp-nhận-đáp-án-tương-đương-migration-202611030001).

- `lib/answer-variants.ts`: `isTypedQuestion`, `toAcceptedVariant`, `findRegradedSubmissions` (chấm lại bằng `gradeQuestion` với đáp án mới). `lib/server/answer-variants.ts`: kiểm tra lớp của giáo viên và bài giao thuộc lớp, đọc câu trả lời từ database, chọn lượt nộp được chấm lại rồi gọi RPC.
- `acceptAnswerAction` (`app/actions/classes.ts`) và `AcceptAnswerForm`. Thông báo kết quả nằm ở `AcceptNoticeArea` cấp section, dính cuối màn hình. Lý do: câu vừa được chấp nhận thành đúng nên form của nó rời trang, và cả rời bộ lọc "Sai".
- Phải chạy migration trước khi deploy code. Trước khi có migration, nút này lỗi; các phần khác không phụ thuộc migration.

### Soạn câu sắp xếp và đọc hiểu trong trình soạn — 03/11/2026

Rà soát luồng soạn → giao → làm bài → slide: [báo cáo](../testing/question-authoring-2026-11-03.md).

- **Quy tắc chung** (`lib/order-pieces.ts`): giáo viên ghi các mảnh theo đúng thứ tự câu, mỗi dòng một mảnh. `toOrderTokens` tạo `tokens`/`answer`; mã mảnh ngẫu nhiên (`createUniqueId("p")`) vì mã đi tới trình duyệt học viên, mã theo thứ tự câu sẽ lộ đáp án. `describeOrderPiecesProblem`: 2–10 mảnh, mỗi mảnh ≤ 60 ký tự, không trùng nhau (chấm theo mảnh, hai mảnh giống nhau học viên không phân biệt được); dòng trống bị bỏ qua. Đoạn văn tối đa 2.000 ký tự. Hợp đồng bài đã xuất bản (`lesson-schema`) giữ giới hạn cũ nên ngân hàng ôn có sẵn vẫn đọc được.
- **Trình soạn web (v1) và câu kiểm tra riêng** dùng chung `TestQuestionEditor`: dạng `order` (`OrderPiecesField`, hiện "Câu đúng: …" để giáo viên xem cách ghép), ô "Đoạn văn đọc hiểu" mở bằng nút, nút "Thêm câu hỏi cho đoạn văn này" chèn câu trắc nghiệm cùng đoạn văn ngay sau câu đang sửa (`addQuestion.afterId`). `lib/editor-questions.ts` chuyển câu nháp ↔ form: giữ `passage`, `tags` và `gradingProfile`. Câu điền đổi ô nhập sang chữ Hán/pinyin nhận `zh-exact-v1`, sang ô tiếng Nhật thì bỏ profile, như câu kiểm tra (CR-28). Nháp v1 giữ dòng trống khi đang gõ; `toPublishableContent` bỏ mảnh trống và đoạn văn trống.
- **Câu kiểm tra riêng**: `testQuestionInputSchema` có `order` và `passage`; `toTestQuestions` parse lại đầu vào ở server vì server action nhận dữ liệu từ trình duyệt (trước đây chỉ schema câu chung chặn, không áp giới hạn của form).
- **Trình soạn tiếng Trung (v2)**: nháp có `order` và `passage`. Bài v2 xuất bản đúng nháp đã lưu nên nháp không chứa mảnh trống (`OrderQuestionPieces` giữ dòng đang gõ trong ô, nháp chỉ nhận mảnh có chữ) và schema bỏ đoạn văn chỉ có khoảng trắng (`z.preprocess`). Dấu xác nhận đáp án so `stableJson` sâu: replacer theo khóa cấp đầu trước đây bỏ qua chữ trong mảnh nên sửa mảnh vẫn hiện "Đã xác nhận" trong khi server từ chối xuất bản.
- **Giới hạn và kế hoạch slide (CR-26, CR-25)**: dán bảng từ dừng ở `MAX_TEACHING_VOCAB` = 100 (dòng vượt bị báo, reducer cũng dừng ở 100). Kế hoạch slide nhớ `content` nó được dựng từ; `currentSlidePlan` bỏ kế hoạch khi nội dung đã đổi, nên Áp dụng không ghi đè chỉnh sửa làm sau đó.
- **Học viên**: `toPublicQuestion` gửi `passage` và `pieces` (chữ của mảnh theo thứ tự xáo cố định, không có mã). Slide câu luyện hiện đoạn văn và các mảnh; "Hiện đáp án" (`/api/lessons/[id]/questions/[questionId]`) trả câu ghép đúng qua `describeCorrectAnswer`. Xem trước trong trình soạn v2 dùng chung `toPublicQuestion`. Slide bài v1 vẫn chỉ tham chiếu câu trắc nghiệm/điền (`isQuizQuestion`).

## Rà soát giao diện — 04/11/2026

- `components/classroom/attempt-runner.tsx`: khối `.question-next` (chỉ hiện dưới 600px) sau phản hồi của câu đã kiểm tra: Câu sau › gọi `handleMove(index + 1, "card")`, câu cuối mở hộp nộp bài. `handleMove` không có đích focus vẫn cuộn tới thẻ (`block: "start"` khi đầu thẻ ở trên màn hình).
- `app/assignments/[id]/page.tsx`: đã nộp thì Xem kết quả (`buttonVariants()`) + `StartAttemptButton variant="outline"` (prop mới). Trang kết quả: `isAccepting` = `published` và `getDeadlineState` khác `past_due`; khối `actions` dựng một lần, đặt dưới điểm (hoặc cuối trang khi chưa có điểm).
- `AuthFormState.values` và `ActionState.values` (`app/actions/auth.ts`, `app/actions/classes.ts`): `signIn`/`signUp` bọc hàm cũ và trả lại email/họ tên, `joinClassAction` trả lại mã đã gõ. Ô nhập dùng `key` + `defaultValue` theo giá trị trả về, vì React đặt lại form sau action.
- `lessonNotFound(path)` (`lib/server/lesson-access.ts`): nguồn database và chưa đăng nhập thì `redirect(signInPath(path))`, còn lại `notFound()`. Các trang bài, slide, flashcard, kanji, nghe `return lessonNotFound(...)` để kiểu được thu hẹp.
- `TodayClass.meetingUrl` (từ `listStudentClasses`), `TodayItem` buổi học có `meetingUrl`; `toTodayRows` trả `actionHref` + `isExternal` cho buổi đang diễn ra có link Meet; `TodayRows` vẽ `<a target="_blank">`; schema ở `home-agenda.tsx` thêm hai trường tùy chọn.
- `formatDecimal`/`formatPercent` (`lib/grading/grade.ts`) dùng `Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 })`; CSV vẫn dùng `formatPercentValue`.
- Trình chiếu: link Ghi buổi dạy là `<a target="_blank" rel="noopener">`; `slidePresenterPath` cho Quay lại trình chiếu và Mở trình chiếu; `classQuery` thêm vào mọi link Presenter; `PresenterView` nhận `classId`, nghe `keydown` (ArrowRight/ArrowDown/PageDown/phím cách ngoài nút → next, ArrowLeft/ArrowUp/PageUp → prev) qua `BroadcastChannel`, ẩn link đăng nhập khi đã tải ghi chú. `SlideDeck` có `canPresent` (trang slide truyền `account?.role !== "student"`) và `scrollActivationWidth: 0`.
- Giao bài: `.question-pick-actions` (Chọn tất cả theo thứ tự câu của bài, Bỏ chọn, đếm `aria-live`). `publishAssignmentAction` nhận ID bài mới và chuyển tới `?assigned=<id>#assignments-title`; trang lớp tìm bài trong `report.assignments` để hiện thông báo.
- `normalizeMeetingUrl` (`lib/class-settings.ts`): `^(?:https://)?meet.google.com/<mã>/?(?:[?#].*)?$` không phân biệt hoa thường → `https://meet.google.com/<mã thường>`; `http://`, tên miền khác và `user@` vẫn bị từ chối. `describeError` báo riêng lỗi ô `meetingUrl`.
- Xác nhận: `JoinCodeControls` bọc `joinCodeAction` để đóng hộp hỏi sau khi xong; `DeleteSessionButton` theo mẫu `RemoveStudentButton`.
- `app/teach/lessons/new/page.tsx` dùng `findStarterForLesson(creationFingerprint)` để chỉ ra bài mẫu đã tạo.
- `app/lessons/error.tsx` dùng `retry` (Next 16: `reset` chỉ xóa trạng thái lỗi). `GrammarSearch` vẽ mẫu câu và giải thích bằng `JapaneseText`. `QuestionMap` thêm `.question-map-mark` ✓/✗. `FlashcardDeck` giữ `ratedIds` và dừng ở màn hình Xong bộ thẻ.
- `scripts/audit-layout.ts`: bỏ qua cặp chữ khi một bên là `<rt>` nằm trên dòng kia, và khi một bên thuộc `<ruby>` khác với độ chồng ngang dưới 1/4 bề rộng khung ruby.
- **Đợt 2.**
  - `selectEveryPageIn` (`lib/server/supabase.ts`): chia nhóm 100 ID như `selectRowsIn`, mỗi nhóm đọc từng trang 1000 dòng (truy vấn phải có `order`). Dùng cho bài nộp trong `getClassReport` (theo `id`) và câu sai trong `listMistakes` (theo `submission_id`, `question_id`).
  - `getClassReport` chỉ gọi `assignment_question_stats` cho `HARD_QUESTION_ASSIGNMENTS = 10` bài mới nhất có bài nộp của học viên và trả `olderStatsCount`. Mỗi bài có `missing` từ `listMissingLearners` (`lib/class-report.ts`).
  - `listDailyAssignmentIds` chuyển sang `lib/server/daily-history.ts`. `TeacherTodayAssignment.isDaily` loại bài hằng ngày khỏi "hạn hôm nay". `getStudentClassView` trả `dailyAssignmentIds`. `foldMissedDailySets` (`lib/learner-today.ts`) dùng `isStaleDailySet`. `describeOpenDue` (`components/classroom/assignment-labels.tsx`) ghi việc quá hạn còn nhận.
  - `LinkPending` (`components/ui/link-pending.tsx`) dùng `useLinkStatus`, luôn vẽ và đặt tuyệt đối trong link (`a:has(> .link-pending)`), hiện sau 0,15 giây, tắt quay khi người dùng chọn giảm chuyển động. Không dùng `loading.tsx` vì trang riêng phải trả 404 thật.
  - Header thêm `ACCOUNT_LINK` (`/settings/account`, kèm `/settings/notifications`). Trang Tài khoản có `SignOutButton`.
  - `LessonReader`/`TeachingReader` nhận `classId` (trang đọc lấy từ `?class=`, kiểm tra UUID). `SlideDeck` nhận `readProgress` (chỉ học viên, nguồn database) và vẽ `LessonProgressButton` ở slide cuối; link Ghi buổi dạy cần `canPresent`.
  - `TeachingPanel.currentVersionId` lấy từ `report.lessons`. `StartChecklist` nhận `title`; trang lớp dựng 5 bước và chỉ hiện khi thiếu bài, học viên hoặc bài tập.
  - `describeTimeLeft` (`lib/assignment.ts`, `COUNTDOWN_WINDOW_MS` 1 giờ, `COUNTDOWN_URGENT_MS` 10 phút, `AUTO_SUBMIT_LEAD_MS` 1 phút) và `DeadlineCountdown` (`components/classroom/deadline-countdown.tsx`, `role="timer"`). `AttemptRunner` nhận `dueAt`/`allowLate` và gọi `handleSubmit` một lần khi `shouldAutoSubmit`. Máy chủ (`check_open_attempt`) vẫn từ chối bài đến sau hạn khi không cho nộp muộn.
  - `app/mistakes/page.tsx`: `groupByAssignment`, tham số `filter=due`, nhóm `details.mistake-group`, Đã giải quyết trong `details`.
  - `202611040001_remove_and_archive_lessons.sql`: `remove_class_lesson(teacher, class, lesson)` (khóa dòng lớp của chủ lớp, trả `not_in_class`/`has_assignments`/`removed`; bỏ `daily_practice_lesson_id`, đặt `lesson_id`, `lesson_version_id`, `slide_reached` của `class_sessions` về null, xóa `class_lessons`; cấp `update` ba cột đó của `class_sessions` cho service role) và `set_lesson_archived(teacher, lesson, archived)` (chủ bài là giáo viên; `in_class` khi còn trong lớp đang hoạt động, `quota_exceeded` khi đưa trở lại vượt 2000 bài, còn lại `archived`/`restored`). Chỉ service role được gọi. Code: `removeClassLesson`, `setLessonArchived`, `listArchivedLessons` (`lib/server/lesson-usage.ts`), `removeClassLessonAction`, `archiveLessonAction` (`app/actions/classes.ts`), `RemoveClassLessonButton`, `ArchiveLessonButton` (`components/teach/`).
  - `getLessonUsage` lọc lớp theo `lessonLanguage` của bài (`loadOwnedLessonLanguage`); `ClassLessonForm` lọc bài theo `classLanguageTag`, giữ bài đã có trong lớp.
  - `typedValues` trong `app/actions/classes.ts` trả lại ô đã gõ cho form lớp và nhật ký (form remount bằng `key`). `dailyPracticeAction` thao tác `today` lưu số câu/bài nguồn trước khi gọi `createTodayPractice`.

## Lịch sử bài tập hằng ngày — 04/11/2026

- `lib/daily-history.ts` (thuần, `tests/daily-history.test.ts`):
  - `buildDailyDays(runs, results, fromDay, untilDay)` ghép `daily_practice_runs` với kết quả của người xem, cũ trước. Bỏ ngày sau `untilDay` (hôm nay, hoặc ngày rời lớp), bỏ ngày trước khi vào lớp nếu không có lượt làm, bỏ run không còn bài.
  - `scoreBand` (good ≥ `SCORE_TARGET_PERCENT = 80`, fair ≥ 60, low, none), `dailyDayState` (scored, submitted, in_progress, not_done), `shortDayLabel`/`fullDayLabel` cho ô ngày và nhãn đọc màn hình.
  - `dailyOverview(days, today)`: số ngày, số ngày đã nộp, trung bình các ngày có điểm, số ngày đạt mốc, ngày có điểm mới nhất so với trung bình tối đa `BASELINE_DAYS = 5` ngày có điểm trước đó, chuỗi ngày đã nộp liên tiếp (bỏ qua bài hôm nay chưa nộp). `describeDelta` làm tròn điểm % và dùng dấu trừ thật.
  - `groupDaysByMonth` (tháng và ngày mới nhất trước), `pickDailyDay` (ngày yêu cầu, không có thì ngày mới nhất), `neighbourDays`.
- `lib/server/daily-history.ts`:
  - `listDailyRuns(classId)` đọc `daily_practice_runs` theo `practice_date` từng trang 1000 dòng (`selectEveryPage`, chuyển từ `lib/server/learner.ts` sang `lib/server/supabase.ts` để dùng chung).
  - `getLearnerDailyHistory(userId, classId, now)`: `requireMembership` (lấy `joined_at`), rồi `listAssignmentsByIds` (mới, đọc theo lô 100 ID) và `listUserAttempts`. Điểm là lượt nộp mới nhất, chỉ khi `isFeedbackAvailable`.
  - `findDailyRunDate(assignmentId)` (ID không phải UUID trả null) cho nút ở trang kết quả; `hasDailyRuns(classId)` cho nút ở trang lớp.
- `getStudentDetail` (`lib/server/reports.ts`) trả thêm `dailyDays`, dựng từ các dòng bài đã có (giáo viên thấy điểm ngay), giới hạn từ `joined_at` tới `left_at` hoặc hôm nay.
- Component (`components/daily-history/`): `DailyStatTiles`, `DailyScoreChart` (dùng `ScoreColumnChart`, `CHART_DAYS = 30`), `DailyDayChips` (chú thích màu, ô `.day-chip` có `aria-current="date"`, tên đọc màn hình gồm ngày đầy đủ và kết quả). CSS ở `app/charts.css` (`.band-legend`, `.day-chips`, `.day-chip`, `.day-figures`, `.day-heading`, `.day-steps`).
- `app/classes/[id]/daily-practice/page.tsx`: tham số `day` (YYYY-MM-DD, sai hoặc thiếu thì lấy ngày mới nhất) và `outcome`. Ngày đã chọn dùng `getStudentResults`, nên điểm và đáp án qua cùng cổng `isFeedbackAvailable` như trang kết quả. Link ô ngày và cột có `#daily-day`.
- `components/classroom/result-row.tsx` (`ResultRow`) tách từ trang kết quả để trang kết quả và trang ngày dùng chung. `outcomeHref` nối `&outcome=` khi đường dẫn đã có query.
- Trang giáo viên `app/teach/classes/[id]/students/[uid]/page.tsx`: tham số `day`; link ngày là `?day=…#assignment-<id>`, mỗi `details.student-assignment` có `id` tương ứng và bài của ngày được chọn mở sẵn khi không lọc Đúng/Sai.

## Hôm nay học gì — 03/11/2026

- `lib/learner-today.ts` (thuần, `tests/learner-today.test.ts`):
  - `buildTodayPlan(input, now)` trả `{ items, moreAssignmentCount }`.
  - Buổi học: `findNextSession` của lớp không tự học, giữ buổi cùng ngày Việt Nam.
  - Bài tập: đang làm, hạn trước 00:00 ngày mai, quá hạn còn nhận. Bỏ bài hằng ngày đã quá hạn nếu chưa làm. Tối đa `MAX_TODAY_ASSIGNMENTS = 3`.
  - Bài mới: chưa đọc, mở trong `NEW_LESSON_DAYS = 7`; lớp tự học chỉ lấy bài chưa đọc có `order_no` nhỏ nhất. Tối đa `MAX_TODAY_LESSONS = 3`.
  - Thẻ ôn đến hạn ở cuối.
  - `toTodayRows` dựng dòng hiển thị (nhãn, link, dòng phụ, nút). `describeTodayAssignment` và `describeLessonOpened` viết hạn và ngày mở theo giờ Việt Nam.
- `getLearnerAgenda` (`lib/server/learner.ts`) trả thêm:
  - `openLessons`: bài đã mở của mỗi lớp.
  - `readLessonIds`: `lesson_progress.read_completed_at` khác null, ở bất kỳ phiên bản nào.
  - `dailyAssignmentIds`: bài có trong `daily_practice_runs`.
  - Hai truy vấn này đọc theo lô bằng `selectRowsIn`; danh sách rỗng thì không gọi.
- `planLearnerToday(agenda, now)` (`lib/server/learner-today.ts`) đọc lịch lớp và dựng kế hoạch. `app/classes/page.tsx` (`TodayPlan`) và `GET /api/me/agenda` cùng dùng hàm này, nên hai nơi không lệch nhau. API trả `{ agenda: { rows, moreAssignmentCount } }`; `components/classroom/home-agenda.tsx` hiện 4 dòng đầu. `components/classroom/today-rows.tsx` là phần hiển thị chung.
- Hàm phụ: `describeSessionTime` (`lib/class-schedule.ts`) và `formatStudyTime` (`lib/study-days.ts`).
- `requireTeacher` (`lib/server/account.ts`) chuyển người không phải giáo viên tới `/teach/start`. Phép kiểm tra vai trò chạy trước mọi truy vấn, nên không lộ ID lớp hay bài.

## Luồng giáo viên rõ hơn — 03/11/2026

- `lib/teaching-start.ts` (thuần, `tests/teaching-start.test.ts`): `classLessonState` (latest/older/missing so với phiên bản đang xuất bản), `buildStartSteps` (7 bước với link), `showsStartSteps` (ẩn khi xong hết, hoặc lớp dạy đã có học viên và bài tập).
- `lib/server/lesson-usage.ts`: `getLessonUsage` (bài thuộc giáo viên, phiên bản đang xuất bản, lớp đang hoạt động kèm phiên bản lớp dùng, đọc theo lô). `pinLatestVersion` (kiểm tra chủ lớp, rồi `upsert_class_lesson` với phiên bản đang xuất bản; bài đã có trong lớp giữ `order_no`/`available_at`, bài mới lấy thứ tự lớn nhất + 1 và mở ngay). `getClassProgressFlags(classIds)` lọc theo danh sách lớp, không nhúng `classes`, vì `classes` và `class_lessons` có hai khóa ngoại (bài của lớp và nguồn luyện hằng ngày) nên nhúng sẽ lỗi.
- `pinLatestVersionAction` (`app/actions/classes.ts`). `components/teach/lesson-class-usage.tsx` (Server Component, đặt trên trình soạn ở `app/teach/lessons/[id]/edit/page.tsx`), `pin-version-button.tsx` và `usage-notice.tsx`. Lớp vừa cập nhật mất nút và đổi chỗ trong danh sách, nên thông báo đi qua context lên cấp cả mục. Sau khi xuất bản, `TeachingEditor` gọi `router.refresh()` như `LessonEditor` để mục này thấy phiên bản mới.
- `components/teach/start-checklist.tsx` và `app/teach/page.tsx` (tiến độ tính từ lớp, bài, lịch học và `getClassProgressFlags`).
- `lib/question-kinds.ts` (thuần, `tests/question-kinds.test.ts`): `questionKind(type, hasPassage)` (có đoạn văn → đọc hiểu, `listen`/`dictation` → nghe), `summarizeQuestionKinds` (thứ tự cố định, phần trăm làm tròn), `weakestKind` (cần ít nhất hai dạng có từ `MIN_KIND_ANSWERS = 5` câu, và các dạng không bằng nhau). `getQuestionKindStats(userId, now)` trong `lib/server/learner.ts`: lấy 100 lượt nộp mới nhất, giữ lượt mà `isFeedbackAvailable` cho phép, rồi đọc `answers` và `assignment_items` (`question_snapshot->>type`, `->>passage`) theo lô 10. Mỗi lô đọc từng trang 1000 dòng, vì `[api] max_rows = 1000` sẽ cắt kết quả dài mà không báo. `app/progress/page.tsx` hiện bảng `data-table` có `data-label` cho điện thoại.
- `lib/teacher-today.ts` (thuần, `tests/teacher-today.test.ts`): `buildTeacherToday` dựng các dòng `TodayRow` (dùng chung `components/classroom/today-rows.tsx` với Hôm nay học gì). Thứ tự: buổi hôm nay (`findNextSession` cùng ngày Việt Nam), bài hạn hôm nay chưa qua giờ, rồi lớp có bài nộp. Mỗi nhóm tối đa `MAX_TEACHER_TODAY_ROWS = 5`; `moreCount` đếm phần bị ẩn. Chỉ buổi đang diễn ra là `isAction` (nút chính), vì đầu trang đã có nút Tạo lớp. `lib/server/teacher-today.ts`: `loadTeacherTodayActivity(classIds, now)` đọc bài tập của các lớp dạy, rồi đếm bài nộp (`status = submitted`, 24 giờ qua) theo lớp bằng `selectRowsIn`. `app/teach/page.tsx` gọi hàm này song song với lịch học và cờ tiến độ, rồi hiện `TeacherTodayPanel`.
- Bộ lọc bài trên trang Giảng dạy nằm trong `<details className="help-disclosure lesson-filter">`. Mục này mở sẵn khi đang có bộ lọc hoặc khi có hơn 6 bài (`OPEN_FILTER_LESSONS`). Dòng "Hiển thị x / y bài học" chỉ hiện khi mục đang mở; không có bài thì không có bộ lọc.

## Lịch học hằng tuần — 03/11/2026

- `202611030002_class_schedules.sql`: bảng `class_schedules` (`class_id` khóa chính và khóa ngoại tới `classes`, `slots` jsonb là mảng tối đa 14 phần tử, `note` ≤ 300 ký tự, `updated_at`). RLS bật, không cấp quyền cho anon/authenticated; service role đọc/thêm/sửa. Kiểm tra ở `tests/class-schedule-migration.test.ts`.
- `lib/class-schedule.ts`: `scheduleSlotSchema` (`weekday` 1–7 theo ISO, `start` HH:MM, `minutes` 15–300), `classScheduleSchema`, `normalizeSlots` (Thứ Hai trước, theo giờ, bỏ trùng), `describeSlot`, `findNextSession` (giờ Việt Nam cố định UTC+7; buổi sớm nhất chưa kết thúc, `isLive` khi đang trong giờ), `describeNextSession` (Hôm nay / Ngày mai / thứ ngày), `describeUpcomingSession`. Kiểm tra ở `tests/class-schedule.test.ts`.
- `lib/server/class-schedule.ts`: `getClassSchedule`, `listClassSchedules` (đọc theo lô), `saveClassSchedule` (kiểm tra chủ lớp bằng `getTeacherClass`, rồi upsert). Dòng đọc không hợp lệ với phiên bản app hiện tại thì coi như chưa có lịch; lỗi database khi đọc (ví dụ bảng chưa có vì migration chưa tới) chỉ ghi log và trả lịch rỗng, để trang lớp vẫn mở. Người gọi tự kiểm tra quyền: trang lớp học viên đọc sau `getStudentClassView` (đã kiểm tra thành viên), trang Lớp của tôi chỉ đọc lớp của chính học viên.
- `classScheduleAction` (`app/actions/classes.ts`) nhận các buổi dưới dạng JSON trong trường ẩn, kiểm tra lại bằng `classScheduleSchema` rồi lưu. `components/teach/class-schedule-form.tsx` (thêm hoặc xóa buổi, chọn thứ, giờ, thời lượng; ô ghi chú). `TeachingPanel` nhận `nextSession`; `components/classroom/upcoming-session.tsx` hiện một dòng "Buổi tới" trong danh sách lớp của học viên và giáo viên.

## Tài khoản, quên mật khẩu và trình soạn — 03/11/2026

Kiểm tra ở [báo cáo](../testing/flow-fixes-2026-11-03.md).

- `updateAccountName` và `changePassword` (`app/actions/auth.ts`) dùng session client. Đổi tên ghi `profiles.full_name` qua RLS sẵn có (`profile_update_own`, chỉ cột `full_name`), dùng lại kiểm tra họ tên của form đăng ký. Đổi mật khẩu gọi `auth.updateUser`, dùng lại `resetSchema`, báo riêng `same_password`, `weak_password`, `reauthentication_needed` và rate limit, rồi `signOut({ scope: "others" })`. Không có migration.
- `app/settings/account/page.tsx` (`requireAccount`) và `components/settings/account-forms.tsx` (`AccountNameForm`, `PasswordChangeForm`, `FormFeedback` dùng chung).
- `/forgot-password` hiện `GoogleSignIn` khi `isGoogleAuthEnabled()`. Lời nhắc sau `requestPasswordReset` chỉ người nhận hỗ trợ khi không có thư.
- `lib/lesson-draft.ts` bỏ `AUDIO_COMMAND` khỏi giao diện; lệnh tạo audio vẫn ghi ở [06](../06-audio.md) cho người vận hành.
- `removeClassMember` và `leaveClass` (`lib/server/classes.ts`) cùng gọi `endEnrollment`: service client đặt `enrollments.left_at = now` cho dòng còn `left_at is null`; không có dòng nào thì báo `not_member`. Giáo viên phải là chủ lớp (`getTeacherClass`); người rời lớp phải đang là thành viên (`requireMembership`). Lớp tự học bị từ chối. `removeStudentAction` gọi `refresh()`; `leaveClassAction` chuyển về `/classes`. Các truy vấn sẵn có đã lọc `left_at is null` (quyền vào bài, sức chứa, nộp bài, email nhắc), báo cáo tách người đã rời, và `join_class` xóa `left_at` khi vào lại. Không có migration.
- `useLeaveWarning` (`components/editor/use-leave-warning.ts`) thay hai effect `beforeunload` trong `LessonEditor` và `TeachingEditor`. Hook bắt click ở pha capture trên `document`, trước khi Next.js `Link` xử lý, và dùng `isInPlaceNavigation` (`lib/leave-warning.ts`) để chỉ hỏi khi click trái thường vào trang khác cùng site trong cùng tab. Đã đồng ý rời trang thì `beforeunload` không hỏi lần hai.

## Đăng nhập bằng Google — 03/11/2026

Luồng PKCE của Supabase Auth với `@supabase/ssr` (cookie phiên httpOnly như đăng nhập email). Kiểm tra ở [báo cáo](../testing/google-sign-in-2026-11-03.md).

- `isGoogleAuthEnabled()` (`lib/server/supabase.ts`): cần cấu hình lớp học và `AUTH_GOOGLE_ENABLED=true`. Trang đăng nhập, hai trang đăng ký và hướng dẫn chỉ hiện Google khi hàm này đúng, nên deploy code trước khi bật nhà cung cấp không lộ nút hỏng.
- `signInWithGoogle` (`app/actions/auth.ts`): `signInWithOAuth({ provider: "google" })` với `redirectTo` là `{origin}/auth/callback?next=…` (`googleCallbackPath`). Origin lấy từ request, không lấy `SITE_URL`, vì cookie PKCE verifier nằm trên origin bắt đầu đăng nhập (domain cũ `reng-cyan` vẫn chạy được); Supabase vẫn kiểm tra URL theo Redirect URLs. `prompt=select_account` để chọn tài khoản trên máy dùng chung. Server Action `redirect()` sang URL Google.
- `app/auth/callback/route.ts`: không có `code` thì về `/sign-in?error=google`, hoặc `google-cancelled` khi Supabase chuyển `error=access_denied`. Có `code` thì `exchangeCodeForSession`, đọc `profiles.role` bằng service client, rồi chuyển tới `next` (qua `safeNextPath`) hoặc trang chủ theo vai. Lỗi đổi mã (thiếu verifier, mã hết hạn) về trang lỗi, không lộ chi tiết.
- `signInErrorPath` (`lib/auth-paths.ts`) tạo `/sign-in?error=…&next=…`; trang đăng nhập dùng bảng `SIGN_IN_ERRORS` (`link`, `google`, `google-cancelled`). `/auth/confirm` dùng chung hàm này.
- `components/auth/google-sign-in.tsx`: form gọi Server Action, nút dùng `useFormStatus` để hiện "Đang chuyển tới Google…", chữ "G" giữ màu thương hiệu Google; dòng "hoặc dùng email" phân cách với form email.
- `supabase/config.toml`: `[auth.external.google]` (local) và `[remotes.production.auth.external.google]` cùng tắt, client ID/secret lấy từ biến môi trường. Hồ sơ người dùng mới vẫn do trigger `handle_new_user` tạo, lấy `full_name` từ metadata Google. Không có migration.

## Trang chung không gắn môn — 03/11/2026

Luồng ở [BD](../basic-design/teaching-service.md#nền-tảng-dạy-học-online-không-gắn-môn--03112026), kiểm tra ở [rà soát](../testing/platform-neutral-ui-2026-11-03.md).

- `lib/site.ts`: `SITE_TAGLINE` dùng cho tiêu đề mặc định, tiêu đề trang chủ và chân trang; `SITE_DESCRIPTION` không nêu môn. `app/opengraph-image.png` và `app/twitter-image.png` vẽ lại cùng bố cục (1200×630, Be Vietnam Pro) với câu giới thiệu mới; alt text đi kèm.
- `lib/self-study.ts`: `SELF_STUDY_SUBJECTS` (mỗi môn có tên, mô tả và công cụ `href`/`label`/`description`), `getSelfStudySubject` (mã môn lạ thì ném lỗi), `SELF_STUDY_PATHS`. Từ 03/11/2026 có môn `chinese` với `/pinyin` và `/pinyin/practice`. `lib/pinyin-study.ts` (thuần, `tests/pinyin-study.test.ts`) giữ thanh điệu, thanh mẫu, vận mẫu và 48 từ luyện (pinyin có dấu, cách đọc thanh nhẹ, cách viết đủ thanh được chấp nhận qua `also`). `normalizePinyin` bỏ khoảng trắng, dấu nháy, chữ hoa và đổi v thành ü. `pickPinyinSession` nhận hàm random để test lặp lại được. `components/self-study/pinyin-practice.tsx` dùng lại `AnswerInput` ở chế độ `pinyin` (đổi số thanh thành dấu). Phiên chỉ được bốc khi bấm Bắt đầu, nên server và client render giống nhau. Enter kiểm tra; ô nhập khóa lại và focus sang nút để Enter lần nữa sang từ sau. Thêm môn tự học là thêm một mục; trang Tự học và thanh môn tự cập nhật, header không đổi.
- `components/site-header.tsx`: một mục `SELF_STUDY_LINK` thay bốn link tiếng Nhật. `relatedPaths` so khớp đúng đường dẫn, nên `/lessons/[id]` mở từ lớp không đánh dấu Tự học.
- `app/self-study/page.tsx` là trang tĩnh. `components/self-study/subject-study-nav.tsx` (Server Component) nằm đầu `/kana`, `/kana/practice`, `/grammar` và đặt `aria-current="page"` cho công cụ đang mở. `lib/seo-routes.ts` thêm `/self-study` vào sitemap.
- `app/page.tsx` không còn import `kanaItems`. Khối `.hero-paper` hiện `CLASS_STEPS`, số bước nằm trong ô vở `.writing-square` (CSS `.class-steps`). CSS mẫu kana của trang chủ (`.sample-grid`, `.sample-cell`) đã xóa. Link nằm trong câu ở `.page-heading p` và ở thanh môn có gạch chân, vì preflight Tailwind bỏ gạch chân của link (axe `link-in-text-block`).
- `/for-teachers`: `SUBJECTS` cho mục "Môn học hiện có"; câu hỏi "Reng dạy được những môn nào?" nằm trong JSON-LD FAQPage. Từ 04/11/2026 trang dùng ISR (`revalidate = 3600`) và `hasPublicLessons()` (`lib/lesson-repository.ts`, đếm `head: true` bài công khai đã xuất bản, chưa lưu trữ): có bài thì nút phụ là "Xem bài học mẫu" (`/lessons`), chưa có hoặc đọc lỗi thì là "Xem hướng dẫn cho giáo viên" (`/guide#teacher-title`). Đổi quyền đọc (`setLessonVisibilityAction`) hoặc lưu trữ bài (`archiveLessonAction`) gọi `revalidatePath("/for-teachers")`. `/lessons` trống có thêm một dòng mời giáo viên đăng ký để dùng bài mẫu. `/lessons` đổi tiêu đề thành "Bài học công khai"; `/grammar` ghi "Tra cứu ngữ pháp tiếng Nhật"; `app/not-found.tsx` dẫn về trang chủ và Lớp của tôi.
- `ClassSettingsForm`: nhãn "Môn học" (trường vẫn là `languageTag`). Không đổi schema, RPC hay migration.

## SEO cho trang công khai — đã triển khai

`metadataBase` lấy từ `SITE_URL` (`lib/site.ts`), metadata gốc mô tả dịch vụ, Open Graph `vi_VN` và thẻ xác minh Search Console qua `GOOGLE_SITE_VERIFICATION`. `app/sitemap.ts` liệt kê trang công khai cố định và bài có visibility public (làm mới mỗi giờ, lỗi database vẫn trả trang cố định); `app/robots.ts` chặn `/admin`, `/teach`, `/classes`, `/assignments`, trang tài khoản, API và `/lessons/*/slide|presenter`. Trang bài dùng `generateMetadata` với canonical `/lessons/[id]` (bỏ `?version=`) và JSON-LD LearningResource; trang chủ có Organization/WebSite, `/for-teachers` có WebPage/FAQPage. Bài riêng tư không đọc được khi chưa đăng nhập nên không vào sitemap hay chỉ mục. Trang luyện kanji `/kanji/` cũng bị chặn chỉ mục như flashcard/luyện nghe.

Header bảo mật (30/10/2026, `next.config.ts`, áp cho mọi đường dẫn): `Content-Security-Policy: frame-ancestors 'none'` và `X-Frame-Options: DENY` (Reng không được nhúng iframe, chống clickjacking nút của giáo viên/quản trị), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (mã lớp trong link mời không đi sang site khác), `Permissions-Policy` tắt camera/micro/vị trí (bật micro khi làm luyện nói), `Strict-Transport-Security`. Chưa đặt CSP cho script/style vì Next.js dùng script nội tuyến; cần nonce trước khi siết.

## Kế hoạch dữ liệu và khôi phục dự kiến

1. Bổ sung teacher_accounts, metadata/context và authoring_state nullable có default an toàn; schema v1 reader tiếp tục chạy. Thêm index owner/recipient/version/status và FK tương ứng.
2. Backfill quyền dạy cho teacher hiện tại; sửa toàn bộ RLS/RPC/gate join/requireStudent để khả năng học độc lập. Student cũ không tự thành teacher. Test hai owner và tài khoản vừa học vừa dạy trước bật onboarding.
3. Bổ sung storage entitlement/media review, share/provenance và transaction copy; asset copy ngoài DB có staging/cleanup để retry không để quyền sai hoặc file mồ côi.
4. Bật validator/renderer/profile v2 và wizard; authoring_state không vào DTO. `zh-exact-v1` dùng NFC + trim đầu/cuối, giữ thanh điệu/giản-phồn/dấu câu/khoảng trắng pinyin; profile Nhật giữ behavior cũ. Profile được snapshot trước chấm.
5. Audio job trên web và nghe duyệt phải sẵn sàng trong B1 nếu dùng audio ở bài thử; không đẩy việc chạy CLI sang giáo viên. Sau B1/B2 mới thêm import_jobs/items, quota/lease và retention cho scan/OCR ở C1/C2; provider chưa chọn không được giả lập trạng thái thành công trong production.

Migration phải được thử trên DB trống và dữ liệu v1 đã có, backup trước staging; rollout theo flag để dừng luồng mới mà vẫn đọc bài cũ. Sau khi có version v2 không được rollback app về bản không đọc được v2; bản phục hồi phải hỗ trợ cả hai hoặc khóa đường v2 có thông báo. Không xóa bảng/version/điểm để quay lại. Thử khôi phục backup/media độc lập trước nhận lớp thật.

## Điều hướng và trạng thái giao bài — 30/10/2026

- `app/page.tsx` giữ Server Component và metadata hiện có; lối vào lớp/tự học/giảng dạy dùng `next/link`. `HomeAgenda` tiếp tục tải riêng sau hydration, không đưa phiên người dùng vào trang chủ tĩnh.
- `components/site-header.tsx` thêm `/join-class`; `components/account-link.tsx` vẫn lấy `/api/me` no-store và kiểm tra dữ liệu, hiển thị `/classes` cho cả hai role cùng `/teach` riêng cho giáo viên. Đây là điều hướng; quyền truy cập vẫn do server quyết định. (02/11/2026: thay bằng hook `useAccountSummary` trong `components/account-summary.ts`, xem mục Dễ dùng và dạy online.)
- `components/teach/class-lesson-form.tsx` chỉ cho chọn các bài có `versions.length > 0`. Không có bài: link `/teach/lessons/new`. Chỉ có nháp: link `/teach` để xuất bản. Selection fallback về bài có phiên bản đầu tiên khi dữ liệu props thay đổi, và select phiên bản remount theo ID bài thực tế. Không thay RPC, quyền, snapshot hay migration.
- `app/for-teachers/page.tsx`, `lib/site.ts` và hướng dẫn đồng bộ mô tả tiếng Nhật/tiếng Trung, xác nhận email và khả năng duyệt theo cấu hình. `e2e/navigation.spec.ts` kiểm tra lối vào ở 1280px/360px và mô phỏng duy nhất API summary để kiểm tra menu hai role; không giả lập đăng nhập hoặc ghi dữ liệu lớp.

## Metadata quản lý bài và biểu mẫu Nhật–Trung — 30/10/2026

- `lib/teaching-language.ts`: nhãn `ja-JP`, `zh-Hans`, `zh-Hant`; schema v1 là Nhật, v2 chỉ xác định Trung khi tag hợp lệ. Schema lạ/thiếu trả chưa xác định, không tự coi là Nhật.
- `listOwnedLessons` lấy JSON projection của `draft_content.schemaVersion`/`context.languageTag` để tạo summary; summary phiên bản lấy metadata tương ứng từ `lesson_versions.content`. Không đưa nội dung nháp, notes hay đáp án vào bộ lọc/summary client. Không thêm migration.
- `lib/lesson-management.ts`: parse query `q/language/status`, giới hạn tìm kiếm 160 ký tự, bỏ qua query sai kiểu/tag lạ; lọc title theo NFKC và chữ thường, so sánh tag chính xác để không trộn giản/phồn. `/teach` dùng GET form và `searchParams` bất đồng bộ; form remount theo filter để Xóa bộ lọc khôi phục cả URL lẫn ô nhập. Lọc trên danh sách thuộc giáo viên hiện tại, không dùng query để mở rộng quyền.
- `ClassLessonForm` nhận ngôn ngữ lớp, hiển thị nhãn của từng snapshot phiên bản. Nhãn bản soạn không thay thế nhãn phiên bản xuất bản. Chưa thêm ràng buộc ngôn ngữ vào RPC.
- `ClassLessonForm` (30/10/2026) nhận thêm danh sách bài đang có trong lớp. Mặc định chọn bài đã xuất bản đầu tiên chưa có trong lớp. Chọn bài đã có thì phiên bản, thứ tự và giờ mở lấy giá trị hiện tại của lớp và hiện ghi chú, vì `upsert_class_lesson` ghi đè cả ba: lưu lại để đổi lịch không tự lên phiên bản mới, không đẩy bài xuống cuối hay mở ngay (khi luyện hằng ngày để Tự động thì bài mở gần nhất là nguồn nên sẽ đổi theo; từ 02/11/2026 có thể ghim nguồn).
- Trang theo dõi lớp hiện link mời `{SITE_URL}/join-class?code={mã}` kèm nút sao chép (Clipboard API, lỗi thì để học viên chọn link thủ công); lớp chưa có học viên đặt khối mã lớp ở đầu trang, lớp đã có học viên giữ ở cuối. Trang vào lớp nhận một giá trị `code` (lặp tham số thì bỏ qua thay vì lỗi 500) và báo "mã đã điền sẵn" khi người dùng đã đăng nhập. Mục Nội dung lớp có link tới phần thêm bài/đổi phiên bản.
- Bài có `copied_from_version_id` (sao chép từ bài được chia sẻ) không đặt công khai được: `setLessonVisibility` chặn ở server với mã `reshare_not_allowed`, cùng nguyên tắc với chặn chia sẻ lại; bài tự tạo hoặc bản sao bài của chính mình không bị ảnh hưởng.
- `AssignmentForm` nhận `classRow.language_tag`; `createQuestionDraft` thêm tham số mặc định `ja-JP` để caller editor Nhật cũ giữ hành vi. Câu fill Trung mới có `inputMode=chinese`; kiểu nhập vẫn chỉnh được. Hướng dẫn trong `TestQuestionEditor` theo input mode; chuyển sang chinese/pinyin bỏ `kanjiStrict`, dữ liệu đang gõ được giữ. Ngôn ngữ prompt Trung là `vi` vì có hướng dẫn Việt; ô đáp án dùng `zh-Hans`/`zh-Hant` hoặc `zh-Latn`. Không đổi validator/grading hoặc snapshot đã giao.
- Trang CSV lọc summary Nhật trước khi tải editor v1; bài v2 dùng import bảng trong wizard. Admin approval, phạm vi chủ lớp, quyền chia sẻ và rate limit tiếp tục được kiểm tra server như trước; không thêm quyền admin để giáo viên xem dữ liệu người khác.

Trường hợp dữ liệu nhiều: bộ lọc hiện xử lý danh sách đã tải, chưa phân trang phía database. Nếu thư viện tăng lớn, đo truy vấn/render rồi bổ sung phân trang/search server với cùng phạm vi quyền.

## Domain production — 30/10/2026

`reng-class.vercel.app` gắn trực tiếp vào project Vercel `reng`, không chỉ alias một deployment cố định. `SITE_URL` production là `https://reng-class.vercel.app`; cần deployment mới để canonical, sitemap và link email nhận giá trị mới. Supabase Auth `site_url` dùng domain mới; allowlist giữ cả `https://reng-class.vercel.app/**` và `https://reng-cyan.vercel.app/**`. Khối `[remotes.production.auth]` trong `supabase/config.toml` lưu cùng cấu hình. Local vẫn dùng loopback. Không đặt redirect bắt buộc từ domain cũ trong đợt đổi này.

Đã áp dụng Auth bằng cấu hình tối thiểu chỉ khai báo hai thuộc tính URL, xem trước bằng `config diff` rồi `config push`; không đẩy mặc định local lên các thiết lập Auth/DB khác. Kết quả xem [kiểm chứng domain](../testing/domain-change.md).

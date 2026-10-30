# Detail Design dự kiến — Dịch vụ hỗ trợ giảng dạy

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

Migration 202610290005 thêm `platform_admins` (chỉ cấp bằng SQL hoặc `npm run admin:grant` trên máy local), `platform_settings.teacher_approval_required` (mặc định bật cho POC giáo viên thuê) và các cột `requested_at`, `access_until`, `admin_note` trong `teacher_accounts`. Khi bật duyệt, `activate_teacher` tạo yêu cầu `pending`; quản trị viên mở quyền bằng `admin_set_teacher_status` (active/suspended), ghi hạn thuê/ghi chú bằng `admin_update_teacher_plan` và bật/tắt duyệt bằng `admin_set_teacher_approval`; mỗi RPC kiểm tra `is_platform_admin` và ghi `audit_events`. Tắt duyệt thì yêu cầu đang chờ được kích hoạt ở lần gửi tiếp theo. `access_until` chỉ để theo dõi: hệ thống không tự khóa, trang quản trị báo "Quá hạn thuê".

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

### Bài luyện hằng ngày — đã triển khai

Migration `202610290006_daily_practice.sql`: cột `classes.daily_practice_size` (null = tắt, 3–20), bảng `daily_practice_runs` (khóa chính lớp + ngày Việt Nam, `assignment_id` duy nhất; chỉ service role đọc/ghi), RPC `set_daily_practice` (chủ lớp) và `publish_daily_practice` (khóa advisory theo lớp + ngày; đã có run thì trả bài cũ; gọi `publish_assignment` sẵn có với mode practice, cho nộp muộn, 3 lượt, điểm đạt của lớp, tiêu đề "Luyện tập hằng ngày DD/MM"). `lib/server/daily-practice.ts` xét tối đa 20 bài đã mở theo `available_at` mới nhất và chọn bài đầu tiên có câu choice/fill trong phiên bản lớp đang ghim (từ 30/10/2026: bài mới chỉ có slide không làm lớp mất bài luyện), lỗi theo lớp được ghi log kèm mã lớp và mã lỗi dịch vụ, đọc câu đã dùng trong 14 ngày rồi `selectDailyQuestions` (`lib/daily-practice.ts`: chưa dùng trước, dùng lâu nhất sau, hòa thì theo hash lớp + ngày nên ổn định khi chạy lại). Hạn là 23:59:59 giờ Việt Nam. Cron `GET /api/cron/daily-practice` (Bearer `CRON_SECRET`, không cần email) chạy `0 23 * * *` UTC = 6:00 sáng Việt Nam; mỗi lớp lỗi riêng, không chặn lớp khác. Câu nghe không được chọn vì cần audio. Bài học mẫu 11 có 50 câu (14 câu gốc giữ mã q1101–q1114, thêm q1115–q1150) để đổi câu khoảng một tuần không trùng.

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
- `components/site-header.tsx` thêm `/join-class`; `components/account-link.tsx` vẫn lấy `/api/me` no-store và kiểm tra dữ liệu, hiển thị `/classes` cho cả hai role cùng `/teach` riêng cho giáo viên. Đây là điều hướng; quyền truy cập vẫn do server quyết định.
- `components/teach/class-lesson-form.tsx` chỉ cho chọn các bài có `versions.length > 0`. Không có bài: link `/teach/lessons/new`. Chỉ có nháp: link `/teach` để xuất bản. Selection fallback về bài có phiên bản đầu tiên khi dữ liệu props thay đổi, và select phiên bản remount theo ID bài thực tế. Không thay RPC, quyền, snapshot hay migration.
- `app/for-teachers/page.tsx`, `lib/site.ts` và hướng dẫn đồng bộ mô tả tiếng Nhật/tiếng Trung, xác nhận email và khả năng duyệt theo cấu hình. `e2e/navigation.spec.ts` kiểm tra lối vào ở 1280px/360px và mô phỏng duy nhất API summary để kiểm tra menu hai role; không giả lập đăng nhập hoặc ghi dữ liệu lớp.

## Metadata quản lý bài và biểu mẫu Nhật–Trung — 30/10/2026

- `lib/teaching-language.ts`: nhãn `ja-JP`, `zh-Hans`, `zh-Hant`; schema v1 là Nhật, v2 chỉ xác định Trung khi tag hợp lệ. Schema lạ/thiếu trả chưa xác định, không tự coi là Nhật.
- `listOwnedLessons` lấy JSON projection của `draft_content.schemaVersion`/`context.languageTag` để tạo summary; summary phiên bản lấy metadata tương ứng từ `lesson_versions.content`. Không đưa nội dung nháp, notes hay đáp án vào bộ lọc/summary client. Không thêm migration.
- `lib/lesson-management.ts`: parse query `q/language/status`, giới hạn tìm kiếm 160 ký tự, bỏ qua query sai kiểu/tag lạ; lọc title theo NFKC và chữ thường, so sánh tag chính xác để không trộn giản/phồn. `/teach` dùng GET form và `searchParams` bất đồng bộ; form remount theo filter để Xóa bộ lọc khôi phục cả URL lẫn ô nhập. Lọc trên danh sách thuộc giáo viên hiện tại, không dùng query để mở rộng quyền.
- `ClassLessonForm` nhận ngôn ngữ lớp, hiển thị nhãn của từng snapshot phiên bản. Nhãn bản soạn không thay thế nhãn phiên bản xuất bản. Chưa thêm ràng buộc ngôn ngữ vào RPC.
- `ClassLessonForm` (30/10/2026) nhận thêm danh sách bài đang có trong lớp. Mặc định chọn bài đã xuất bản đầu tiên chưa có trong lớp. Chọn bài đã có thì phiên bản, thứ tự và giờ mở lấy giá trị hiện tại của lớp và hiện ghi chú, vì `upsert_class_lesson` ghi đè cả ba: lưu lại để đổi lịch không tự lên phiên bản mới, không đẩy bài xuống cuối hay mở ngay (bài luyện hằng ngày lấy bài mở gần nhất nên sẽ đổi bài theo).
- Trang theo dõi lớp hiện link mời `{SITE_URL}/join-class?code={mã}` kèm nút sao chép (Clipboard API, lỗi thì để học viên chọn link thủ công); lớp chưa có học viên đặt khối mã lớp ở đầu trang, lớp đã có học viên giữ ở cuối. Trang vào lớp nhận một giá trị `code` (lặp tham số thì bỏ qua thay vì lỗi 500) và báo "mã đã điền sẵn" khi người dùng đã đăng nhập. Mục Nội dung lớp có link tới phần thêm bài/đổi phiên bản.
- Bài có `copied_from_version_id` (sao chép từ bài được chia sẻ) không đặt công khai được: `setLessonVisibility` chặn ở server với mã `reshare_not_allowed`, cùng nguyên tắc với chặn chia sẻ lại; bài tự tạo hoặc bản sao bài của chính mình không bị ảnh hưởng.
- `AssignmentForm` nhận `classRow.language_tag`; `createQuestionDraft` thêm tham số mặc định `ja-JP` để caller editor Nhật cũ giữ hành vi. Câu fill Trung mới có `inputMode=chinese`; kiểu nhập vẫn chỉnh được. Hướng dẫn trong `TestQuestionEditor` theo input mode; chuyển sang chinese/pinyin bỏ `kanjiStrict`, dữ liệu đang gõ được giữ. Ngôn ngữ prompt Trung là `vi` vì có hướng dẫn Việt; ô đáp án dùng `zh-Hans`/`zh-Hant` hoặc `zh-Latn`. Không đổi validator/grading hoặc snapshot đã giao.
- Trang CSV lọc summary Nhật trước khi tải editor v1; bài v2 dùng import bảng trong wizard. Admin approval, phạm vi chủ lớp, quyền chia sẻ và rate limit tiếp tục được kiểm tra server như trước; không thêm quyền admin để giáo viên xem dữ liệu người khác.

Trường hợp dữ liệu nhiều: bộ lọc hiện xử lý danh sách đã tải, chưa phân trang phía database. Nếu thư viện tăng lớn, đo truy vấn/render rồi bổ sung phân trang/search server với cùng phạm vi quyền.

## Domain production — 30/10/2026

`reng-class.vercel.app` gắn trực tiếp vào project Vercel `reng`, không chỉ alias một deployment cố định. `SITE_URL` production là `https://reng-class.vercel.app`; cần deployment mới để canonical, sitemap và link email nhận giá trị mới. Supabase Auth `site_url` dùng domain mới; allowlist giữ cả `https://reng-class.vercel.app/**` và `https://reng-cyan.vercel.app/**`. Khối `[remotes.production.auth]` trong `supabase/config.toml` lưu cùng cấu hình. Local vẫn dùng loopback. Không đặt redirect bắt buộc từ domain cũ trong đợt đổi này.

Đã áp dụng Auth bằng cấu hình tối thiểu chỉ khai báo hai thuộc tính URL, xem trước bằng `config diff` rồi `config push`; không đẩy mặc định local lên các thiết lập Auth/DB khác. Kết quả xem [kiểm chứng domain](../testing/domain-change.md).

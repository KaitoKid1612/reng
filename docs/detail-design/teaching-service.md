# Detail Design dự kiến — Dịch vụ hỗ trợ giảng dạy

Ngày: 29/10/2026. **Đã triển khai lát A** (migration 202610290001–0002): `teacher_accounts`, kích hoạt giảng dạy sau xác minh email, xuất bản không tự công khai, loader theo owner/lớp/version, sức chứa lớp và link Meet. Các phần chia sẻ, media, scan/OCR dưới đây vẫn là hợp đồng dự kiến, **chưa phải schema/API đang chạy**. Hành vi gốc theo [BD](../basic-design/teaching-service.md); cần chi tiết hóa migration/API theo từng lát triển khai trước code.

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

## Onboarding và sức chứa lớp

Luồng server đăng ký giáo viên: xác thực email → kiểm tra giới hạn đăng ký/điều khoản → kích hoạt teacher account → ghi audit. Mặc định onboarding dịch vụ tự kích hoạt sau xác minh email, chấp nhận điều khoản và kiểm tra lạm dụng/quota; pending dùng khi xác minh chưa xong hoặc cần xử lý ngoại lệ. Đây không phải chứng nhận chuyên môn giáo viên. Client không được gửi role để ghi thẳng vào profiles. Một người bị đình chỉ dạy không mất quyền đọc bài của mình với tư cách học sinh nếu tài khoản vẫn hợp lệ.

Join RPC khóa hàng classes trước khi kiểm tra active/join_enabled/capacity và ghi enrollment. Thứ tự: kiểm tra mã và rate limit → nếu đã là thành viên hiện hành thì trả idempotent → đếm chỗ còn lại → thêm hoặc kích hoạt enrollment trong cùng transaction. Retry, join đồng thời và rejoin đều đi cùng khóa. Lớp đầy không trả danh sách thành viên. Giảm capacity dưới số đang học bị từ chối; thành viên rời lớp giải phóng chỗ nhưng giữ lịch sử. Học sinh đã rời không dùng được link riêng/slides mới; xử lý lịch sử cá nhân theo chính sách truy cập hiện tại, không cascade xóa điểm.

Bản đầu meeting_url chỉ chấp nhận HTTPS host `meet.google.com` và đường dẫn hợp lệ, không có credentials; cấm javascript/data URL. Chỉ chủ lớp cập nhật, thành viên đang học đọc; không xuất vào catalog công khai, email công khai hoặc log. Không gọi server fetch URL, không cần OAuth Google cho việc lưu link. Meeting link có thể được sao chép ra ngoài; Masu không đảm bảo kiểm soát người vào Google Meet.

## Chia sẻ, sao chép và media

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

## Soạn bài theo mẫu — hợp đồng bổ sung dự kiến

Nguồn UX: [luồng biên soạn](../content-authoring.md). Chưa thay schema/module/API hiện tại. `create-lesson-form.tsx` hiện còn yêu cầu mã bài, `vocabulary-import.tsx` dùng cột jp/romaji/vi và editor thêm slide thủ công; không coi các module này đã hỗ trợ luồng mới.

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

## Kế hoạch dữ liệu và khôi phục dự kiến

1. Bổ sung teacher_accounts, metadata/context và authoring_state nullable có default an toàn; schema v1 reader tiếp tục chạy. Thêm index owner/recipient/version/status và FK tương ứng.
2. Backfill quyền dạy cho teacher hiện tại; sửa toàn bộ RLS/RPC/gate join/requireStudent để khả năng học độc lập. Student cũ không tự thành teacher. Test hai owner và tài khoản vừa học vừa dạy trước bật onboarding.
3. Bổ sung storage entitlement/media review, share/provenance và transaction copy; asset copy ngoài DB có staging/cleanup để retry không để quyền sai hoặc file mồ côi.
4. Bật validator/renderer/profile v2 và wizard; authoring_state không vào DTO. `zh-exact-v1` dùng NFC + trim đầu/cuối, giữ thanh điệu/giản-phồn/dấu câu/khoảng trắng pinyin; profile Nhật giữ behavior cũ. Profile được snapshot trước chấm.
5. Audio job trên web và nghe duyệt phải sẵn sàng trong B1 nếu dùng audio ở bài thử; không đẩy việc chạy CLI sang giáo viên. Sau B1/B2 mới thêm import_jobs/items, quota/lease và retention cho scan/OCR ở C1/C2; provider chưa chọn không được giả lập trạng thái thành công trong production.

Migration phải được thử trên DB trống và dữ liệu v1 đã có, backup trước staging; rollout theo flag để dừng luồng mới mà vẫn đọc bài cũ. Sau khi có version v2 không được rollback app về bản không đọc được v2; bản phục hồi phải hỗ trợ cả hai hoặc khóa đường v2 có thông báo. Không xóa bảng/version/điểm để quay lại. Thử khôi phục backup/media độc lập trước nhận lớp thật.

# Đối chiếu source với thiết kế dịch vụ

Ngày kiểm tra: 29/10/2026. Source được kiểm tra tại commit `55129ab`; không thay đổi runtime/migration/dependency trong đợt đối chiếu.

**Cập nhật cùng ngày sau khi triển khai lát 1–4** (migration 202610290001–0003): publish không còn tự công khai, loader kiểm tra owner/lớp/version, giáo viên tự kích hoạt sau xác minh email và vẫn học được lớp khác, lớp có sức chứa và link Meet; schema v2 Việt–Trung, profile chấm `zh-exact-v1` và wizard soạn theo mẫu. Ma trận dưới đây ghi trạng thái mới; tỷ lệ tăng từ 23% lên khoảng 52% `(9 + 5 × 0.5) / 22`. "Đã có" nghĩa là có bản local và test tự động, chưa thử với giáo viên/lớp thật. Kết quả kiểm thử ở [nghiệm thu dịch vụ](testing/teaching-service.md). Nguồn yêu cầu: [01](01-requirements.md), [BD dịch vụ](basic-design/teaching-service.md), [DD](detail-design/teaching-service.md), [biên soạn](content-authoring.md).

## Kết luận và cách hiểu tỷ lệ

**Khoảng 23% theo thang điểm khớp yêu cầu dịch vụ mới có tính phần nền tái sử dụng.** Đây là đánh giá từ source và phép thử cục bộ, không phải phần trăm code đã viết, khối lượng công việc đã xong, test coverage hoặc độ sẵn sàng production.

Mẫu số là 22 ID: AUTH-01, SERVICE-01/02, CLASS-08/09, LANG-01, SHARE-01/02, SCAN-01–03, GRADE-01, OPS-01/02, AUTHOR-01–08. Không đưa nhiều yêu cầu kana/N5 cũ vào để làm đẹp tỷ lệ Việt–Trung. Mẫu số này bao gồm cả scan/chấm tay giai đoạn sau, không riêng Service A/B1; các yêu cầu giao thoa như AUTH-01/SERVICE-01 vẫn là hai dòng theo docs nên không xem là trọng số công sức độc lập.

Quy ước đều trọng số: khớp đầy đủ = 1; có phần nguồn tái sử dụng nhưng chưa đủ hợp đồng mới = 0.5; chưa có hoặc chưa có bằng chứng = 0. Mức 0.5 là quy ước audit, không khẳng định đã làm nửa khối lượng của yêu cầu đó.

- Lúc đối chiếu: 0/22 khớp đầy đủ; 10/22 có một phần nền, 11/22 chưa có, 1/22 chưa kiểm chứng; điểm `(0 + 10 × 0.5) / 22 = 22.7%`, làm tròn khoảng 23%.
- Sau lát 1 và 3: 3/22 khớp đầy đủ, 9/22 một phần, 9/22 chưa có, 1/22 chưa kiểm chứng; điểm `(3 + 9 × 0.5) / 22 = 34.1%`.
- Sau lát 2 và 4: 9/22 khớp đầy đủ, 5/22 một phần, 7/22 chưa có, 1/22 chưa kiểm chứng; điểm `(9 + 5 × 0.5) / 22 = 52.3%`.
- Nếu chỉ tính hoàn tất trọn yêu cầu mới thì là 0/22; điều này không có nghĩa source hiện tại không có chức năng hữu ích.

Nền Nhật/classroom đã có reader/slide/presenter/PDF, nháp/version, choice/fill server grading, assignment snapshots/drafts/retry, báo cáo/SRS/tiến độ và email opt-in. Các phần này đáng giữ. Chưa chấm một tỷ lệ thứ hai cho “toàn bộ 86 yêu cầu” vì gồm module Nhật và nhiều tính năng ngoài MVP; cộng chung sẽ che phần còn thiếu của hướng dịch vụ hiện tại.

## Ma trận 22 yêu cầu

| Yêu cầu | Trạng thái | Điểm | Bằng chứng và khoảng thiếu |
|---|---|---|---|
| AUTH-01 | Một phần | 0.5 | Đăng ký có lối vào giáo viên; server kích hoạt sau xác minh email, không nhận role từ client. Chưa có kiểm soát lạm dụng/quota đăng ký. [Nguồn](../app/actions/teacher-account.ts) |
| SERVICE-01 | Đã có | 1 | Tự kích hoạt giáo viên sau xác minh email, trang giảng dạy riêng, vừa dạy vừa học bằng enrollment. [Nguồn](../supabase/migrations/202610290001_teaching_service.sql) |
| SERVICE-02 | Một phần | 0.5 | Owner check/RLS nền; bài riêng chỉ đọc qua RPC kiểm tra owner/lớp/version. Chưa có media riêng tư và share. [Nguồn](../lib/server/lesson-access.ts) |
| CLASS-08 | Đã có | 1 | Capacity tùy chọn; join khóa hàng lớp rồi đếm thành viên đang học, trả `class_full`; giảm dưới số đang học bị chặn. [Nguồn](../supabase/migrations/202610290001_teaching_service.sql) |
| CLASS-09 | Đã có | 1 | Link Meet allowlist `meet.google.com`, chỉ thành viên lớp thấy; chưa thử dạy Meet thật (SV-08). [Nguồn](../lib/class-settings.ts) |
| LANG-01 | Một phần | 0.5 | Schema v2 có context subject/languageTag/locale/instructionLanguageTag, ô nhập chữ Hán/pinyin, font và giọng thiết bị theo locale; v1 Nhật giữ nguyên. Chưa có TTS web; flashcard/SRS/tra ngữ pháp chưa đọc v2. [Nguồn](../lib/teaching-content.ts) |
| SHARE-01 | Chưa có | 0 | Chưa có grant view/copy/revoke; listOwnedLessons chỉ lấy owner. [Nguồn](../lib/server/classes.ts#L184) |
| SHARE-02 | Chưa có | 0 | Chưa có copy version/provenance/media entitlement và idempotency copy. [Nguồn](../lib/server/lessons.ts#L109) |
| SCAN-01 | Chưa có | 0 | Slide image nhận URL; không có upload/job/storage policy scan. [Nguồn](../lib/lesson-schema.ts#L169) |
| SCAN-02 | Chưa có | 0 | Không có import_jobs/import_items hoặc review OCR. [Nguồn](detail-design/teaching-service.md) |
| SCAN-03 | Chưa có | 0 | Không có đường ảnh/PDF → câu draft choice/fill; editor đang nhập câu thủ công. [Nguồn](../components/editor/question-fields.tsx#L1) |
| GRADE-01 | Một phần | 0.5 | Chấm khách quan có profile Trung `zh-exact-v1` theo snapshot; chưa pending_review/graded hoặc chấm tay. [Nguồn](../lib/language-profile.ts) |
| OPS-01 | Một phần | 0.5 | Có cấu hình/migration/test local và hướng dẫn staging; chưa bằng chứng backup/restore/cloud. [Nguồn](staging-setup.md#L1) |
| OPS-02 | Chưa có | 0 | Không có quota theo giáo viên/audit share-scan/retention job hoặc xử lý báo cáo nội dung; rate-limit join không thay thế yêu cầu này. [Nguồn](../supabase/migrations/202610280004_classroom.sql#L338) |
| AUTHOR-01 | Đã có | 1 | Chọn một trong 4 mẫu, nhập mục tiêu nhỏ, không cần mã bài/scan/AI. [Nguồn](../components/teaching/create-teaching-lesson-form.tsx) |
| AUTHOR-02 | Đã có | 1 | Bảng chữ Hán/pinyin/nghĩa Việt/ví dụ, nhập từng dòng hoặc dán Excel, xem trước lỗi từng dòng. [Nguồn](../lib/teaching-table.ts) |
| AUTHOR-03 | Đã có | 1 | Dựng slide theo mẫu, xem thay đổi trước khi áp dụng, preview/sắp xếp; dựng lại không nhân slide, giữ sửa tay. [Nguồn](../lib/teaching-templates.ts) |
| AUTHOR-04 | Đã có | 1 | Tạo khung choice/fill từ từ vựng; xác nhận đáp án là hash phía server, sửa câu phải xác nhận lại. [Nguồn](../supabase/migrations/202610290003_teaching_authoring.sql) |
| AUTHOR-05 | Đã có | 1 | Lưu nháp CAS/tiếp tục đúng bước, xem trước slide và trang học viên, xuất bản riêng tư, giao lớp là bước riêng. [Nguồn](../components/teaching/teaching-editor.tsx) |
| AUTHOR-06 | Chưa có | 0 | Chưa clone bài riêng/copy bài chia sẻ thành draft độc lập có nguồn. [Nguồn](../lib/server/lessons.ts#L109) |
| AUTHOR-07 | Đã có | 1 | Mục tiêu, đối tượng, kiến thức đầu vào, độ khó và thứ tự gợi ý; không khóa thứ tự học. [Nguồn](../components/teaching/goal-step.tsx) |
| AUTHOR-08 | Chưa kiểm chứng | 0 | Chưa bằng chứng giáo viên soạn bài Trung/dạy lớp thật, thời gian dưới 30 phút chưa đo. [Nguồn](testing/teaching-service.md) |

Các dòng “chưa có” được đối chiếu route/module, schemas và cả 6 migration trong repo; tìm kiếm không thấy teacher_accounts, lesson_shares, media_assets, import_jobs, authoring_state, capacity, meeting_url, zh-Hans/zh-Hant, pinyin hoặc templateId trong implementation. Đường dẫn tài liệu ở dòng SCAN-02/AUTHOR-08 là yêu cầu/trạng thái thiếu, không phải bằng chứng code đã triển khai. “Một phần” của quyền không có nghĩa đã kiểm toán bảo mật toàn diện.

## Chênh lệch cần xử lý trước khi mở dịch vụ

### 1. Ưu tiên cao: xuất bản đang làm bài công khai — đã xử lý

Đã sửa bằng migration 202610290001: publish giữ nguyên visibility (mặc định class), công khai là thao tác riêng có xác nhận, mọi trang/API đọc bài qua `read_lesson_version`. Mô tả lúc đối chiếu giữ lại bên dưới.

`publish_lesson` tại [migration 0003](../supabase/migrations/202610280003_sample_lessons.sql#L37) đặt `visibility='public'` mỗi lần publish. [publishLessonDraft](../lib/server/lessons.ts#L223) gọi RPC đó, trong khi docs yêu cầu xuất bản/công khai/giao lớp là các thao tác riêng. [loadLessonVersion](../lib/lesson-repository.ts#L92) lại chỉ đọc bài public. Đây là hành vi của thiết kế cũ, chưa phù hợp yêu cầu riêng tư mới; chưa ghi nhận có dữ liệu thật bị lộ.

Cần migration mới để publish giữ private/class mặc định, quyền chọn public có chủ đích, và loader kiểm tra owner/enrollment/version grant. Chỉ đổi visibility mà giữ loader cũ sẽ làm trang đọc/slide bài riêng không truy cập được. Không sửa migration đã áp dụng như cách nâng cấp duy nhất.

### 2. Ưu tiên cao: schema và chấm chưa hỗ trợ tiếng Trung — đã xử lý phần chính

Đã thêm schema v2 (`lib/teaching-content.ts`) đọc qua cùng loader với v1, profile `zh-exact-v1` lưu theo câu và renderer/reader riêng cho v2. Còn lại: TTS web, flashcard/SRS và tra ngữ pháp cho v2. Mô tả lúc đối chiếu giữ lại bên dưới.

[lessonContentSchema](../lib/lesson-schema.ts#L179) chỉ nhận v1; [draftContentSchema](../lib/lesson-draft.ts#L170), reader, renderer và RPC cùng phụ thuộc cấu trúc Nhật. Đổi nhãn UI hoặc nhét pinyin vào romaji không đáp ứng context/schemaVersion=2 trong docs.

[normalizeAnswer](../lib/grading/normalize.ts#L3) luôn NFKC, xóa mọi khoảng trắng và dấu chấm cuối. Phép thử cho thấy `nǐ hǎo` và `nǐhǎo` được chuẩn hóa giống nhau, khác profile Trung NFC+trim giữ khoảng trắng pinyin đã chốt. Cần profile bất biến theo assignment snapshot và adapter v1, không thay global normalize làm đổi chấm bài Nhật cũ.

### 3. Ưu tiên cao: quyền dạy và học còn loại trừ nhau — đã xử lý

Đã thêm `teacher_accounts`, backfill teacher cũ, bỏ chặn teacher ở join/requireStudent/agenda/thông báo học viên. Mô tả lúc đối chiếu giữ lại bên dưới.

[requireStudent](../lib/server/account.ts#L72) chuyển teacher về /teach; [join_class](../supabase/migrations/202610280004_classroom.sql#L335) từ chối teacher, test hiện tại còn xác nhận `not_student`. Cần capability dạy độc lập với enrollment, backfill teacher cũ và cập nhật toàn bộ API/RLS/RPC/session/UI tests; không chỉ thêm lựa chọn teacher ở form đăng ký.

### 4. Luồng editor hiện tại còn là soạn chi tiết thủ công — đã xử lý

Đã có wizard 5 bước cho bài v2; editor chi tiết cũ giữ cho bài tiếng Nhật. Mô tả lúc đối chiếu giữ lại bên dưới.

[CreateLessonForm](../components/editor/create-lesson-form.tsx#L13) yêu cầu mã bài/thứ tự, [LessonEditor](../components/editor/lesson-editor.tsx#L251) dùng các khối từ/ngữ pháp/câu/slide; [CSV](../lib/vocab-csv.ts#L129) bắt kana và romaji. Không có 4 mẫu, generator giữ provenance/diff, objective nhỏ hoặc review đáp án theo revision.

Giữ reducer, ref validation, save CAS, preview và slide reorder. Xây wizard dẫn dắt trên domain v2, tách quản lý phiên lưu/xuất bản khỏi từng bước; editor chi tiết tiếp tục là lựa chọn bổ sung. Lý do refactor là thay hợp đồng và luồng sử dụng, không phải vì số dòng component hoặc sở thích code style.

### 5. Audio có pipeline tốt nhưng bị giới hạn Nhật và cần người chạy script

[canonicalAudio](../lib/audio-config.ts#L12) chỉ chấp nhận ja-JP; [editor](../components/editor/lesson-editor.tsx#L245) đưa lệnh script cho giáo viên. Cần locale/voice adapter, job web/quota/review/CAS và trạng thái nghe duyệt. Giữ hash/retry/escape/cancel đang có. Không coi tính năng này chỉ là sửa một chuỗi locale.

### 6. Capacity, Meet, sharing và scan phần lớn là xây mới

Capacity và Meet đã làm (khóa hàng lớp khi join, kiểm thử chỗ cuối/retry/rejoin, link chỉ cho thành viên).

Sharing cần bảng grant/copy/provenance/quyền media. Scan cần upload private, worker/OCR/review/quota/retention. Đây là chức năng mới dựa trên nền, không phải toàn bộ đều gọi là refactor. Chưa cần đổi Next.js/React/Supabase hoặc viết lại ứng dụng.

## Thứ tự chuyển đổi đề xuất

| Thứ tự | Việc | Loại | Điều kiện qua |
|---|---|---|---|
| 1 | Chốt migration chuyển tiếp, public/private và capability dạy/học | Refactor + nâng quyền/dữ liệu | Owner/học sinh/người ngoài đúng quyền; bài v1 và lớp cũ còn chạy; publish không public ngầm. **Đã làm 29/10/2026** |
| 2 | Schema v2 + context/profile Trung + adapter v1 + loader/DTO | Refactor domain và thêm v2 | Nhập/đọc/render/chấm Trung đúng; không làm đổi snapshot/điểm Nhật cũ. **Đã làm 29/10/2026** |
| 3 | Onboarding teacher, class capacity/Meet | Xây thêm trên lớp/Auth hiện tại | Đăng ký teacher tự phục vụ; hai người tranh chỗ cuối không vượt capacity; teacher có thể học lớp khác. **Đã làm 29/10/2026** |
| 4 | Wizard 4 mẫu, bảng Việt–Trung, dựng slide, câu luyện/review | Thêm UX + refactor editor | Giáo viên soạn bài dễ không thấy mã kỹ thuật; dựng lại không mất sửa tay; save/publish/giao độc lập. **Đã làm 29/10/2026** |
| 5 | TTS web, nghe duyệt, một bài/một lớp thử | Xây job mới, tái sử dụng pipeline | Locale Trung đúng, không CLI; trọn luồng dạy/giao/nộp/chấm; đo thời gian chuyên môn và thao tác riêng. Mới có giọng thiết bị theo locale |
| 6 | Sharing/copy, upload thủ công rồi OCR | Xây thêm sau luồng soạn cơ bản | Grant/private media/retention/review đúng; không lộ notes/test/dữ liệu lớp |

Cần kiểm thử quyền và hồi quy qua từng lát, không làm big-bang rename jp→text hoặc global replacement ja→zh. Chưa thay code theo thứ tự này trong đợt audit.

## Bằng chứng kiểm tra và giới hạn

- `npm run check` ở source hiện tại qua format/lint/typecheck và 70 tests logic/database. Test đang chứng minh nền Nhật, không xác nhận dịch vụ Việt–Trung.
- Probe thuần cục bộ, không gọi cloud: schema v2 bị từ chối; CSV text/reading/meaning bị thiếu cột jp/romaji/vi; nhét chữ Trung vào cột Nhật bị lỗi kana/romaji; giọng zh-CN bị canonicalAudio từ chối; normalize xóa khoảng trắng pinyin.
- Đọc các test E2E Supabase hiện có để hiểu hành vi, không chạy lại browser/build/Supabase hoặc dùng tài khoản thật trong lượt kiểm tra này. Chưa kiểm chứng production, Safari/Meet, font/audio Trung hoặc backup/restore thật.
- Tìm kiếm không thấy module mới là chỉ báo kết hợp với schema/migration/routes đang có, không phải bằng chứng tuyệt đối rằng không có khả năng làm thủ công ở ngoài ứng dụng.

Kết luận: cần refactor có phạm vi ở quyền, private publish/loader, schema/profile ngôn ngữ, editor và audio; đồng thời xây mới onboarding đầy đủ, wizard, sharing và scan. Phần nền đã có đáng tái sử dụng, tỷ lệ thấp phản ánh hướng sản phẩm mới được mở rộng sau khi code nền Nhật đã tồn tại.

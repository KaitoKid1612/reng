# Thiết kế dữ liệu

Tài liệu gồm hợp đồng nền Nhật và phần mở rộng dịch vụ Việt–Trung. Migrations hiện có là nguồn cho bảng đã triển khai; JSON/schema dưới đây được đánh dấu nền v1 hoặc dự kiến v2. Không dùng ví dụ v2 để import vào validator v1. Gói triển khai mới cần constraint/index/policy tương ứng và không sửa snapshot cũ.

## Schema nội dung nền Nhật v1

Mỗi bài có bản nháp chỉnh sửa được và các phiên bản xuất bản bất biến. Nội dung mỗi phiên bản là một khối JSON; slide tham chiếu tới ID, không sao chép từ vựng hay ngữ pháp.

```json
{
  "schemaVersion": 1,
  "vocab": [
    {"id": "v0501", "jp": "いきます", "kanji": "行きます", "romaji": "ikimasu", "vi": "đi", "audio": "a3f91c2e8b4d6071a3f91c2e8b4d6071"}
  ],
  "grammar": [
    {
      "id": "g0501", "pattern": "N へ いきます", "vi": "Đi đến đâu đó",
      "explain": "へ đọc là e khi làm trợ từ.",
      "examples": [{"jp": "がっこうへ いきます。", "vi": "Đi đến trường."}],
      "viMistake": "Trợ từ viết へ, không viết え."
    }
  ],
  "slides": [
    {"id": "s0501", "type": "title", "jp": "第5課", "vi": "Bài 5: Đi lại"},
    {"id": "s0502", "type": "vocab", "refs": ["v0501"]},
    {"id": "s0503", "type": "grammar", "ref": "g0501"},
    {"id": "s0504", "type": "example", "ref": "g0501", "reveal": true},
    {"id": "s0505", "type": "quiz", "ref": "q0501"}
  ],
  "questions": [
    {
      "id": "q0501", "type": "choice", "prompt": "がっこう___ いきます。",
      "options": ["へ", "を", "が", "で"], "answer": [0],
      "explain": "へ chỉ hướng di chuyển.", "points": 1, "tags": ["troTu"]
    }
  ]
}
```

`id`, `title`, `order_no` của bài nằm ở cột database; không lặp lại trong JSON. Tiêu đề của phiên bản được chụp lại khi xuất bản để lịch sử không đổi theo bản nháp.

### Hợp đồng và kiểm tra dữ liệu

- Dùng discriminated union theo `type`, kết hợp validator chạy ở server cho import, lưu và xuất bản. `schemaVersion` khác phiên bản hỗ trợ thì từ chối, không tự đoán cấu trúc.
- ID bài duy nhất toàn hệ thống; ID nội dung duy nhất trong bài và không tái sử dụng cho ý nghĩa khác. Tham chiếu liên bài dùng cặp `(lesson_id, item_id)`. ID giữ ổn định qua các phiên bản.
- Bản nháp có thể chưa đầy đủ; xuất bản bắt buộc mọi `ref`, `refs`, audio và trường cần thiết hợp lệ. Không xuất bản slide tham chiếu ID không tồn tại, đáp án ngoài phạm vi hoặc câu có điểm không dương.
- Nội dung dạng text thuần; không nhận HTML tùy ý. URL media phải thuộc nguồn cho phép. Tệp SVG từ nguồn ngoài cần xử lý an toàn trước khi phục vụ.
- Sửa không ghi đè phiên bản đã xuất bản. Xóa mục đang được slide bản nháp tham chiếu phải báo lỗi và yêu cầu sửa tham chiếu trước.

Từ vựng bài Nhật có thêm `image` tùy chọn (từ 30/10/2026): đường dẫn `/…` hoặc `https://…` tới icon/hình của từ, ví dụ `/icons/vocab/red-apple.svg`. Hình chỉ hỗ trợ nghĩa đã viết; nội dung cũ không có trường này vẫn hợp lệ. Xem [hình minh họa](illustrations.md).

### Các loại slide

Mọi slide có `id`, `type`; `teacherNotes` tùy chọn chỉ có trong payload giảng viên, không đưa vào HTML/JSON cho học viên hoặc cửa sổ máy chiếu.

| Type | Trường riêng bắt buộc |
|---|---|
| `title` | `jp`, `vi`; `image` tùy chọn (tranh mở đầu, `/…` hoặc `https://…`) |
| `vocab` | `refs`: ID từ vựng |
| `grammar` | `ref`: ID ngữ pháp |
| `example` | `ref`: ID ngữ pháp; `reveal` mặc định false, hiển thị các ví dụ của mẫu |
| `quiz` | `ref`: ID câu hỏi luyện công khai |
| `note` | `title`, `body` |
| `image` | `src`, `alt`; `caption` tùy chọn |
| `dialogue` | `title`, `lines`: 1–8 lượt `{speaker, jp, vi}`; `reveal` ẩn nghĩa từng lượt |
| `table` | `title`, `columns` 1–6, `rows` 1–12 (mỗi hàng đủ số ô); `revealLastColumn` cho luyện thay thế |

Đăng ký component theo type; loại không hỗ trợ bị chặn khi xuất bản. `dialogue` và `table` tự chứa nội dung (không `ref`), có giới hạn để vừa khung 1280×720. Văn bản Nhật có thể chứa furigana `{漢字|かんじ}`: đây là cú pháp văn bản, không phải HTML; renderer chuyển thành `<ruby>`, giọng đọc/audio dùng phần đọc.

### Các loại câu hỏi

Mọi câu có `id`, `type`, `prompt`, `points` là số nguyên dương, `tags`, `answer` là mảng và `explain`. Trường phục vụ nghe gồm `audio`, `transcript`, `maxListens` (null nghĩa là không giới hạn). Transcript cũng phải ẩn trước thời điểm được xem.

Văn bản hiển thị của câu tiếng Nhật (`prompt`, `passage`, `options`, `tokens[].text`, `explain`, `transcript`) có thể chứa furigana `{漢字|かんじ}`, cùng cú pháp với nội dung bài học; không có trường furigana riêng. Đáp án học viên gõ (`answer` của `fill`, `dictation`, `listen` dạng điền) không chứa furigana (05/11/2026, [DD](detail-design/phase-3.md#furigana-trong-bài-tập--05112026)).

| Type | Dữ liệu | Kiểu answer |
|---|---|---|
| `choice` | `options: string[]`, `multiple: boolean` mặc định false | Chỉ số các lựa chọn đúng, không trùng |
| `fill` | `inputMode: hiragana / katakana / japanese / chinese / pinyin / text`, `kanjiStrict: boolean` | Các chuỗi được chấp nhận |
| `match` | `left: string[]`, `right: string[]` | Các cặp `[leftIndex, rightIndex]`, mỗi phần tử dùng đúng một lần |
| `order` | `tokens: {id, text}[]` | Một mảng ID token theo thứ tự đúng; token trùng chữ vẫn có ID khác nhau |
| `listen` | `responseType: choice / fill`, trường tương ứng và `audio` | Theo responseType |
| `dictation` | `audio`, `inputMode`, `kanjiStrict` | Các chuỗi được chấp nhận |

`answer` của choice là tập lựa chọn cần chọn; của fill là tập phương án thay thế, không phải cùng ý nghĩa chỉ vì đều là mảng. `kanjiStrict` mặc định false; chuyển tag cũ cùng tên sang trường này khi nhập. Luật chấm tại `07-exercises-and-grading.md`.

## Nội dung công khai và nội dung kiểm tra

- `lessons` chứa bản nháp riêng, không cho khách/học viên đọc trực tiếp.
- `lesson_versions` chứa phiên bản xuất bản và câu luyện theo quyền bài (public/lớp). Câu luyện đã công bố cho người được phép xem không được xem là câu test bí mật. Chỉ API luyện mới trả đáp án theo mục đích; API đọc thường lược bỏ `answer`, `explain`, `transcript`, `teacherNotes`.
- Câu hỏi luyện đã công khai không được tái sử dụng làm câu kiểm tra cần giữ kín đáp án. Ẩn trường ở một view không thu hồi được đáp án đã gửi qua slide hoặc bài luyện.
- `assignments.mode = test` dùng câu hỏi riêng do giảng viên nhập/import, chụp vào `assignment_items`; không lấy nguyên câu luyện công khai. Form giai đoạn 3 có nhập câu riêng tối thiểu, không phải chờ editor bài học giai đoạn 4.
- Bản đầu không có đường đọc trực tiếp view database cho học viên. API dùng danh sách trường cho phép và kiểm tra quyền; RLS khóa bảng gốc. `lessons_public` nếu bổ sung sau phải có migration và kiểm thử quyền riêng; view không tự bảo đảm an toàn.

## Hợp đồng database

Migration 202610280002 bổ sung summary/title_ja trên bài và snapshot, order_no/course_id/is_sample trên snapshot; RPC publish_lesson dành cho service_role xuất bản trong transaction với owner/revision check. Metadata snapshot được đọc thay cho metadata draft khi mở version cũ. Các migration này đã kiểm tra local và đã áp dụng production cùng các migration sau. Migration 202610280003 thêm cờ is_sample vào publish_lesson; 202610280004 tạo các bảng giai đoạn 3, trigger bất biến, RLS chỉ đọc và RPC transaction theo [DD giai đoạn 3](detail-design/phase-3.md). Nền 0001–0004 đã kiểm chứng local. Migration 0005 thêm email và 0006 thêm luyện nghe, có bằng chứng riêng tại testing/phase-4.md và phase-5.md; cũng đã áp dụng production.

Các bảng có ID UUID mặc định sinh phía database nếu không ghi khác. Thời gian lưu `timestamptz` UTC; ngày học và ngày nhắc tính theo `Asia/Ho_Chi_Minh`.

| Bảng | Cột và ràng buộc chính |
|---|---|
| `profiles` | `id` FK auth.users, `full_name`, `role` CHECK student/teacher, `created_at`. Chỉ quản trị server được đổi role. |
| `lessons` | `id text PK`, `owner_id` FK profiles, `course_id`, `order_no`, `title`, `draft_content jsonb`, `draft_revision int`, `published_version_id`, `visibility` CHECK public/class, `archived_at`, timestamps. |
| `lesson_versions` | `id`, `lesson_id` FK lessons, `version_no`, `title`, `content jsonb`, `published_at`; UNIQUE lesson_id/version_no. Bất biến sau xuất bản. Con trỏ published_version_id phải thuộc đúng bài. |
| `class_lessons` | `class_id`, `lesson_id`, `lesson_version_id`, `order_no`, `available_at` (bắt buộc); PK class_id/lesson_id, UNIQUE class_id/order_no. Phiên bản phải thuộc bài đã chọn; giáo viên lớp sở hữu bài. |
| `classes` | `id`, `teacher_id`, `name`, `join_code text UNIQUE` (8 ký tự không nhầm lẫn), `join_enabled boolean DEFAULT true` để thu hồi mã, `active`, `pass_score int CHECK 0..100 DEFAULT 70`, `created_at`. Thêm sau giai đoạn 3: `capacity` (1–1000, trống là không giới hạn), `meeting_url` (chỉ link Google Meet), `subject`, `language_tag` (ja-JP, zh-Hans, zh-Hant), `instruction_language_tag` (vi-VN), `revision`, `daily_practice_size` (3–70), `daily_practice_lesson_id`, `daily_listening_count` (null, 0–10), `self_study`. |
| `enrollments` | `class_id`, `user_id`, `joined_at`, `left_at`; PK class_id/user_id. Chỉ thành viên còn hoạt động được bắt đầu/nộp bài. |
| `assignments` | `id`, `class_id`, `lesson_id`, `lesson_version_id`, `title`, `mode` CHECK practice/test, `status` CHECK draft/published/closed, `due_at`, `allow_late boolean DEFAULT false`, `pass_score int CHECK 0..100 DEFAULT 70`, `max_attempts int CHECK >0 DEFAULT 1`, `feedback_policy` CHECK after_submit/after_due, `published_at`. |
| `assignment_items` | `assignment_id`, `question_id text`, `position int`, `question_snapshot jsonb`; PK assignment_id/question_id, UNIQUE assignment_id/position. Snapshot chứa đầy đủ đề, đáp án và trọng số, chỉ server/giáo viên đọc. |
| `submissions` | `id`, `assignment_id`, `user_id`, `attempt_no int >0`, `status` CHECK in_progress/submitted, `draft_answers jsonb`, `draft_revision int`, `score int`, `max_score int`, `passed boolean`, `is_late boolean`, `started_at`, `last_saved_at`, `submitted_at`; UNIQUE assignment_id/user_id/attempt_no. |
| `answers` | `submission_id`, `question_id`, `raw jsonb`, `is_correct boolean`, `points_earned int >=0`, `listen_count int >=0`, `time_ms int >=0`; PK submission_id/question_id, FK submission_id, FK tới câu trong assignment thông qua kiểm tra server/transaction. |
| `audio_assets` | `hash text PK`, `text`, `voice`, `url`, `duration_ms`, `created_at`. Hash là 32 ký tự hex đầu của SHA-256 trên canonicalInput, bao gồm cấu hình âm thanh, xem `06-audio.md`. Không cho học viên đọc cột text qua danh mục asset. |
| `srs_cards` | `user_id`, `item_type` CHECK vocab/kanji/mistake, `source_id text`, `item_id text`, `scheduler_version`, `scheduler_state jsonb`, `due timestamptz`, `correct_streak int DEFAULT 0`, `resolved_at`, `revision int` cho compare-and-swap, `created_at`, `updated_at`; PK user_id/item_type/source_id/item_id. |
| `join_attempts` | `id`, `user_id`, `succeeded`, `attempted_at`; chỉ server ghi/đọc để giới hạn thử mã lớp. |
| `answer_variants` | `lesson_id`, `question_id`, `prompt`, `variant` (1–200 ký tự), `accepted_by`, `source_assignment_id`, `accepted_at`; PK lesson_id/question_id/variant. Đáp án giáo viên chấp nhận khi chấm bài luyện; `publish_assignment` gộp vào bản chụp bài luyện sau khi đề câu hỏi chưa đổi. Chỉ server đọc/ghi (migration 202611030001). |
| `review_events` | `id`, `user_id`, khóa thẻ SRS, `rating int CHECK 1..4`, `is_correct boolean` nullable, `reviewed_at`, `request_id uuid UNIQUE`. Ghi cùng transaction cập nhật thẻ; review_events tham chiếu đủ khóa ghép của srs_cards. |
| `lesson_progress` | `user_id`, `lesson_id`, `lesson_version_id`, `last_slide_id`, `read_completed_at`, `updated_at`; PK user_id/lesson_id. Hoàn thành đọc do học viên bấm xác nhận, không suy ra từ mở trang. |
| `notification_preferences` | `user_id PK`, `reminder_frequency` CHECK daily/due_only/off DEFAULT off, `weekly_enabled boolean DEFAULT false`, `teacher_digest_enabled boolean DEFAULT false`, `push_enabled boolean DEFAULT false`, `consented_at`, `delivery_paused_at`/`delivery_pause_reason` (bounce/complaint), `updated_at`. |
| `push_subscriptions` (dự kiến, chưa migration) | `id`, `user_id`, `endpoint text UNIQUE`, `p256dh`, `auth`, `created_at`, `disabled_at`. Mỗi người có thể có nhiều thiết bị. |
| `email_log` | `user_id`, `email_type`, `for_date date`, `status` CHECK pending/sending/sent/failed/cancelled, `idempotency_key text UNIQUE`, `provider_message_id`, `attempts`, `lease_until`, `next_attempt_at` (backoff), `sent_at` nullable, `opened_at`, `last_error`; PK user_id/email_type/for_date. Migration 202610280005. |

Cột bắt buộc NOT NULL trừ các trường trạng thái chưa có giá trị: lessons.published_version_id/archived_at, enrollments.left_at, assignments.due_at/published_at, kết quả và submitted_at của submission đang làm, lesson_progress.last_slide_id/read_completed_at, srs_cards.resolved_at, các mốc đồng ý/gửi/mở email, lease_until/provider_message_id/last_error, push_subscriptions.disabled_at, audio_assets.duration_ms. assignments.lesson_version_id phải thuộc lesson_id và là phiên bản đã được chọn cho lớp lúc giao; snapshot không đổi nếu lớp nâng phiên bản sau đó. Với test after_due, due_at bắt buộc có giá trị. Các trường tùy chọn trong JSON tuân thủ validator theo type. Khóa quan hệ đều có FK; migration phải bổ sung index cho FK dùng để lọc, đặc biệt `classes.teacher_id`, `enrollments.user_id`, `assignments(class_id, due_at)`, `submissions(assignment_id, user_id, submitted_at)`, `srs_cards(user_id, due)`.

### Phiên bản, xuất bản và lưu trữ

1. Giảng viên sửa draft với `draft_revision`; cập nhật bằng revision cũ bị từ chối để tránh ghi đè từ hai tab.
2. Xuất bản tạo `lesson_versions` mới trong transaction, sau đó đổi con trỏ phiên bản hiện hành. Không làm lộ bản nháp đang sửa.
3. Lớp ghim phiên bản đã chọn. Giảng viên chủ động nâng phiên bản cho lớp; bài giao và kết quả cũ không đổi.
4. Khi xuất bản bài giao, chụp mọi câu hỏi vào `assignment_items`. Sau đó không sửa mode, đề, trọng số, điểm đạt, hạn, lượt làm hoặc chính sách phản hồi; nếu cần thay đổi thì đóng bài và tạo bài mới. Chỉ sửa tiêu đề hiển thị.
5. Bài/lớp đã có lịch sử chỉ lưu trữ hoặc đóng, không xóa cứng. Đóng bài chặn lượt mới; lượt đang làm cũng không được nộp, cần cảnh báo giáo viên trước thao tác. Không xóa media còn được phiên bản hoặc bài giao tham chiếu.

### Dữ liệu bảng chữ cái và kanji

Giai đoạn 1 dùng `content/kana.json` được quản lý cùng mã nguồn: `schemaVersion`, danh sách `{id, script, group, row, column, kana, acceptedRomaji: string[], audio, strokes: string[]}`. `script` là hiragana/katakana; `group` là basic/dakuten/handakuten/yoon. `strokes` là URL SVG theo từng chữ, có thể rỗng trước khi làm thứ tự nét. Ô trống trong lưới do layout quyết định, không tạo ký tự giả. Kana là dữ liệu nền cố định; nội dung bài học vẫn thêm được mà không deploy.

DD giai đoạn 1 quy định audio trong dataset là null; mapping ID → hash nằm tại content/audio-manifest.json, ban đầu rỗng. Trường config jsonb trong audio_assets lưu cấu hình canonical đã dùng tạo hash. Bảng `audio_assets` nằm trong migration nền `202610280001_foundation`, đã áp dụng production.

Giai đoạn 5 thêm `kanji_entries`: `id text PK`, `character text UNIQUE`, `on_readings text[]`, `kun_readings text[]`, `meanings_vi text[]`, `compounds jsonb`, `stroke_asset_url`, `source`, `source_version`, `license`, `attribution`. Dữ liệu từ điển gốc và phần giải thích tự viết có nguồn gốc riêng; lưu nguồn theo từng bản import, không mặc định việc tách bảng tự giải quyết mọi nghĩa vụ giấy phép.

### Trạng thái ôn tập và tiến độ

- `source_id` là lesson_id cho vocab, bộ dữ liệu cho kanji, assignment_id cho mistake; tránh đụng ID giữa các nguồn. Thẻ lỗi gắn snapshot của bài giao.
- `scheduler_state` lưu toàn bộ trạng thái mà phiên bản thư viện FSRS đã khóa yêu cầu; validator và migration theo `scheduler_version`. Không suy đoán có thể khôi phục lịch chỉ từ stability/difficulty.
- Sổ lỗi có `correct_streak`; sai thì reset, đúng ba lần liên tiếp trong ba lượt ôn riêng thì đặt `resolved_at`, giữ lịch sử. Sai lại thì mở lại.
- Chuỗi ngày học tính theo các ngày có review_event hoặc bài nộp đã chấm thành công, không tính chỉ mở trang hay lật thẻ. Dùng ngày Việt Nam, tính từ hôm nay hoặc hôm qua nếu hôm nay chưa học.
- Tiến độ đọc, điểm bài tập và mức thuộc thẻ là ba chỉ số riêng; không cộng thành một phần trăm chung khi chưa có quy tắc sản phẩm.

## Ma trận quyền

| Dữ liệu | Khách / học viên | Giảng viên |
|---|---|---|
| Hồ sơ | Học viên đọc/sửa tên mình, không đổi role | Tên học viên lớp mình; không đọc hồ sơ ngoài lớp |
| Bài nháp và phiên bản gốc | Không đọc trực tiếp | CRUD draft của mình; đọc phiên bản của mình, không sửa phiên bản |
| Nội dung xuất bản | Qua API đã lọc: khách chỉ public; học viên thêm bài lớp đang tham gia đã mở | Xem bài mình sở hữu |
| Lớp, danh sách thành viên | Qua API, chỉ lớp đang tham gia; không lộ danh sách email cả lớp | Quản lý lớp mình tạo |
| Bài giao và snapshot | Qua API: chỉ bài xuất bản thuộc lớp đang tham gia, payload theo mode | Tạo/đọc bài lớp mình, tuân thủ bất biến sau xuất bản |
| Submissions / answers | Đọc của mình qua API theo thời điểm phản hồi; ghi qua API, không trực tiếp sửa điểm | Đọc kết quả lớp mình, không sửa điểm thủ công ở bản đầu |
| SRS / tiến độ / tùy chọn | Của mình; SRS cập nhật qua API ôn để bảo toàn lịch sử | Không đọc SRS cá nhân; chỉ báo cáo theo lớp |
| Audio metadata / email log | Không đọc trực tiếp; API chỉ trả URL media được phép | Không có quyền database trực tiếp ngoài nhu cầu soạn bài |
| Push subscription | API quản lý thiết bị của mình, không đọc khóa thiết bị khác | Không truy cập |

RLS bật trên mọi bảng người dùng/nội dung ngay từ migration đầu tiên. Các bảng snapshot, điểm, log chỉ server ghi. Service role chỉ được gọi sau khi API kiểm tra user và quyền sở hữu/thành viên. Mã lớp sinh ngẫu nhiên, được đổi hoặc thu hồi; API vào lớp có giới hạn thử, thông báo mã không hợp lệ không tiết lộ thông tin lớp. Chia sẻ bài giữa giáo viên cấp quyền theo đúng một phiên bản (`lesson_shares`, migration `202610290004`), không cấp quyền dữ liệu lớp. Xem [DD dịch vụ](detail-design/teaching-service.md).

## Thứ tự migration

1. Giai đoạn 1–2: profiles, lessons, lesson_versions, audio_assets; policies và index tương ứng.
2. Giai đoạn 3: classes, enrollments, class_lessons, assignments, assignment_items, submissions, answers, srs_cards, review_events, lesson_progress.
3. Giai đoạn 4: notification_preferences, email_log.
4. Giai đoạn 5: migration 0006 cho luyện nghe đã có; kanji_entries vẫn dự kiến, chưa tạo.
5. Dịch vụ giáo viên: migration 202610290001–0002 thêm teacher_accounts, audit_events, cột capacity/meeting_url/subject/language_tag/instruction_language_tag/revision của classes và các RPC activate_teacher, update_class_settings, read_lesson_version, set_lesson_visibility; join_class khóa hàng lớp để đếm chỗ. Xuất bản giữ nguyên visibility, mặc định class. Migration 202610290003 thêm `lessons.authoring_state`, `creation_request_id`/`creation_fingerprint` (tạo bài idempotent theo request) và RPC create_teaching_lesson, get_teaching_editor, save_teaching_draft; publish_lesson với bài v2 chỉ nhận đúng nháp đã lưu và mọi câu đã được xác nhận. Migration 202610290004 thêm `lesson_shares` (một quyền view/copy đang hiệu lực cho mỗi phiên bản/người nhận, `revoked_at`), `lessons.copied_from_version_id`/`copy_attribution` và RPC share_lesson_version, revoke_lesson_share, copy_shared_lesson, duplicate_lesson; read_lesson_version thêm nhánh người được chia sẻ. Migration 202610290005 thêm `platform_admins`, `platform_settings` (duyệt giáo viên mới, mặc định bật), cột `requested_at`/`access_until`/`admin_note` của teacher_accounts và RPC quản trị có audit.
6. Vừa dạy vừa học (02/11/2026): migration 202611020001–0004 thêm nguồn bài luyện hằng ngày, lớp tự học, `class_sessions` (nhật ký buổi dạy) và chặn công khai lại bản sao. Thu hồi quyền gọi hàm trigger (03/11/2026): migration 202611030003 bỏ EXECUTE của public, anon, authenticated trên mọi hàm trigger trong `public`; helper RLS `teaches_class`/`teaches_assignment` giữ nguyên. Lịch học (03/11/2026): migration 202611030002 thêm `class_schedules` (một dòng mỗi lớp: `slots` jsonb tối đa 14 buổi trong tuần, `note` ≤ 300 ký tự), chỉ service role đọc/ghi.
7. Giai đoạn 6 dự kiến thêm push_subscriptions và API thiết bị; bảng này chưa có migration, Web Push chưa có runtime. notification_preferences đã có cờ push_enabled dự phòng, không đồng nghĩa có bảng subscription.

File migration có thứ tự rõ ràng, kiểm tra trên database trống và database có dữ liệu mẫu trước khi dùng thật.

### Danh sách migration

Tra cứu nhanh, cập nhật tới 09/11/2026; chi tiết ở dòng chú thích đầu mỗi file trong `supabase/migrations` và DD tương ứng. Quy trình tạo và áp dụng ở [vận hành › Migration](operations.md#migration). Xem migration nào đã áp production bằng `npx supabase migration list --linked`.

| Migration | Nội dung |
|---|---|
| `202610280001_foundation` | `profiles`, `lessons`, `lesson_versions`, `audio_assets`, RLS nền |
| `202610280002_lesson_publication` | Xuất bản phiên bản bài từ script nhập |
| `202610280003_sample_lessons` | Bài mẫu giữ nhãn chờ duyệt (`is_sample`) |
| `202610280004_classroom` | Lớp, ghi danh, bài giao, lượt làm, câu trả lời, ôn tập FSRS, tiến độ đọc; mọi thao tác ghi qua RPC |
| `202610280005_notifications` | Tùy chọn nhắc bài, `email_log` có lease cho cron |
| `202610280006_listening` | Số lần nghe trong câu trả lời, tổng hợp nghe của lớp |
| `202610290001_teaching_service` | `teacher_accounts`, `audit_events`, sức chứa/Meet/ngôn ngữ lớp, đọc phiên bản theo quyền |
| `202610290002_teacher_activation` | Kiểm tra tài khoản Auth hẹp cho kích hoạt giảng dạy |
| `202610290003_teaching_authoring` | Bài v2 Việt–Trung theo mẫu, duyệt đáp án theo hash câu |
| `202610290004_lesson_sharing` | `lesson_shares`: chia sẻ một phiên bản, sao chép thành bài mới |
| `202610290005_platform_admin` | `platform_admins`, `platform_settings`: duyệt, tạm dừng, hạn thuê giáo viên |
| `202610290006_daily_practice` | `daily_practice_runs`: mỗi lớp một bài luyện hằng ngày theo ngày Việt Nam |
| `202610300001_learning_history` | `learning_history_archives` (giao diện đã gỡ 04/11/2026, dữ liệu giữ) |
| `202610300002_daily_practice_sixty` | Bài hằng ngày tới 60 câu |
| `202611020001_daily_practice_source` | Lớp ghim bài nguồn cho bài hằng ngày |
| `202611020002_self_study_classes` | Lớp tự học; chủ lớp không tự vào lớp mình dạy (CR-20) |
| `202611020003_class_sessions` | `class_sessions`: nhật ký buổi dạy |
| `202611020004_reshare_guard` | Bản sao bài được chia sẻ không công khai lại |
| `20261102044627_correct_n5_review_answer_variants` | Sửa 14 đáp án tương đương của bài N5 ngày 01/11 (đã duyệt) |
| `202611030001_accept_answer_variants` | `answer_variants`: giáo viên chấp nhận đáp án tương đương, chấm lại bài đã nộp |
| `202611030002_class_schedules` | `class_schedules`: lịch học hằng tuần |
| `202611030003_trigger_function_execute` | Thu hồi quyền gọi trực tiếp hàm trigger |
| `202611040001_remove_and_archive_lessons` | Gỡ bài khỏi lớp, lưu trữ bài |
| `20261104063229_normalize_vocabulary_kanji` | Chuẩn hóa `kanji` trong từ vựng v1, chặn giá trị sai kiểu |
| `20261104110635_daily_listening_count` | `classes.daily_listening_count`: số câu nghe mỗi ngày; `null` giữ câu nghe theo tỉ lệ của bài, `0` bỏ câu nghe, `n` lấy tối đa n câu (giao diện từ 07/11/2026) |
| `20261105012503_submit_expired_attempts` | Tự nộp lượt bỏ dở đã quá hạn của bài không cho nộp muộn ([DD](detail-design/phase-3.md#tự-nộp-lượt-còn-mở-khi-hết-hạn--05112026)) |
| `20261105044634_fix_assignment_question` | `assignment_item_edits` (lịch sử trước/sau), `fix_assignment_question`: giáo viên sửa đề, giải thích, furigana của câu đã giao; trigger snapshot chỉ cho qua đúng thay đổi này ([DD](detail-design/phase-3.md#sửa-lỗi-hiển-thị-bài-đã-giao--05112026)) |
| `20261107044229_daily_practice_seventy` | Bài hằng ngày và bài giao tối đa 70 câu (`set_daily_practice`, `publish_assignment`); áp production ngày 07/11/2026 với đúng mã này |
| `20261109024203_class_session_attendance` | `class_session_attendance` (buổi, học viên, có mặt/vắng; xóa buổi thì xóa theo), `save_session_attendance`: giáo viên điểm danh buổi đã ghi trong nhật ký ([DD](detail-design/teaching-service.md#điểm-danh-trong-nhật-ký-buổi-dạy--06112026)) |
| `20261109032029_jlpt_mock_exams` | `assignment_exams` (cấp N5/N4, số phút mỗi lượt; chỉ chèn khi bài còn nháp), `publish_jlpt_mock_exam`; `check_open_attempt`, `list_expired_attempts`, `submit_expired_attempt` tính giới hạn thời gian theo lượt ([DD](detail-design/phase-3.md#thi-thử-jlpt--09112026)) |
| `20261110085351_lessons_server_writes_only` | Thu hồi quyền INSERT/UPDATE/DELETE trực tiếp trên `lessons` của `authenticated`/`anon` và bỏ hai policy ghi; giáo viên vẫn đọc bài của mình, mọi thao tác ghi đi qua server (service role, RPC). Trước đó giáo viên gọi thẳng Data API được để công khai bản sao bài được chia sẻ, bỏ lưu trữ hoặc ghi nháp mà trình soạn không nhận |

## Mở rộng dữ liệu dịch vụ

Đã migration: teacher_accounts, audit_events, metadata lớp (capacity, subject, language_tag, instruction_language_tag, meeting_url), lesson_shares và nguồn bản sao (mục 5 ở trên). Phần còn lại vẫn là đề xuất trong [DD dịch vụ](detail-design/teaching-service.md): media_assets riêng tư, import_jobs/import_items cho nhập scan, và `locale` cho nội dung. MVP Việt–Trung dùng hướng dẫn Việt, nội dung Trung; môn/ngôn ngữ khác mở sau. Đây là thiết kế dự kiến, không phải các bảng đã triển khai ở trên.

Role độc quyền student/teacher đã được thay bằng khả năng dạy trong teacher_accounts kết hợp enrollment; teacher cũ được backfill active, student cũ không tự thành teacher. Chia sẻ không mở lesson_versions gốc cho mọi giáo viên. Copy remap refs, loại notes/test/dữ liệu lớp và giữ quyền dùng media. Snapshot cũ giữ nguyên, assignment không tự nâng phiên bản theo bài nguồn. Không thêm tiếng Trung bằng cách ép dữ liệu vào trường tiếng Nhật hiện tại.

## Hợp đồng nội dung Việt–Trung v2

V2 tách ngôn ngữ khỏi tên trường Nhật; validator ở `lib/teaching-content.ts`, cùng bảng `lessons`/`lesson_versions` với v1. Ví dụ dưới đây là cấu trúc, không phải bài đã được giáo viên duyệt. Bản triển khai có thêm mảng `dialogue` (speaker/text/reading/meaning/audio). Slide v2 gồm title, note, vocab (1–2 từ), examples (ví dụ thứ `index` của một từ), grammar, dialogue (1–4 lượt) và quiz. Câu hỏi dùng hợp đồng câu v1 với `gradingProfile: "zh-exact-v1"` và inputMode `chinese`/`pinyin`, nên giao bài, chấm và báo cáo dùng lại pipeline hiện có.

```json
{
  "schemaVersion": 2,
  "context": {
    "subject": "chinese",
    "languageTag": "zh-Hans",
    "instructionLanguageTag": "vi-VN",
    "locale": "zh-CN"
  },
  "objectives": ["Chào hỏi và nói tên mình"],
  "vocab": [
    {"id": "v1", "text": "你好", "reading": "nǐ hǎo", "meaning": "Xin chào", "examples": [], "audio": null}
  ],
  "grammar": [],
  "questions": [],
  "slides": [
    {"id": "s1", "type": "title", "text": "Bài đầu: Chào hỏi"},
    {"id": "s2", "type": "vocab", "refs": ["v1"]}
  ]
}
```

Giáo viên chọn languageTag/locale đúng khóa; ví dụ zh-Hans/zh-CN không áp mặc định cho mọi bài Trung. `reading` chứa pinyin ở profile Trung, không tự đồng nghĩa mọi môn có cách đọc. `meaning` theo instructionLanguageTag; câu ví dụ có text/reading/meaning tương ứng. ID/ref, câu choice/fill và điểm giữ nguyên nguyên tắc v1. `audio=null` là chưa có, không báo sẵn sàng.

Thông tin soạn riêng lưu trong `lessons.authoring_state`: bước wizard, template ID/version, đối tượng, kiến thức đầu vào, độ khó gợi ý, giá trị lần dựng gần nhất của từng slide generated (để nhận biết sửa tay) và `reviewedQuestions` (hash md5 của từng câu đã lưu, chỉ server ghi; client gửi lên bị bỏ). Review hash cho audio chưa có vì chưa có TTS web. Không gửi authoring_state, notes hoặc đáp án test qua public DTO. Metadata context được snapshot cùng version, không đọc context draft khi xem version cũ. Metadata cột snake_case map rõ với JSON camelCase, server kiểm tra không mâu thuẫn.

Flashcard, thẻ ôn SRS từ vựng và "từ của ngày" đọc cả v1 và v2 qua `lib/study-words.ts` (từ Nhật hiển thị như trước; từ Trung là chữ Hán, pinyin, nghĩa và giọng theo locale). Tra ngữ pháp `/grammar` vẫn chỉ đọc v1. Độ khó/thứ tự là gợi ý, không khóa quyền học. Mỗi bản v1 giữ nguyên bytes/dữ liệu lịch sử; adapter đọc v1 tiếp tục hỗ trợ Nhật, không viết v2 vào snapshot v1. Migration chỉ backfill metadata ngoài snapshot khi có mapping an toàn và kiểm chứng hồi quy.

Grant chia sẻ, copy, review và media theo DD dịch vụ; quyền đọc JSON không tự cấp quyền storage. Mỗi submission giữ profile chuẩn hóa từ assignment snapshot, không lấy profile mới nhất của bài để chấm lại bài cũ.

# Detail Design giai đoạn 3

> Phạm vi nền Nhật: tài liệu giai đoạn này giữ thiết kế/bằng chứng triển khai trước dịch vụ Việt–Trung; không chứng minh tính năng mới đã có. Thiết kế hiện hành xem [BD dịch vụ](../basic-design/teaching-service.md), [DD dịch vụ](../detail-design/teaching-service.md) và [checklist dịch vụ](../testing/teaching-service.md). Kết quả PASS/Chưa chạy lịch sử được giữ nguyên.

> Tài liệu này mô tả nền lớp học đã triển khai với role student/teacher hiện tại. Yêu cầu dịch vụ ngày 29/10/2026 bổ sung đăng ký giáo viên, vừa học vừa dạy và chia sẻ theo [BD dịch vụ](../basic-design/teaching-service.md); chưa triển khai. Kết quả AUTH-01 cũ chỉ chứng minh luồng cấp quyền thủ công, không phải onboarding giáo viên mới.

Theo [BD](../basic-design/phase-3.md), schema chung 03, chấm/nộp 07. Phiên bản dependency theo lockfile: Supabase JS/SSR, ts-fsrs 5.4.2, wanakana 5.3.1, Supabase CLI 2.122.0 (chỉ dùng cho môi trường local).

## Module

| Module | Trách nhiệm |
|---|---|
| lib/grading/normalize.ts | `normalizeAnswer` đúng 07: NFKC, bỏ mọi khoảng trắng, bỏ một dấu `。．.` cuối |
| lib/grading/raw-answer.ts | Schema câu trả lời thô theo dạng câu, giới hạn kích thước, từ chối trùng/ngoài phạm vi |
| lib/grading/grade.ts | Registry chấm theo `type`, chấm lượt, điểm nguyên, phần trăm và xét đạt không làm tròn |
| lib/assignment.ts | Snapshot câu bài giao, payload theo mode, thời điểm phản hồi, hạn nộp, form câu test |
| lib/srs.ts | Bọc ts-fsrs, trạng thái có phiên bản, chuỗi đúng của thẻ lỗi |
| lib/study-days.ts | Ngày học theo Asia/Ho_Chi_Minh và chuỗi ngày liên tiếp |
| lib/class-report.ts | Lượt mới nhất, trung bình, nhãn học viên, CSV an toàn |
| lib/join-code.ts | Sinh/chuẩn hóa/hiển thị mã lớp |
| lib/server/* | Chỉ chạy server (`server-only`): account (phiên), supabase (service client/RPC), classes, assignments, learner, reviews, reports, api, request-origin |
| lib/local-draft.ts, lib/romaji-input.ts, lib/vietnam-time.ts, lib/test-question-draft.ts, lib/review-ratings.ts | Logic phía trình duyệt dùng chung: bản nháp dự phòng, chuyển romaji, giờ Việt Nam, kiểm tra câu test, nhãn đánh giá (không kéo ts-fsrs vào bundle) |
| components/auth, classroom, review, teach | Form tài khoản; làm bài/kết quả; flashcard/ôn tập; quản lý lớp/giao bài |
| app/actions/* | Server Action cho form: tài khoản, lớp, nội dung lớp, giao/đóng bài |
| app/api/* | Route handler JSON cho làm bài, ôn, tiến độ, CSV, thông tin phiên |
| proxy.ts | Làm mới phiên Supabase trước khi render; không làm gì khi chưa cấu hình |
| supabase/migrations/202610280003, 0004 | Cờ bài mẫu cho publish; bảng/RLS/RPC giai đoạn 3 |
| scripts/seed-local.ts | Chỉ cho Supabase local: tài khoản giảng viên mẫu và 5 bài mẫu |

Logic thuần không import service client. Trang server gọi lib/server trực tiếp, không tự gọi API của chính mình.

## Phiên và tài khoản

- Cookie phiên HttpOnly, SameSite=Lax, Secure ở production (giữ cấu hình hiện có). proxy.ts tạo server client từ cookie request, gọi `auth.getClaims()` để làm mới token và ghi lại cookie lên request/response; matcher bỏ qua `_next`, ảnh, font, audio.
- Danh tính lấy bằng `auth.getUser()` trong lib/server/account.ts; role đọc từ profiles bằng service client sau khi có user. Không tin role trong metadata. Hàm gọi `connection()` trước tiên để mọi trang đọc danh tính luôn render theo request, kể cả khi build không có cấu hình Supabase (tránh prerender trang redirect).
- Form tài khoản là Server Action (POST, kiểm tra Origin của Next.js) với `useActionState`; route handler cũ /api/auth/sign-in, /api/auth/sign-out được thay bằng action, /teach/sign-in chuyển hướng 308 sang /sign-in?next=/teach.
- Đăng ký: Zod kiểm tra họ tên 1–80 ký tự, email ≤ 254, mật khẩu 8–72. `signUp` với `emailRedirectTo = origin + /auth/confirm?next=…`; luôn hiện cùng màn hình "kiểm tra email" để không lộ email đã đăng ký.
- Email xác nhận/đặt lại dùng token hash: template nối `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email|recovery`. GET /auth/confirm gọi `verifyOtp`, chỉ nhận type email/recovery và `next` là đường dẫn nội bộ: `safeNextPath` yêu cầu bắt đầu `/`, không có `\` hay ký tự điều khiển (tab/xuống dòng — trình duyệt bỏ chúng trước khi phân giải, `/\t/evil.example` thành `//evil.example`), và phân giải trên một origin giả vẫn giữ nguyên origin. Cùng quy tắc áp dụng cho `next` của đăng nhập/đăng ký. Recovery chuyển tới /reset-password; lỗi chuyển /sign-in?error=link.
- Quên mật khẩu luôn trả cùng thông báo. Đặt lại yêu cầu phiên từ link recovery, gọi `updateUser({password})` rồi đăng xuất các phiên khác bằng scope others.
- Đăng xuất là action; nút đăng xuất xóa bản nháp cục bộ `reng:draft:*` trước khi gửi form.
- `next` mặc định: học viên /classes, giảng viên /teach.
- Origin dùng cho link email, redirect sau xác nhận và kiểm tra same-origin lấy từ `x-forwarded-host`/`host` (lib/server/request-origin.ts), không lấy từ `request.url`: Next dev báo `localhost` dù trình duyệt dùng 127.0.0.1, làm mất cookie phiên gắn theo host. SITE_URL (nếu đặt) được ưu tiên cho link email.

## Database (migration 202610280004)

Bổ sung đúng các bảng 03 kèm chi tiết triển khai:

- `classes.join_enabled boolean default true` để thu hồi mã mà vẫn giữ mã duy nhất. Mã 8 ký tự `[A-HJKMNP-Z2-9]` (không có 0/O/1/I/L), sinh ở server bằng `crypto.randomInt`, thử lại khi trùng.
- `class_lessons`: FK `(lesson_id, lesson_version_id)` tới lesson_versions; UNIQUE `(class_id, order_no)`.
- `assignments`: FK `(lesson_id, lesson_version_id)` và `(class_id, lesson_id)` tới class_lessons; CHECK practice chỉ after_submit, test chỉ một lượt, after_due bắt buộc due_at, `(status = 'draft') = (published_at is null)`. Trigger: sau xuất bản chỉ đổi `title` và `published → closed`; không xóa.
- `assignment_items`: CHECK snapshot là object có `id = question_id`; trigger chặn thêm/sửa/xóa khi bài không còn draft.
- `submissions`: CHECK trạng thái submitted phải có score/max_score/passed/is_late/submitted_at; unique partial index một lượt in_progress mỗi assignment/user; trigger chặn sửa/xóa lượt đã nộp.
- `answers`, `review_events`: bất biến (trigger chặn update/delete).
- `srs_cards.revision int` cho compare-and-swap, `created_at/updated_at`.
- `join_attempts(user_id, succeeded, attempted_at)` để giới hạn thử mã.
- Index theo 03: classes.teacher_id, enrollments.user_id, assignments(class_id, due_at), submissions(assignment_id, user_id, submitted_at), submissions.user_id, srs_cards(user_id, due), review_events(user_id, reviewed_at).

RLS bật trên mọi bảng mới. `anon` không có quyền; `authenticated` chỉ SELECT: giảng viên đọc lớp/thành viên/nội dung/bài giao/snapshot/lượt/câu trả lời thuộc lớp mình và hồ sơ học viên lớp mình; học viên đọc srs_cards/review_events/lesson_progress của mình. Không cấp INSERT/UPDATE/DELETE cho client; mọi ghi qua server.

## RPC

Tất cả `set search_path = ''`, chỉ `service_role` được execute; server gọi sau khi xác thực user và truyền `p_user_id`/`p_teacher_id` từ phiên. RPC kiểm tra lại quyền trong transaction. Trạng thái nghiệp vụ trả về dạng mã (không rollback dữ liệu cần giữ như lượt thử mã); lỗi bất biến dùng exception `reng:<code>`.

| RPC | Hợp đồng |
|---|---|
| join_class(user, code) | Chỉ student. ≥ 8 lần sai trong 15 phút → rate_limited. Mã không có/đã thu hồi/lớp ngừng → invalid_code và ghi lượt sai. Đã là thành viên → already_member; đã rời → vào lại với joined_at mới. |
| upsert_class_lesson(teacher, class, lesson, version, order, available_at) | Lớp và bài thuộc giảng viên; version thuộc bài; thứ tự trùng → reng:order_taken |
| publish_assignment(teacher, class, lesson, title, mode, due, allow_late, pass, attempts, policy, practice_ids, test_questions) | Lấy version đang ghim của lớp; practice sao chép câu theo ID từ content của version đó, test nhận câu riêng; 1–50 câu, ID duy nhất; hạn phải ở tương lai; tạo draft + items rồi chuyển published trong cùng transaction |
| close_assignment(teacher, assignment) | published → closed; lượt đang làm không nộp được nữa |
| start_attempt(user, assignment) | Advisory lock theo assignment/user. Kiểm tra thành viên còn hoạt động, bài published thuộc lớp, available_at ≤ now, lớp active, hạn/nộp muộn. Có lượt in_progress → resumed; còn lượt → started với attempt_no kế tiếp; hết → no_attempts_left |
| save_attempt_draft(user, submission, revision, draft) | Khóa lượt; revision sai → conflict kèm revision hiện tại; đã nộp/đóng/quá hạn không cho muộn → mã tương ứng; thành công tăng revision, last_saved_at = now |
| submit_attempt(user, submission, revision, draft, results, score, max) | Khóa lượt; đã nộp → already_submitted (không ghi thêm). Kiểm tra lại thành viên, trạng thái, hạn, revision. results phải phủ đúng tập câu, điểm từng câu là 0 hoặc points của snapshot, tổng khớp. Ghi answers, kết quả, is_late = now > due_at, passed = score·100 ≥ pass·max; tạo/mở lại thẻ lỗi cho câu sai với due = now (test after_due: max(now, due_at)) |
| record_review(user, card key, request, revision, rating, correct, state, due, streak, resolved, version) | request_id đã có → duplicate; revision null chỉ tạo thẻ vocab mới; revision sai → conflict; cập nhật thẻ và ghi review_event cùng transaction |
| assignment_question_stats(assignment) | SQL lượt mới nhất của 07, trả câu sai ≥ 50% |
| class_roster(class) | security definer; họ tên, email, joined_at, left_at của thành viên lớp |

Migration 202610280003 thay publish_lesson bằng bản có `p_is_sample boolean default false` để bài mẫu nạp vào Supabase local vẫn mang nhãn chờ duyệt; lời gọi 9 tham số của script import giữ nguyên.

## Chấm điểm và payload

- Draft lưu `{answers: {questionId: raw}, checked: questionId[]}`; choice raw là mảng chỉ số, fill là chuỗi ≤ 200 ký tự; tổng JSON ≤ 32 KB. Câu không có trong snapshot, chỉ số trùng/ngoài phạm vi, single choice nhiều hơn một lựa chọn bị từ chối 400.
- Chấm theo 07: choice so tập chỉ số; fill/dictation so chuỗi đã chuẩn hóa với từng đáp án khai báo; match tập cặp đầy đủ; order đúng trình tự; listen theo responseType; trống tính 0. Registry theo type nên thêm dạng mới không sửa grader cũ.
- Snapshot bài giao dùng `questionSchema` của bài học; giai đoạn 3 chỉ cho choice/fill vào bài giao. Câu test do form tạo có ID `t1…tn`; `kanjiStrict` yêu cầu mọi đáp án chứa kanji.
- Payload làm bài: practice có answer/explain để chấm tại chỗ bằng cùng lib/grading; test chỉ có id/type/prompt/options/multiple/inputMode/points. Kết quả chỉ trả khi practice/after_submit đã nộp, hoặc after_due và now ≥ due_at; trước đó chỉ trả submittedAt.
- Practice: câu đã bấm kiểm tra được ghi vào `checked` và khóa trên UI. Đây là quy tắc trải nghiệm; điểm báo cáo vẫn chấm lại ở server từ raw.

## Làm bài trên trình duyệt

- Trang S11 không tạo lượt khi GET. Nút bắt đầu gọi POST /api/assignments/[id]/attempts rồi làm mới trang.
- Runner chỉ render phía client (`next/dynamic`, `ssr: false`) để khôi phục bản cục bộ ngay trong state ban đầu, không lệch hydrate và không setState trong effect. Key của runner gồm submission và revision nên "Tải bản mới nhất" (router.refresh) mount lại với draft server.
- Hộp xác nhận nộp nằm trong thanh công cụ dính dưới cùng, focus vào nút xác nhận; trên điện thoại mỗi lần hiện một câu và chuyển câu thì lưu ngay.
- Autosave debounce 800 ms sau thay đổi và ngay khi chuyển câu/nộp; chỉ một request lưu tại một thời điểm, thay đổi mới xếp hàng. Trạng thái: đang lưu, đã lưu (theo phản hồi server), chưa lưu do mất mạng, xung đột.
- Bản dự phòng localStorage `reng:draft:{userId}:{submissionId}` gồm draft và revision gốc; ghi khi thay đổi, xóa khi lưu thành công/nộp/đăng xuất. Khi có mạng: revision gốc bằng revision server thì gửi; khác thì báo xung đột và chỉ cho tải bản mới, không tự ghi đè.
- Lượt lưu đã tới server nhưng mất phản hồi (30/10/2026): client nhớ tối đa 5 bản đã gửi mà chưa nhận phản hồi, ghi cả vào bản dự phòng (trường `unconfirmed`). Server trả 409 conflict kèm draft hiện tại; nếu draft đó trùng một bản đã gửi (`isSameAttemptDraft`: chuẩn hóa bằng `parseAttemptDraft`, bỏ qua thứ tự khóa vì jsonb không giữ) thì đó là lượt lưu của chính trình duyệt này: nhận revision server rồi gửi tiếp thay đổi mới hơn. Mở lại trang cũng khôi phục bản dự phòng có revision gốc cũ khi draft server trùng một bản đã gửi. Draft server khác mọi bản đã gửi vẫn là xung đột thật như trên. Nộp bài khi đang ở trạng thái mất mạng/lỗi sẽ thử lưu lại trước.
- Ô điền tiếng Nhật chuyển romaji bằng wanakana `toKana` IMEMode trên đoạn Latin ngay trước con trỏ (hiragana/japanese → hiragana, katakana → katakana; chữ hoa → katakana). Không chuyển khi đang composition có ký tự Nhật (IME Nhật); composition chữ Latin của bàn phím Android vẫn được chuyển. Kanji/kana dán vào được giữ nguyên.

## Ôn tập

- ts-fsrs 5.4.2 tham số mặc định, `enable_fuzz=false`; `scheduler_version = "ts-fsrs-5.4.2"`. scheduler_state lưu đủ trường Card (ngày ISO) và được Zod kiểm tra theo phiên bản; phiên bản khác bị từ chối, không đoán.
- Thẻ vocab: source_id = lesson_id, item_id = vocab id; nội dung đọc từ phiên bản công khai hiện hành, mục đã bị gỡ thì bỏ qua và báo. Học viên tự chấm 1–4.
- Thẻ lỗi: source_id = assignment_id, item_id = question_id; nội dung từ snapshot, chỉ hiện khi bài cho phép xem đáp án. Ôn phải trả lời, server chấm bằng lib/grading; đúng → Good, sai → Again. Chỉ ôn khi due ≤ now; đúng tăng chuỗi, sai về 0, đủ 3 thì resolved_at = now, sai lại mở lại.
- POST /api/reviews nhận requestId UUID do client tạo; request đã ghi được nhận diện trước mọi kiểm tra hạn/revision nên retry sau khi mất phản hồi trả lại kết quả, không ghi trùng. Xung đột revision trả 409 để client bỏ qua thẻ.
- Flashcard S07 dùng phiên bản công khai hiện hành của bài (ID mục ổn định qua phiên bản), không theo phiên bản lớp ghim; khách lật thẻ không cần tài khoản, học viên đăng nhập mới lưu lịch ôn.
- Chuỗi ngày học: ngày Việt Nam có review_event hoặc submitted_at; tính liên tiếp tới hôm nay, hoặc tới hôm qua nếu hôm nay chưa học.

## API

| Endpoint | Hợp đồng |
|---|---|
| GET /api/me | `{user: null}` hoặc `{user: {name, role}}`, no-store |
| POST /api/assignments/[id]/attempts | 200 `{submissionId, status}`; 401; 404; 409 `{code}` not_available/closed/past_due/no_attempts_left |
| PUT /api/submissions/[id]/draft | Body `{revision, draft}`; 200 `{revision, savedAt}`; 409 `{code: "conflict", revision, draft}` hoặc submitted/closed/past_due |
| POST /api/submissions/[id]/submit | Body `{revision, draft}`; 200 `{status}`; cùng mã 409 như trên; nộp lại trả 200 already_submitted |
| POST /api/reviews | Body `{requestId, itemType, sourceId, itemId, rating?, answer?, revision}`; 200 thẻ mới; 409 conflict/not_due; 404 |
| POST /api/lessons/[id]/progress | Body `{versionId}`; đánh dấu đọc xong bài có trong database |
| GET /api/me/agenda | Học viên: số thẻ đến hạn và tối đa 3 bài đang chờ cho trang chủ; người khác `{agenda: null}`. Thứ tự (`compareDueUrgency`): bài còn hạn (hạn gần nhất trước), bài không hạn, rồi bài quá hạn còn cho nộp muộn (mới nhất trước) để bài luyện bị lỡ không che bài hôm nay. Lượt đang làm của bài đã đóng hoặc quá hạn không cho muộn tính là đóng/quá hạn, không phải việc đang chờ |
| GET /api/teach/classes/[id]/report | CSV cho giảng viên chủ lớp; UTF-8 BOM, CRLF, `Content-Disposition: attachment`, `Cache-Control: private, no-store` |

Mọi API trả `Cache-Control: private, no-store`, body ≤ 64 KB, kiểm tra JSON bằng Zod, không ghi đáp án/nội dung bài nộp vào log. POST/PUT kiểm tra Origin cùng origin.

## Báo cáo

- Lượt mới nhất: submitted, sắp theo submitted_at rồi attempt_no giảm dần. Phần trăm bài = score/max_score·100. Trung bình học viên = trung bình phần trăm các bài có lượt nộp; hiển thị kèm đã nộp/được giao (bài published/closed có published_at ≥ joined_at).
- Nhãn: abandoned nếu hai bài có hạn gần nhất đã quá hạn đều chưa có lượt nộp; failing nếu trung bình < classes.pass_score; weak_listening nếu đạt nhưng điểm nghe < 60% hoặc nghe trung bình > 3; passing; no_data nếu chưa có lượt nộp. Giai đoạn 3 chưa có câu nghe nên weak_listening chỉ được kiểm chứng ở hàm thuần.
- Bốn ô T03: tổng lượt nộp mới nhất, trung bình lớp (trung bình các học viên có dữ liệu), số học viên đạt, số cần chú ý (failing/abandoned/weak_listening).
- CSV: Họ tên, Email, Đã nộp, Được giao (hai cột để bảng tính không hiểu "3/5" là ngày), Điểm TB (%), mỗi bài một cột (%), Nhãn, Ngày học gần nhất. Ô trống khi chưa có điểm. Bao chuỗi bằng nháy kép, nhân đôi nháy; ô bắt đầu `= + - @`, tab hoặc CR được thêm `'`.
- "Được giao" gồm bài xuất bản từ lần vào lớp hiện tại, cộng bài cũ hơn nếu học viên đã tự nộp. Báo cáo chỉ liệt kê thành viên đang hoạt động, kèm số học viên đã rời.

## Môi trường local

- `npx supabase start` (Docker hoặc Podman qua DOCKER_HOST) dùng supabase/config.toml: chỉ db/auth/rest/kong/mailpit, bật xác nhận email, redirect 127.0.0.1:3000 và 3218, template email token hash trong supabase/templates. Với Podman, `supabase stop` có thể báo StopContainerError dù container đã dừng; `supabase start` lại khởi động từ volume, dữ liệu local được giữ.
- `npm run seed:local` từ chối URL không phải 127.0.0.1/localhost; tạo giảng viên mẫu đã xác nhận, cấp role bằng service key và xuất bản 5 bài mẫu với is_sample = true.
- `npm run test:e2e:supabase` chạy Playwright riêng (cổng 3218, LESSON_SOURCE=supabase, thư mục e2e-supabase) với khóa đọc từ `supabase status`, từ chối URL không phải local; global setup đặt mật khẩu ngẫu nhiên cho giảng viên mẫu. Bộ E2E mặc định vẫn không cần dịch vụ. Next không cho hai dev server cùng thư mục `.next`; dừng server dev khác trước khi chạy E2E.

## Lỗi

| Lỗi | Hành vi |
|---|---|
| Chưa cấu hình Supabase | Trang tài khoản/lớp báo chưa kích hoạt; API 503; proxy bỏ qua |
| Phiên hết hạn trong lúc làm bài | API 401; bản cục bộ giữ draft; UI mời đăng nhập lại rồi quay về |
| RPC/network lỗi | Thông báo thử lại; không báo "Đã lưu"; không mất bản cục bộ |
| JSON sai/vượt kích thước | 400, không ghi |
| Mã RPC không biết | 500 chung, không lộ chi tiết SQL |

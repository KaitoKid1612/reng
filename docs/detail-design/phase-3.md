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
| lib/study-days.ts | Ngày học theo Asia/Ho_Chi_Minh, chuỗi ngày liên tiếp, đầu tuần thứ Hai |
| lib/class-report.ts | Lượt mới nhất, trung bình, nhãn học viên, kết quả từng bài, tỉ lệ nộp bài đã đến hạn trong tuần, CSV an toàn |
| lib/weekly-scores.ts | Điểm trung bình theo tuần nộp cho biểu đồ ở `/progress`; tuần không có bài có điểm giữ `null` |
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
- Đặt mật khẩu mới (`/reset-password` và action `resetPassword`) chỉ khi phiên được mở từ link email trong 1 giờ: `canSetNewPassword` đọc `amr` qua `getClaims` (đã xác thực chữ ký) và `isRecentEmailLinkSession` (`lib/auth-sessions.ts`) nhận các phương thức link email (`otp`, `email`, `recovery`, `magiclink`, `email/signup`; Supabase local trả `otp`). Phiên đăng nhập bằng mật khẩu thấy lời mời gửi link mới thay cho form (CR-29, 03/11/2026).
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
- Ô điền tiếng Nhật chuyển romaji bằng wanakana `toKana` IMEMode trên đoạn Latin ngay trước con trỏ (hiragana/japanese → hiragana, katakana → katakana; chữ hoa → katakana). Không chuyển khi đang composition có ký tự Nhật (IME Nhật); composition chữ Latin của bàn phím Android vẫn được chuyển. Kanji/kana dán vào được giữ nguyên. Từ 04/11/2026 đoạn được chuyển gồm cả dấu `, . ? !` như bộ gõ tiếng Nhật (`、。？！`), để "hai,soudesu" khớp đáp án はい、そうです.
- Câu luyện tập đã bấm Kiểm tra (04/11/2026): `QuestionField` nhận `revealedChoices` (`correctChoiceIndexes`) và tô ngay trên danh sách lựa chọn: đáp án đúng viền xanh kèm ✓, lựa chọn sai đã chọn viền đỏ kèm ✗, kèm chữ ẩn cho trình đọc màn hình. Bài kiểm tra không có khóa đáp án trên trang nên không tô. Bấm nút Kiểm tra thì focus chuyển vào thẻ câu (như khi nhấn Enter), không rơi về đầu trang.
- Hiển thị đáp án: câu nhiều đáp án nối các lựa chọn bằng " + " (cần chọn đủ), đáp án gõ thay thế nối bằng " / ". Các đáp án gõ chấm giống nhau (dấu 。 cuối, khoảng trắng, chữ hoa với tiếng Việt) chỉ hiện một lần (`typedAnswerKey` trong `lib/grading/grade.ts`). Chép chính tả nhập "Văn bản" chấm như câu điền văn bản tiếng Việt.
- Đọc snapshot (`parseSnapshotQuestion`): đáp án đã chấp nhận được gộp vào snapshot cả khi câu sau đó bật kanji bắt buộc; lúc đọc, đáp án không có kanji của câu kanji bắt buộc bị bỏ qua thay vì làm lỗi cả bộ bài. Câu chỉ toàn đáp án kana vẫn báo lỗi như lỗi soạn bài.

## Ôn tập

- ts-fsrs 5.4.2 tham số mặc định, `enable_fuzz=false`; `scheduler_version = "ts-fsrs-5.4.2"`. scheduler_state lưu đủ trường Card (ngày ISO) và được Zod kiểm tra theo phiên bản; phiên bản khác bị từ chối, không đoán.
- Thẻ vocab: source_id = lesson_id, item_id = vocab id. Nội dung đọc từ phiên bản lớp ghim cho học viên (`findClassLessonVersions` trong `lib/server/lesson-access.ts`: lớp đang hoạt động, bài đã mở, lớp mở bài gần nhất trước, cùng thứ tự với `read_lesson_version`). Không ở lớp nào có bài thì đọc bản hiện hành (bài công khai, chủ bài). Mục không còn trong bản đó thì bỏ qua. Học viên tự chấm 1–4.
- Hàng ôn (`listDueCards`): đọc từng trang 200 thẻ đến hạn, tối đa 5 trang, thứ tự cố định `due, item_type, source_id, item_id`. Thẻ không mở được (rời lớp, bài bị gỡ, test chưa tới giờ xem đáp án) bị bỏ qua mà không che thẻ phía sau. Phiên lấy tối đa 50 thẻ; trang ôn, Lớp của tôi và trang chủ đọc thêm một thẻ để biết còn thẻ (`hasMoreDueCards`, hiện "50+"). `getLearnerAgenda` đếm thêm số thẻ lỗi trong 50 thẻ đó (`dueMistakeCount`); `describeDueReview` trong `lib/learner-today.ts` dùng số này để đặt tên dòng ôn (từ vựng, câu sai hoặc cả hai).
- Thẻ lỗi: source_id = assignment_id, item_id = question_id; nội dung từ snapshot, chỉ hiện khi bài cho phép xem đáp án. Ôn phải trả lời, server chấm bằng lib/grading; đúng → Good, sai → Again. Chỉ ôn khi due ≤ now; đúng tăng chuỗi, sai về 0, đủ 3 thì resolved_at = now, sai lại mở lại. Phản hồi chấm và Sổ lỗi có `transcript` của câu nghe/chép chính tả (04/11/2026). Phiên ôn đặt `key` theo từng thẻ lỗi để số lần nghe, audio và mảnh câu không mang sang thẻ sau; Enter trong ô gõ gửi câu trả lời (đọc từ ref để đã hoàn tất "n" cuối); focus chuyển sang Thẻ tiếp theo khi có kết quả và sang thẻ mới khi chuyển thẻ.
- POST /api/reviews nhận requestId UUID do client tạo; request đã ghi được nhận diện trước mọi kiểm tra hạn/revision và trước khi chấm, nên retry sau khi mất phản hồi trả lại kết quả đã lưu (`review_events.is_correct`), không chấm lại câu trả lời gửi kèm và không ghi trùng. Client khóa câu trả lời đã gửi; nút đổi thành "Gửi lại câu trả lời" và gửi đúng câu đó. Xung đột revision trả 409 để client bỏ qua thẻ.
- Flashcard S07 đọc phiên bản trong `?version=` khi người xem mở được bản đó (link từ trang lớp mang bản lớp ghim, link từ trang bài mang bản đang đọc). Không có hoặc không mở được thì dùng bản lớp ghim, rồi bản hiện hành như thẻ vocab. Chấm thẻ gửi kèm `versionId` của bộ thẻ để server kiểm tra từ trong đúng bản đang hiển thị. Khách lật thẻ không cần tài khoản, học viên đăng nhập mới lưu lịch ôn.
- Chuỗi ngày học: ngày Việt Nam có review_event hoặc submitted_at; tính liên tiếp tới hôm nay, hoặc tới hôm qua nếu hôm nay chưa học. `getStudyActivity` đọc 400 bài nộp mới nhất và từng trang 1.000 lượt ôn (tối đa 10 trang) tới khi ngày trống đầu tiên của chuỗi nằm trong khoảng đã đọc (`isStreakSettled` trong `lib/study-days.ts`).

## API

| Endpoint | Hợp đồng |
|---|---|
| GET /api/me | `{user: null}` hoặc `{user: {name, role, isAdmin}}`, no-store |
| POST /api/assignments/[id]/attempts | 200 `{submissionId, status}`; 401; 404; 409 `{code}` not_available/closed/past_due/no_attempts_left |
| PUT /api/submissions/[id]/draft | Body `{revision, draft}`; 200 `{revision, savedAt}`; 409 `{code: "conflict", revision, draft}` hoặc submitted/closed/past_due |
| POST /api/submissions/[id]/submit | Body `{revision, draft}`; 200 `{status}`; cùng mã 409 như trên; nộp lại trả 200 already_submitted |
| POST /api/reviews | Body `{kind: "vocab", requestId, lessonId, vocabId, rating, revision, versionId?}` hoặc `{kind: "mistake", requestId, assignmentId, questionId, answer, revision}`; 200 thẻ mới; 409 conflict/not_due; 404 |
| POST /api/lessons/[id]/progress | Body `{versionId}`; đánh dấu đọc xong bài có trong database |
| PATCH /api/lessons/[id]/progress | Body `{versionId, slideId}`; lưu slide học viên đang xem (`last_slide_id`), không đổi dấu đọc xong (07/11/2026, [DD](teaching-service.md#số-câu-nghe-mỗi-ngày-bài-70-câu-và-mở-lại-slide--0711-và-09112026)) |
| GET /api/me/agenda | Học viên: các dòng "Hôm nay học gì" đã dựng sẵn (`rows`) và `moreAssignmentCount` cho trang chủ, cùng kế hoạch với Lớp của tôi (`planLearnerToday`, xem [teaching-service](teaching-service.md#hôm-nay-học-gì--03112026)); người khác `{agenda: null}`. Danh sách đủ của Lớp của tôi vẫn theo `compareDueUrgency`: bài còn hạn (hạn gần nhất trước), bài không hạn, rồi bài quá hạn còn cho nộp muộn (mới nhất trước). Lượt đang làm của bài đã đóng, hoặc quá hạn mà không cho nộp muộn, tính là đóng/quá hạn, không phải việc đang chờ |
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

## Tự nộp lượt còn mở khi hết hạn — 05/11/2026

Trước đây lượt học viên bỏ dở (đóng trang, mất mạng trước khi đồng hồ tự nộp lúc còn 1 phút) của bài **không cho nộp muộn** thành chỉ đọc sau hạn và không bao giờ được chấm: `check_open_attempt` trả `past_due` nên cả lưu nháp lẫn nộp đều bị từ chối.

- Migration `20261105012503_submit_expired_attempts.sql` (chỉ `service_role` được gọi):
  - `list_expired_attempts(p_limit)` trả `submission_id`, `assignment_id`, `draft_revision`, `draft_answers` của lượt `in_progress` khi bài giao đang `published`, có `due_at` đã qua, `allow_late = false`, lớp còn `active`, học viên chưa rời lớp và **chưa có lượt nào đã nộp** cho bài đó. Tối đa 500 dòng, hạn sớm nhất trước.
  - `submit_expired_attempt(p_submission_id, p_expected_revision, p_results, p_score, p_max_score, p_mistake_state, p_scheduler_version)` khóa dòng, kiểm tra lại đúng các điều kiện trên (sai thì `not_expired`), so `draft_revision` (`conflict`), kiểm tra kết quả như `submit_attempt` (`invalid_results`), ghi `answers`, đặt `status = 'submitted'`, `submitted_at = due_at`, `is_late = false`, giữ nguyên `draft_answers`, và tạo thẻ lỗi đến hạn ngay (hạn đã qua nên bài kiểm tra `after_due` cũng đã được xem đáp án). Gọi lại trả `already_submitted`.
- `submitExpiredAttempts` (`lib/server/assignments.ts`) đọc tối đa 200 lượt mỗi lần, ngừng bắt đầu lượt mới sau 30 giây (`left` đếm phần chờ lần sau), đọc snapshot một lần cho mỗi bài giao, kiểm tra nháp đã lưu bằng cùng parser với API nộp (nháp không đọc được thì bỏ qua, không nộp thành 0 điểm), chấm bằng `gradeAttempt` rồi gọi RPC. Mỗi lượt lỗi chỉ ghi log mã lỗi và ID lượt.
- Cron `/api/cron/daily-practice` (6:00 Việt Nam) chạy việc này **sau** khi giao bài hằng ngày và tách lỗi riêng: thiếu migration hay lỗi database chỉ ghi `Expired attempts job failed`, bài hằng ngày vẫn trả bình thường. Kết quả thêm `expiredAttempts: { submitted, skipped, failed, left }`. Route đặt `maxDuration = 60`.
- Giao diện: `isHandedInAtDeadline` (`lib/assignment.ts`) nhận ra lượt có `submitted_at` đúng bằng hạn. Trang kết quả của học viên ghi "Reng tự nộp lúc hết hạn … với các câu đã lưu"; trang chi tiết học viên của giáo viên ghi "(học viên chưa bấm Nộp)". Hướng dẫn `/guide` nói cho cả hai vai.
- Kiểm chứng: `tests/expired-attempts-migration.test.ts` (PGlite) — chỉ lượt đủ điều kiện được liệt kê; lượt làm lại khi đã có lượt nộp, học viên đã rời lớp, bài cho nộp muộn và bài chưa tới hạn đều bị bỏ qua; `conflict`, `invalid_results`, `already_submitted`; điểm, `submitted_at = due_at`, thẻ lỗi; `authenticated` không gọi được. Unit test `isHandedInAtDeadline`.
- Supabase local (05/11/2026, áp migration bằng `psql`, một bài giao hạn đã qua 1 giờ với lượt mở đã trả lời 1/2 câu, gọi cron bằng `CRON_SECRET`): lần 1 trả `expiredAttempts: { submitted: 1 }`, lượt thành `submitted`, `submitted_at` bằng hạn, `is_late = false`, 2 dòng `answers`; lần 2 `submitted: 0`; sai secret 401. Xóa tạm hai hàm (giống production chưa áp migration): HTTP 200, bài hằng ngày vẫn trả `exists`, `expiredAttempts: { code: "job_failed" }` và log `Expired attempts job failed database_error`. Chưa xem trang kết quả bằng trình duyệt.
- Production: migration đã áp (danh sách `npx supabase migration list --linked` ngày 11/11/2026 khớp repo).

## Bài giao chỉ đọc phần cần của phiên bản bài — 05/11/2026

Sự cố production sáng 05/11/2026: mở bài tập (`/assignments/[id]`) hiện "Trang chưa hiển thị được" với hai bài giao trong ngày. Log Vercel: `ZodError` tại `content.slides` ("expected array to have >=1 items") từ `parseDatabaseVersion`, gọi bởi `getStudentAssignment`. Trang bài tập đọc **toàn bộ** phiên bản bài (`select("*")`) và kiểm tra theo hợp đồng của trang đọc bài (ít nhất một slide, mọi phần nội dung) chỉ để lấy tiêu đề, nên một phiên bản không có slide làm hỏng trang bài tập của mọi học viên được giao từ phiên bản đó.

- `lib/server/assignments.ts`: `loadVersionTitle` chỉ đọc `title` cho trang bài tập; `loadVersionQuestions` chỉ đọc `content->questions` và kiểm tra bằng `questionSchema` (chung cho v1 và v2) cho `listAssignablePracticeQuestions`, nên cron bài hằng ngày và trang Giao bài vẫn chạy với ngân hàng câu không có slide. Bỏ hàm đọc cả phiên bản.
- Đính chính (05/11/2026, cùng ngày): `npm run bank:sql` đọc file bằng `lessonDraftSchema` của `lib/lesson-schema.ts`, schema này đã đòi ít nhất một slide, và `npm run daily:import` kiểm tra đủ hợp đồng xuất bản; trình soạn cũng chặn khi xuất bản. Vì vậy các đường trong repo không tạo ra phiên bản 0 slide, và chặn thêm ở `bank:sql` đã được gỡ vì thừa. Nguồn của phiên bản đó vẫn chưa rõ, nhiều khả năng là SQL ghi thẳng vào database.
- Trang đọc bài, flashcard, nghe theo bài vẫn cần đủ hợp đồng; phiên bản không có slide vẫn không mở được ở "Đọc bài". Cách sửa dữ liệu: thêm một slide ghi chú vào bài, xuất bản và cập nhật lớp lên phiên bản mới (phiên bản cũ không sửa được; bài giao cũ vẫn mở được nhờ thay đổi trên).
- Kiểm chứng (Supabase local): bài 0 slide xuất bản bằng SQL, giao cho học viên demo. Code cũ: trang bài tập hiện "Trang chưa hiển thị được", log có cùng lỗi `content.slides`. Code mới: trang hiện tiêu đề bài và nút Bắt đầu làm bài. Đặt bài đó làm nguồn bài hằng ngày rồi gọi cron: tạo bài "Luyện tập hằng ngày" 2 câu, `failed: 0`. REST trả đúng `{ questions: [...] }` cho `select=questions:content->questions`.

## Furigana trong bài tập — 05/11/2026

Người dùng báo học viên lớp N5 chưa đọc được nhiều kanji trong bài luyện hằng ngày, và đề xuất lưu `furigana: [{ text, reading }]` cạnh `prompt`. Bài tập dùng lại cú pháp `{漢字|かんじ}` đã có ở trang đọc bài, slide và tra ngữ pháp, không thêm trường mới:

- Mảng riêng sẽ là khóa mới trong câu hỏi, mà các schema câu hỏi đều `.strict()`: ghi vào database trước khi code mới deploy sẽ làm hỏng trang như sự cố cùng sáng. Khớp theo chuỗi cũng mơ hồ khi một chữ có hai cách đọc trong một câu (日 trong 日曜日, 何 trong 何時), và mảng chỉ phủ đề, trong khi 180/1.304 câu trong repo có kanji ở lựa chọn. Dấu đặt ngay trong chữ thì đúng vị trí, dùng được ở mọi trường, và code cũ chỉ hiện dấu ngoặc chứ không lỗi.
- Lưu trữ: dấu nằm trong `prompt`, `passage`, `options`, `tokens[].text`, `explain`, `transcript`. Không đổi schema hay database; phiên bản bài và snapshot bài giao cũ giữ nguyên.
- Hiển thị: `FuriganaText` (`components/lessons/japanese-text.tsx`) chỉ đổi dấu thành `<ruby lang="ja">` và giữ nguyên phần còn lại, nên câu tiếng Trung không bị gắn `lang="ja"`. Dùng ở `QuestionField`, `OrderField`, `PassageDetails`, `AnswerFeedback`, `ResultRow` (trang kết quả, lịch sử bài hằng ngày), sổ lỗi, trang chi tiết học viên, danh sách câu khó, danh sách chọn câu ở trang Giao bài và slide câu luyện. Câu đang xếp đọc cho trình đọc màn hình và email tóm tắt lớp dùng `toPlainJapanese`.
- Audio: `planContentAudio` đọc transcript bằng `toSpeechText` như từ vựng và ví dụ. 90 transcript trong repo không có dấu, `〜` hay khoảng trắng đầu cuối, nên hash audio không đổi.
- Kiểm tra khi xuất bản: `describeFuriganaProblem` (`lib/lesson-draft.ts`) chạy trong trình soạn và `daily:import`; `bank:sql` gọi `findFuriganaProblems`. Từ chối: dấu viết sai; chữ gốc không có kanji hay chữ số (`{8つ|やっつ}` được) hoặc cách đọc không phải kana; furigana trong đáp án học viên gõ; câu có tag `kanji` có furigana ở đề hay lựa chọn; cách đọc trên đề trùng đáp án gõ hoặc lựa chọn đúng; cách đọc (từ 2 chữ) trên lựa chọn đúng có trong đề. 1.993 dấu đang có trong nội dung bài đều đúng luật này.
- Reng không tự thêm furigana. Giáo viên viết trong trình soạn rồi xuất bản và cập nhật lớp lên phiên bản mới; ngân hàng câu sửa file rồi xuất bản bằng `bank:sql` (tự chuyển các lớp của chủ bài sang phiên bản mới). Bài giao đã tạo giữ snapshot cũ; bài luyện hằng ngày tạo sau đó lấy phiên bản lớp đang dùng.
- Bài đã giao (ví dụ bài hằng ngày đang làm): giáo viên sửa từng câu ở `/teach/assignments/[id]`, hoặc thêm furigana cho nhiều câu một lần bằng `npm run furigana:sql` ([mục dưới](#sửa-lỗi-hiển-thị-bài-đã-giao--05112026)).
- Kiểm chứng: `tests/question-furigana.test.ts` (liệt kê dấu, ruby, câu tiếng Trung giữ nguyên, các luật xuất bản, audio). Supabase local ở 390px, bài giao có furigana ở đề, lựa chọn và giải thích: trang làm bài hiện ruby 昨日/きのう, 学校/がっこう, 行/い, 来/き, 毎朝/まいあさ, 7時/しちじ; phản hồi Kiểm tra câu này và trang kết quả hiện ruby; không còn dấu ngoặc nhọn. `npm run check` đạt 274 test. E2E chưa chạy.

## Sửa lỗi hiển thị bài đã giao — 05/11/2026

Câu trong bài giao là snapshot chép từ bài nguồn lúc giao, và trigger `assignment_items_guard` chặn mọi thay đổi (trừ thêm đáp án tương đương khi chấm lại). Giáo viên thấy đề sai hoặc học viên không đọc được (ví dụ câu 9 bài hằng ngày 05/11: 「雑誌が 一冊 あります。」 với học viên chưa đọc được 雑誌) trước đây không sửa được gì.

- Migration `20261105044634_fix_assignment_question.sql`:
  - `assignment_item_edits(assignment_id, question_id, editor_id, before_snapshot, after_snapshot, created_at)`, khóa ngoại tới `assignment_items`; chỉ service role đọc/ghi.
  - `strip_furigana(text)` bỏ dấu như `toPlainJapanese` nhưng không trim (server luôn lưu dấu đã trim bằng `tidyFurigana`). `is_display_fix(old, new)`: mọi khóa ngoài `prompt`, `explain`, `passage`, `options`, `tokens`, `transcript` giữ nguyên; `prompt` 1–1000 và `explain` 1–2000 ký tự; `passage`, `transcript`, từng lựa chọn và từng mảnh câu (giữ `id`) chỉ khác ở dấu furigana.
  - `guard_assignment_items` thêm nhánh: cho UPDATE khi `reng.display_fix = 'on'`, khóa và vị trí giữ nguyên, và `is_display_fix` đúng. Trigger không bao giờ bị tắt.
  - `fix_assignment_question(p_teacher_id, p_assignment_id, p_question_id, p_expected_snapshot, p_snapshot)`: chỉ chủ lớp và bài không phải nháp (`not_found`); khóa dòng; snapshot hiện tại phải bằng `p_expected_snapshot` (`conflict`); giống hệt thì `unchanged`, sai luật thì `invalid_change`; đặt cờ trong transaction, cập nhật, tắt cờ, ghi `assignment_item_edits` và `audit_events` (`assignment.question_fixed`), trả `fixed`. Chỉ service role được gọi.
- `lib/assignment-fix.ts`: `applyDisplayFix` chép mọi trường chấm điểm từ snapshot, chỉ lấy chữ từ form và giữ nguyên trường không sửa; `describeDisplayFixProblem` giải thích bằng tiếng Việt theo cùng luật với database, cộng thêm parse snapshot và luật furigana khi xuất bản (lộ đáp án, câu `kanji`).
- `lib/server/assignment-fixes.ts`: `getFixableAssignment` (chủ lớp qua `getTeacherClass`, câu theo vị trí, lịch sử; thiếu bảng lịch sử thì trang vẫn mở) và `fixAssignmentQuestion` (so hash SHA-256 của snapshot đã sắp khóa với hash form mang theo, rồi gọi RPC). Server action `fixQuestionAction` (`app/actions/assignment-fixes.ts`) trả lại chữ đã gõ khi lỗi.
- Giao diện `/teach/assignments/[id]` (T14), bố cục rộng: bảng gọn mỗi câu một dòng (số, loại câu, đề có furigana, đáp án, nhãn "Đã sửa" và "N chữ Hán chưa có cách đọc", nút **Sửa**), lọc Tất cả / Có chữ Hán chưa có cách đọc / Đã sửa (danh sách đã lọc giữ nguyên tới khi chọn lại bộ lọc, nên câu vừa sửa không biến mất). Bấm Sửa mở ngay dưới dòng hai cột **Trước | Sau** (từ 900px nằm cạnh nhau, màn hẹp xếp chồng): Trước là câu học viên đang thấy kèm lịch sử sửa; Sau là đề bài và giải thích sửa tự do, cùng **ô cách đọc cho từng chữ Hán** (`components/teach/reading-fields.tsx`, gõ romaji tự đổi sang hiragana, bộ gõ tiếng Nhật vẫn dùng được) cho đề, lựa chọn, mảnh câu, đoạn văn, lời nghe và giải thích; giáo viên không phải gõ `{…|…}`. Câu hỏi cách đọc kanji (tag `kanji`) chỉ có ô cách đọc ở giải thích và lời nghe; câu tiếng Trung không có ô cách đọc. Ô "Học viên sẽ thấy" xem trước đề và lựa chọn. Cách đọc không phải kana hoặc đề có dấu `{ }` bị chặn trước khi gửi. Mở Sửa thì focus vào Đề bài; Hủy hoặc lưu xong thì focus về nút của dòng; form chỉ đóng khi trang đã nhận snapshot mới, nên dòng không hiện lại chữ cũ.
- Học viên: bài làm lưu theo `question_id` nên câu trả lời đang làm, lượt đã nộp và điểm giữ nguyên; mở lại bài là thấy nội dung mới. Trang kết quả, sổ lỗi và báo cáo đọc snapshot nên cũng hiện chữ mới.
- `lib/furigana-units.ts`: "cụm" là một dãy chữ Hán liền nhau kèm chữ số viết ngay trước (7時, １週間, 一冊). `toFuriganaDraft` tách chữ đã lưu thành văn bản thường và một cách đọc cho mỗi cụm: dấu phủ cả kana ({お茶|おちゃ}) cho chữ Hán phần cách đọc bỏ kana; nhiều dấu phủ kín một cụm ({毎週|まいしゅう}{土曜日|どようび}) được ghép thành một cách đọc; dấu chỉ phủ một phần cụm được đếm `unmatched` và form cảnh báo ngay đầu phần Sau. `fromFuriganaDraft` ghép lại `{cụm|cách đọc}`; `carryReadings` giữ cách đọc theo từ khi giáo viên sửa đề. Văn bản thường không đổi nên kiểm tra "chỉ khác furigana" ở database vẫn đúng.
- `npm run furigana:sql` (`lib/furigana-patch.ts`, `scripts/furigana-snapshot-sql.ts`) thêm furigana cho nhiều câu một lần, ví dụ cả bài hằng ngày: từ file xuất `assignment_items` (`assignment_id, question_id, position, question_snapshot`) và bản đã viết `{漢字|かんじ}`, chỉ chấp nhận khác biệt ở dấu furigana (kể cả ở đề), rồi viết SQL gọi `fix_assignment_question` cho từng câu với tư cách giáo viên chủ lớp. Một câu bị từ chối thì cả transaction không đổi.
- Kiểm chứng: `tests/assignment-fix.test.ts` (câu 9 viết lại được, đáp án giữ nguyên; furigana trên chữ đang hỏi bị từ chối; lựa chọn và mảnh câu chỉ thêm furigana; trường không sửa giữ nguyên; đề trống bị từ chối), `tests/assignment-fix-migration.test.ts` (PGlite: giáo viên lớp khác `not_found`, `conflict`, sửa đáp án hoặc điểm `invalid_change`, đổi chữ lựa chọn `invalid_change`, `unchanged`, `fixed`, lịch sử và audit, bài đang làm giữ nguyên, sửa trực tiếp vẫn bị chặn kể cả khi tự bật cờ, `authenticated` không gọi được), `tests/furigana-patch.test.ts` (SQL hàng loạt qua RPC, chạy lại bị `conflict`). Rà soát giao diện (Supabase local, bài hằng ngày 60 câu dựng từ bài mẫu: 30 trắc nghiệm, 20 điền gồm 8 câu kanji, 4 sắp xếp, 4 đọc hiểu, 3 nghe, 3 chính tả). Bản bảng gọn (sau phản hồi "giao diện không ổn" về bản thẻ): 1280, 1440, 1920 bảng rộng 1136px, dòng cao 79–87px, trang 60 câu khoảng 5.800px (bản thẻ khoảng 17.800–20.000px); gõ `kinou` ra きのう; xem trước hiện ruby; lưu trong bộ lọc giữ dòng; cách đọc sai bị chặn; axe 0 lỗi ở máy tính và điện thoại; điện thoại không cuộn ngang. Các số đo dưới đây là của bản thẻ trước đó. Máy tính 1280, 1440, 1920: danh sách rộng 1136px (bản đầu chỉ 560px trong khung 1200px), câu và form nằm cạnh nhau, trang ngắn từ khoảng 20.000 xuống 17.800px, nhảy tới câu bằng thanh số, xem trước cập nhật khi gõ, thứ tự Tab: đề, lựa chọn, giải thích, Lưu sửa, Đóng. Điện thoại 390px: một cột, thanh số một hàng cao 42px, câu đầu trong màn hình đầu. Cả hai không cuộn ngang, trang 60 câu mở khoảng 0,3–0,7 giây ở dev, axe (WCAG 2 A/AA, best practice) 0 lỗi khi đóng và mở form, đủ ô cho từng dạng câu, lịch sử hiện furigana. Supabase local ở 390px: giáo viên sửa câu kiểu câu 9 và trang hiện "Đã sửa 1 lần"; đổi chữ lựa chọn bị từ chối kèm lý do, chữ đã gõ còn nguyên; lưu xong form đóng và focus về nút; học viên đang làm mở lại bài thấy đề mới, câu trả lời いっさつ vẫn còn. `npm run check` đạt. E2E chưa chạy.
- Migration `20261105044634` đã áp production (kiểm tra 11/11/2026); trước khi áp, trang vẫn mở nhưng lưu báo "Chưa lưu được".

## Tin nhắn giao bài cho nhóm lớp — 06/11/2026

- Lớp ở Việt Nam thường nhận bài qua nhóm Zalo/Messenger. Sau khi giao bài, thông báo "Đã giao «…»" ở trang lớp có nút **Sao chép tin nhắn cho nhóm lớp**; mỗi bài còn mở trong mục Bài đã giao có nút chữ **Sao chép tin nhắn giao bài** để nhắc lại. Lớp tự học không có nút.
- `lib/assignment-message.ts` (`buildAssignmentMessage`) soạn ba dòng văn bản thường: tên lớp (không thêm chữ "Lớp" khi tên đã bắt đầu bằng "Lớp"), loại bài và tên bài, hạn nộp theo giờ Việt Nam kèm "nộp muộn vẫn được" hoặc "sau hạn không nộp" (hoặc "Không có hạn nộp"), link `/assignments/<id>`. Tin nhắn soạn ở server; `components/teach/copy-message-button.tsx` chỉ chép vào clipboard, và khi trình duyệt chặn clipboard thì hiện sẵn đoạn tin nhắn để chép tay.
- Không đổi database hay quyền: link chỉ mở được với học viên trong lớp, người chưa đăng nhập được đưa qua trang đăng nhập rồi quay lại.
- Kiểm chứng: `tests/assignment-message.test.ts`; trình duyệt 390px trên Supabase local, cả hai nút chép đúng nội dung, không lỗi console.

## Thi thử JLPT — 09/11/2026

Ý tưởng #1 của [roadmap](../09-roadmap.md#ý-tưởng-bổ-sung-cho-pilot--06112026), làm trước kỳ JLPT Chủ nhật 06/12/2026. Người dùng chọn: giới hạn thời gian theo lượt, đề tự động từ ngân hàng, điểm từng phần kèm ước tính đỗ, lịch thi chung.

- **Dữ liệu** (migration `20261109032029_jlpt_mock_exams.sql`): bảng `assignment_exams(assignment_id, level 'N5'|'N4', time_limit_minutes 5–240)` tách khỏi `assignments`, nên web chạy trước khi áp migration (chưa có đề thi thử nào, `listAssignmentExams` ghi log và trả rỗng) và bản web đang chạy không đổi sau khi áp. Chỉ chèn được một lần, khi bài giao còn nháp (trigger `assignment_exam_guard`); `service_role` chỉ có quyền đọc và chèn; RLS bật, `anon`/`authenticated` không có quyền.
- **Tạo đề:** RPC `publish_jlpt_mock_exam(teacher, class, lesson, title, level, due_at, minutes, feedback_policy, question_ids)` kiểm tra chủ lớp có vai giáo viên và lớp đang hoạt động, hạn ở tương lai (bắt buộc), câu thuộc phiên bản lớp ghim (kèm đáp án tương đương như bài luyện), 1–70 câu không trùng; tạo bài `test`, một lượt, không nộp muộn, điểm đạt 45% (N5, 80/180) hoặc 50% (N4, 90/180). `lib/server/jlpt-exams.ts` (`publishJlptExam`) chỉ nhận lớp `ja-JP`, ghép đề bằng `composeJlptExam` (`lib/jlpt.ts`): `jlptSectionOf` xếp câu nghe (`listen`) vào nghe hiểu, câu có đoạn văn hoặc nhãn `reading`/`読解` vào ngữ pháp – đọc hiểu, nhãn `文字・語彙`/`kanji`/`vocabulary`/`writing`/`paraphrase` vào chữ Hán – từ vựng, nhãn `文法`/`grammar`/`forms`/`particles`/`sentence-order` hoặc câu sắp xếp vào ngữ pháp; chính tả và câu không nhãn không vào đề. Mỗi phần lấy theo `JLPT_PRESETS` (N5 25/20/20, N4 25/25/20), bằng bộ chọn của bài hằng ngày (ưu tiên câu chưa ra ở 30 đề gần nhất của lớp, giữ cân bằng dạng câu), các câu cùng đoạn văn đi liền nhau, theo thứ tự ba phần như đề thật.
- **Thời gian theo lượt:** `check_open_attempt` trả `past_due` khi `now() > started_at + giới hạn + 1 phút`, nên lưu và nộp sau đó bị từ chối như quá hạn. Trang làm bài (`ExamTimer`) luôn hiện thời gian còn lại theo giờ server (bù lệch giờ máy lúc mở trang, cập nhật khi quay lại tab) và tự nộp đúng lúc hết giờ, hoặc 1 phút trước hạn nếu hạn tới trước (`examHandInAt`); phút thêm của server bù cho mạng chậm. `list_expired_attempts` và `submit_expired_attempt` nhận thêm lượt hết giờ: nộp với `submitted_at` bằng lúc hết giờ (hoặc hạn nếu sớm hơn), không tính muộn, thẻ lỗi của đề công bố sau hạn chờ tới hạn. Ngoài cron 6:00, `getStudentAssignment` nộp ngay lượt đã hết giờ khi học viên mở lại đề (`handInExpiredAttempt`, dùng chung với cron).
- **Kết quả:** `ResultItem` có thêm `points` và `section`; `JlptResult` (`components/classroom/jlpt-result.tsx`) hiện câu đúng và tỉ lệ từng phần, rồi `estimateJlptScore`: kiến thức ngôn ngữ và đọc hiểu quy về 120, nghe hiểu về 60 theo tỉ lệ điểm, đỗ khi tổng ≥ 80 (N5) hoặc 90 (N4) và hai phần đạt sàn 38 và 19; thiếu phần nghe thì không ước tính. Đề thi thử không hiện nhãn Đạt/Chưa đạt theo phần trăm để không mâu thuẫn với điểm sàn. Trang ghi "Reng tự nộp lúc hết giờ" khi `submitted_at` bằng lúc hết giờ.
- **Lịch thi:** `JLPT_SESSIONS` (06/12/2026 đã công bố; 04/07/2027 và 05/12/2027 ghi "dự kiến", Chủ nhật đầu tháng 7 và 12); `describeJlptCountdown` tính theo ngày Việt Nam, hiện ở trang đề và trang kết quả. Thêm kỳ mới vào danh sách khi có lịch chính thức.
- **Giao diện:** mục **Thi thử JLPT** ở trang Giao bài (lớp tiếng Nhật, có link nhảy ở đầu trang): cấp, bài nguồn, tên đề, số phút (theo cấp), Mở đến (mặc định 23:59 sau 7 ngày), công bố điểm; xem trước số câu từng phần và báo khi bài thiếu câu. Nhãn "Thi thử JLPT N5 (90 phút)" ở mọi danh sách bài (`describeAssignmentKind`), tin nhắn giao bài cho nhóm lớp ghi số phút và hạn bắt đầu thi. Trang đề: lời dặn đồng hồ vẫn chạy khi đóng trang, cảnh báo khi hạn còn ít hơn thời gian làm bài, nút **Bắt đầu thi**.
- **Câu nghe trong đề:** snapshot của câu `listen` mang mã audio (`toQuestionView` trong `lib/assignment.ts`), nên trình duyệt phát file công khai `/audio/lessons/<mã>.mp3` như bài luyện tập; lời nghe không nằm trong snapshot gửi học viên. [BD giai đoạn 5](../basic-design/phase-5.md#phạm-vi) đòi phân phối audio riêng có thời hạn cho bài test; đề thi thử là ngoại lệ có chủ ý vì chỉ để luyện ([BD](../basic-design/phase-3.md#thi-thử-jlpt--09112026)). Bài kiểm tra tính điểm thật vẫn cần cách phân phối riêng.
- **Nghe một lần (10/11/2026):** `JLPT_EXAM_MAX_LISTENS = 1` (`lib/jlpt.ts`). `getStudentAssignment` dựng câu cho lượt làm bằng `toAttemptItems(items, mode, listenLimit)`; với đề thi thử, `maxListens` của câu `listen`/`dictation` thành `min(maxListens ?? 1, 1)`. Snapshot trong database không đổi, nên áp được cho cả đề đã giao trước đó (kể cả lượt đang làm, khi tải lại trang). `AttemptRunner` truyền `isSinglePassListening` cho `QuestionField` và `ListeningPlayer` (`isSinglePass`): chỉ còn nút Nghe, khóa khi đang tải/phát ("Đang phát"), không có Tạm dừng, Lùi 5 giây, Chậm 0,75x; thiết bị tự dừng (rút tai nghe) thì bấm **Phát tiếp**, không tính thêm lượt. Lượt nghe vẫn đếm khi bắt đầu phát và lỗi tải không tính lượt như trước. Server không chặn thêm `listen_count` (0–100); đây là luyện thi, không phải chống gian lận. Kiểm chứng: `tests/jlpt.test.ts`, `e2e-supabase/jlpt-mock-exam.spec.ts` (20 trình phát, `tối đa 1`, không có nút lùi/chậm) và thử trên trình duyệt local: phát hết một câu thì nút khóa, tải lại vẫn khóa.
- **Giờ gợi ý từng phần (10/11/2026):** `JLPT_SECTION_MINUTES` (N5 20/40/30, N4 25/55/35). `getStudentAssignment` gửi kèm lượt đang làm `sections` (phần JLPT của từng câu theo `jlptSectionOf`, chỉ với đề thi thử); trang đề gọi `planExamPacing(level, phút, sections, startedAt)`: các phần liên tiếp theo thứ tự trong đề, mỗi phần lấy phần thời gian theo tỉ lệ đề thật (làm tròn phút, phần cuối lấy phần còn lại), `endsAt` tính từ lúc bắt đầu lượt. Đề có một phần hoặc phần quay lại sau phần khác thì không có gợi ý. `ExamTimer` hiện `currentPacingStep` (phần đầu tiên chưa hết giờ) dưới dòng đồng hồ, thời gian còn lại của phần (không quá thời gian chung) và nút **Đến câu n** từ phần thứ hai; một vùng `aria-live` chỉ đổi chữ khi sang phần mới. Trang trước khi bắt đầu ghi cách chia (`describeExamPacing`). Không khóa phần đã qua, không thêm cột hay migration. Kiểm chứng: `tests/jlpt.test.ts`, `e2e-supabase/jlpt-mock-exam.spec.ts` (dòng gợi ý của N5 lúc bắt đầu) và ảnh chụp local khi lùi giờ bắt đầu 30 phút (sang phần 2, nút Đến câu 26 nhảy đúng câu).
- Kiểm chứng: `tests/jlpt.test.ts` (phân phần với ngân hàng N5/N4 thật, ghép đề, xoay câu, đoạn văn, ước tính, lịch, đồng hồ), `tests/jlpt-exam-migration.test.ts` (PGlite: quyền và đầu vào khi tạo đề, bảng không sửa được sau khi giao, phút thêm sau giới hạn, cron nộp đúng lúc hết giờ, thẻ lỗi chờ hạn, bài thường không bị ảnh hưởng), `tests/assignment-message.test.ts`; trình duyệt trên Supabase local ([báo cáo](../testing/jlpt-mock-exam-2026-11-09.md)).

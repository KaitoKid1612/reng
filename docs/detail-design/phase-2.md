# Detail Design giai đoạn 2

Theo [BD](../basic-design/phase-2.md), schema chung tại 03-data-design. Phiên bản dependency theo lockfile. Next.js/reveal.js được tích hợp qua client component với init/destroy theo lifecycle.

## Nội dung và xuất bản

- Draft: content/lessons/*.json, envelope metadata English + content.schemaVersion=1. Snapshot local: content/lesson-catalog.json, gồm lesson pointers và versions bất biến. Bộ mẫu được đánh dấu isSample.
- Validator Zod kiểm tra union slide/question, ID không trùng, refs đúng loại, chỉ số đáp án hợp lệ, điểm dương, media local/HTTPS an toàn. Text thuần, không HTML/dangerouslySetInnerHTML.
- Local version có ID UUID, lessonId, versionNo, title/titleJa/summary/order/courseId, publishedAt và content. Metadata này phải được chụp cùng version, không đọc tiêu đề từ draft khi xem lịch sử.
- Public DTO được tạo bằng allowlist, lược bỏ teacherNotes và answer/explain/transcript câu hỏi. Không import catalog chứa notes vào client component. Câu luyện chỉ được giải đáp qua endpoint riêng sau thao tác; câu test không được nhập vào catalog công khai.
- scripts/import-lesson.ts dry-run mặc định. Publish local giữ version cũ, check revision và rename file tạm trong file lock. Publish Supabase gọi RPC transaction; chỉ service_role được execute, validate Zod trước RPC. Không tự apply migration hay tạo tài khoản.

Migration bổ sung summary/title_ja/order_no/course_id trên version và RPC publish_lesson: khóa bản ghi bài, kiểm tra owner/role/revision, cập nhật draft, thêm snapshot, đổi pointer cùng transaction. Revision sai phải rollback. Không sửa/xóa lesson_versions.

## Nguồn dữ liệu và API

| Endpoint | Quyền / phản hồi |
|---|---|
| Server reader lessons/version | Local catalog hoặc Supabase chỉ published/public/non-archived; query version phải thuộc đúng bài |
| GET /api/lessons/[id]/questions/[questionId]?version= | Chỉ câu luyện của public version; trả answer/explain, không notes |
| GET /api/lessons/[id]/notes?version= | Cookie session → auth.getUser → teacher → version thuộc bài mình; no-store, không cache chung |
| POST /api/auth/sign-in, /api/auth/sign-out | Đã thay bằng Server Action đăng nhập/đăng xuất dùng chung ở giai đoạn 3 (xem DD giai đoạn 3); cookie HttpOnly giữ nguyên, không trả token |

Không dùng service_role để bỏ qua kiểm tra quyền notes. Từ giai đoạn 3, proxy.ts làm mới phiên trước khi render; Server Component chỉ đọc cookie. Không triển khai session giả cho local sample. Thiếu cấu hình Auth thì UI đăng nhập thông báo chưa khả dụng và notes không được trả.

## Slide engine

SlideRenderer map type → component: title/vocab/grammar/example/quiz/note/image. Example reveal dùng fragment; quiz có nút reveal gọi endpoint. Notes không có trong props engine hoặc HTML máy chiếu/PDF.

Reveal cấu hình width=1280,height=720, margin nhỏ, transition none, embedded, progress và touch. Adapter giữ hash số 1-based thay vì hash mặc định engine. On slide/fragment change cập nhật URL và BroadcastChannel, payload có lesson/version/index/fragment; validate số nguyên và phạm vi. Không echo khi xử lý sự kiện từ presenter. Destroy engine/listener/channel khi đổi bài hoặc unmount; React StrictMode không được tạo hai engine.

Presenter dùng trang riêng cùng origin: hiện preview public hiện tại/kế tiếp và đồng hồ. API notes chỉ gọi từ presenter, không broadcast dữ liệu riêng. Không dùng reveal notes plugin với notes nhúng trong DOM. Chiếu/preview chỉ render text đã escape qua React. Query version được giữ khi mở presenter và bản in.

## Audio và kiểm chứng

AudioPlayer nhận thêm spoken text có hash để dùng lại cho từ vựng/câu mẫu; kana giữ hợp đồng hiện tại. Null hash mới dùng fallback thiết bị có thông báo. Pipeline lesson audio cần cập nhật draft rồi xuất bản version mới, không sửa snapshot đang dạy.

Test validator/ref/media, DTO không có trường riêng, version/revision bất biến, RPC quyền/rollback trên database nhúng. Browser kiểm tra reader/search, keyboard/hash/fragment/quiz, print layout, presenter scope và không lộ ghi chú qua HTML/API ẩn danh. Dịch vụ thật cần chạy riêng sau khi có cấu hình.

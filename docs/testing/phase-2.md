# Truy vết và nghiệm thu giai đoạn 2

> Phạm vi nền Nhật: tài liệu giai đoạn này giữ thiết kế/bằng chứng triển khai trước dịch vụ Việt–Trung; không chứng minh tính năng mới đã có. Thiết kế hiện hành xem [BD dịch vụ](../basic-design/teaching-service.md), [DD dịch vụ](../detail-design/teaching-service.md) và [checklist dịch vụ](../testing/teaching-service.md). Kết quả PASS/Chưa chạy lịch sử được giữ nguyên.

Ngày kiểm chứng local: 28/10/2026. Không thay thế nghiệm thu dịch vụ/thiết bị thật.

| ID | Yêu cầu | Kiểm tra | Kết quả |
|---|---|---|---|
| G2-01 | LESSON-01 | 5 mẫu tự biên soạn, thứ tự, link đọc/chiếu | PASS local — 5 bài mẫu, 30 từ, 10 mẫu câu; chờ giảng viên duyệt |
| G2-02 | DATA-01 | Validator, refs, media, chỉ số đáp án, duplicate ID | PASS — refs/ID/answers/media được kiểm tra bằng validator và tests |
| G2-03 | LESSON-03 | Trang đọc responsive, cùng version với slide | PASS Chromium — đọc ở 360px, version giữ trong liên kết |
| G2-04 | LESSON-02/04/05 | Reveal, keyboard, fragment, hash 1-based, reload | PASS — keyboard, fragment, hash/reload và thay hash trực tiếp |
| G2-05 | LESSON-06 | Khung 1280×720, fullscreen, mobile scale | PASS local 1280×720 — từ vựng/quiz sau reveal của cả 5 bài nằm trong viewport; fullscreen/thiết bị thật chưa nghiệm thu |
| G2-06 | LESSON-08 | Presenter, popup, đồng bộ scope, ghi chú riêng | PASS local — popup và đồng bộ điều khiển đúng lesson/version, API notes ẩn danh bị chặn; phiên teacher thật chưa kiểm chứng |
| G2-07 | LESSON-09 | Print PDF, fragment hiện đủ, notes không lộ | PASS local — 9 section print, ẩn toolbar/notes, tạo PDF artifact; cần duyệt PDF trước chia sẻ |
| G2-08 | GRAM-03 | Tìm Nhật/Việt và link đúng bài/mục | PASS — tìm không dấu và chữ Đ, link đúng bài/mục |
| G2-09 | Bảo mật | Public DTO/HTML không notes/answers; API notes từ chối ẩn danh | PASS phạm vi local — DTO/HTML không notes/answers ban đầu; ẩn danh notes 401/no-store, sign-in khác origin 403 |
| G2-10 | DATA-01 | Local/RPC publish, revision, snapshot không đổi, rollback | PASS PostgreSQL nhúng/local — CAS, RPC server-role, rollback và snapshot bất biến; chưa Supabase thật |
| G2-11 | Audio | Từ/câu phát, fallback/thiếu audio, không sửa snapshot | PASS plan/draft — 40 entry audio và snapshot không bị sửa; audio thật chờ cấu hình |
| G2-12 | Nền | Check, build, E2E, link tài liệu | PASS — check, production build và 20 E2E toàn dự án |
| G2-13 | Vận hành thật | Supabase/Auth/Azure/R2, nội dung/audio được duyệt, dạy thử | Chờ cấu hình/giảng viên |

## Bằng chứng

- npm run check: 24 test logic/database/pipeline qua; lint, format và TypeScript qua. Migration thứ hai kiểm tra bằng PGlite, không áp dụng cloud.
- npm run test:e2e: 20 test Chromium qua, gồm regression kana/audio và bài học/presenter/print.
- npm run build: thành công, gồm reader/slide/presenter/grammar và các API Auth/notes/practice.
- Dry-run lesson:import lesson-01 hợp lệ, không ghi dữ liệu. audio:plan --lessons có 40 entry/40 hash, không gọi dịch vụ.
- Đã xem ảnh test-results/lesson-reader-mobile.png và lesson-slide-desktop.png. test-results/lesson-01.pdf là bản in thử local, không chứa teacherNotes; artifact bị gitignore.
- Chưa có các khóa dịch vụ. Cần làm staging theo runbook và giảng viên duyệt nội dung/phát âm trước khi dùng lớp thật.

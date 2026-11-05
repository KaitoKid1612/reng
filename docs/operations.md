# Vận hành Reng

Tài liệu cho người phát triển và người vận hành: môi trường, biến môi trường, lịch cron, cách đưa thay đổi lên production và các lỗi hay gặp. Trạng thái production và chi phí gói ở [kế hoạch POC](poc-setup.md); checklist dựng staging ở [chuẩn bị staging](staging-setup.md); sinh audio và nạp bài ở [soạn bài](content-authoring.md). Cập nhật 04/11/2026 theo mã nguồn hiện tại.

## Môi trường

| Môi trường | Web | Database và đăng nhập | Dùng khi |
|---|---|---|---|
| Local, không cloud | `npm run dev` (http://127.0.0.1:3000) | Không có. `LESSON_SOURCE=local` đọc 5 bài mẫu trong `content/` | Sửa kana, bài mẫu, trang công khai. Trang lớp báo chưa kích hoạt, không có phiên giả |
| Local + Supabase local | `npm run dev` với `.env.local` trỏ `http://127.0.0.1:54321` | `npx supabase start` (Docker hoặc Podman), Mailpit ở http://127.0.0.1:54324 | Mọi luồng lớp học, soạn bài, email. Tạo tài khoản bằng `npm run seed:local` và `npm run seed:demo` ([README](../README.md#lớp-học-trên-supabase-local)) |
| E2E không dịch vụ | Playwright tự chạy dev server ở cổng 3217 | Không có | `npm run test:e2e` |
| E2E Supabase local | Playwright tự chạy dev server ở cổng 3218 | Supabase local, khóa đọc từ `supabase status`, từ chối URL không phải local | `npm run test:e2e:supabase` |
| Production | Vercel project `reng`, gói Hobby, hàm ở `sin1`; mỗi lần push `main` tự deploy | Supabase project `reng` (Singapore, gói Free) | https://reng-class.vercel.app |

Next không cho hai tiến trình dùng chung thư mục `.next`: dừng `npm run dev` trước khi chạy E2E hoặc `npm run build`.

## Biến môi trường

Mẫu đầy đủ ở `.env.example`. Không đưa secret vào biến `NEXT_PUBLIC_` (các biến này được nhúng vào JavaScript gửi cho trình duyệt lúc build) hoặc vào git.

### Web (Vercel và `.env.local`)

| Biến | Bắt buộc khi | Ghi chú |
|---|---|---|
| `LESSON_SOURCE` | Luôn có | `local` (mặc định) đọc bài mẫu trong repo; `supabase` đọc phiên bản đã xuất bản. Production: `supabase` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Dùng lớp học, tài khoản, soạn bài | Thiếu một trong ba thì các trang này báo chưa kích hoạt. Secret key chỉ dùng phía server. Lấy khóa thật bằng `npx supabase projects api-keys --reveal` |
| `SITE_URL` | Production | Gốc cho link trong email, canonical, `sitemap.xml`, `robots.txt`. Để trống ở local thì lấy theo host của request |
| `AUTH_GOOGLE_ENABLED` | Muốn hiện nút Google | `true` chỉ có tác dụng khi nhà cung cấp Google đã bật trong Supabase Auth ([các bước](poc-setup.md#bật-đăng-nhập-bằng-google-03112026)) |
| `GOOGLE_SITE_VERIFICATION` | Tùy chọn | Mã thẻ meta của Search Console; trống thì không thêm thẻ |
| `CRON_SECRET` | Có cron | Vercel gửi `Authorization: Bearer <CRON_SECRET>`; thiếu thì mọi job trả 503 |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` | Gửi email nhắc bài | `resend` trên cloud, `mailpit` ở local (kèm `MAILPIT_URL`). Production chưa đặt nên ba job email trả 503 mỗi ngày, đúng như thiết kế |
| `EMAIL_LINK_SECRET` | Gửi email nhắc bài | Ký link hủy nhận thư; thiếu thì email coi như chưa cấu hình |
| `RESEND_WEBHOOK_SECRET` | Theo dõi giao/mở thư | Secret `whsec_…` của webhook Resend trỏ tới `/api/webhooks/email` |
| `NEXT_PUBLIC_AUDIO_BASE_URL` | Audio kana đặt ở R2 | Trống thì dùng `/audio/kana` trong bản web. Đổi giá trị phải build lại |
| `NEXT_PUBLIC_LESSON_AUDIO_BASE_URL` | Audio bài học đặt ở R2 | Trống thì dùng `/audio/lessons` trong bản web (bộ đề nghe Minna 1–15 đi kèm bản web). Đổi giá trị phải build lại |

### Chỉ cho script (máy của người vận hành)

| Biến | Script | Ghi chú |
|---|---|---|
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_SPEECH_VOICE`, `AZURE_SPEECH_VOICE_ZH_CN`, `AZURE_SPEECH_VOICE_ZH_TW` | `npm run audio:generate` | Giọng Trung mặc định `zh-CN-XiaoxiaoNeural`, `zh-TW-HsiaoChenNeural` ([audio](06-audio.md)) |
| `UNREAL_SPEECH_API_KEY` | `npm run audio:generate -- --voice unreal:<giọng>` | Chỉ cần khi chọn giọng Unreal Speech; gói miễn phí phải ghi nguồn |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `R2_LESSON_PUBLIC_BASE_URL` | `npm run audio:generate -- --r2` | Bucket và domain phải được tạo trước; script không tạo bucket |
| `SEED_TEACHER_PASSWORD` | `seed:local`, `seed:demo` | Chỉ Supabase local; script từ chối URL không phải local |
| `AUDIT_EMAIL`, `AUDIT_PASSWORD` | `npm run audit:layout -- --login` | Đặt ngay trên dòng lệnh, script không đọc `.env.local` ([cách dùng](testing/layout-audit-2026-11-03.md)) |

Các biến `E2E_*` do `playwright.supabase.config.ts` tự đặt (khóa từ `supabase status`, secret ngẫu nhiên mỗi lần chạy); không cần khai báo.

## Lịch cron

Lịch nằm trong `vercel.json` theo giờ UTC. Gói Hobby chạy mỗi job tối đa một lần mỗi ngày và có thể lệch trong vòng một giờ. Mọi job cần `CRON_SECRET` và Supabase; ba job email cần thêm email đã cấu hình.

| Đường dẫn | Lịch UTC | Giờ Việt Nam | Việc | Khi chưa cấu hình |
|---|---|---|---|---|
| `/api/cron/daily-practice` | `0 23 * * *` | 6:00 mỗi sáng | Giao bài luyện tập hằng ngày cho các lớp đã bật; trả `{ created, exists, skipped, failed }`. Lớp lỗi ghi log riêng, không chặn lớp khác. Chạy lại cùng ngày không giao trùng. Sau đó tự nộp các lượt bỏ dở đã quá hạn của bài không cho nộp muộn, trả thêm `expiredAttempts: { submitted, skipped, failed, left }`; thiếu migration `20261105012503` thì phần này chỉ ghi log `Expired attempts job failed` ([DD](detail-design/phase-3.md#tự-nộp-lượt-còn-mở-khi-hết-hạn--05112026)) | 503 `not_configured` |
| `/api/cron/student-reminders` | `0 13 * * *` | 20:00 mỗi tối | Email nhắc bài cho học viên đã bật nhắc | 503 khi chưa có email |
| `/api/cron/teacher-digest` | `0 23 * * *` | 6:00 mỗi sáng | Email tóm tắt lớp cho giáo viên | 503 khi chưa có email |
| `/api/cron/weekly-summary` | `0 12 * * 0` | 19:00 Chủ nhật | Email tổng kết tuần cho học viên | 503 khi chưa có email |

Gọi tay ở local: `curl -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/<job>`. Job email trả `{ planned, sent, cancelled, failed, released }`; mỗi người, mỗi loại thư, mỗi ngày chỉ có một thư, nên chạy lại không gửi trùng. Chi tiết: [nhắc bài](08-notifications.md), [bài luyện hằng ngày](detail-design/teaching-service.md).

## Migration

Migration nằm trong `supabase/migrations`, chạy theo thứ tự tên file. Test unit chạy chúng trên PostgreSQL nhúng (PGlite) với auth giả, không cần mạng.

1. Tạo file bằng `npx supabase migration new <tên>` để có mã thời gian 14 chữ số (`20261104110635_...`). Mã ngắn như `202611040002_...` xếp **trước** `20261104063229_...` khi so chuỗi, nên `db push` từ chối vì nằm trước migration cuối đã áp dụng.
2. Viết migration tương thích với bản web đang chạy: bản cũ vẫn phải chạy được sau khi migration áp dụng (ví dụ thêm tham số có giá trị mặc định thay vì đổi chữ ký hàm), vì database được nâng trước rồi web mới deploy.
3. Thêm test PGlite, chạy `npm run check`, áp lên Supabase local (`npx supabase migration up` hoặc `npx supabase db reset` khi được phép xóa dữ liệu local) và thử luồng trên trình duyệt hoặc E2E.
4. Sao lưu production (gói Free không có bản sao lưu tự khôi phục): `npx supabase db dump --linked -f <file>` và `--data-only` cho dữ liệu, lưu ngoài repo.
5. Xem trước rồi áp dụng: `npx supabase db push --linked --dry-run`, sau đó `npx supabase db push --linked`. Luôn ghi `--linked`: từ Supabase CLI 3, thiếu cờ này lệnh đẩy vào database local. `db push` áp **mọi** migration chưa có trên production, nên chỉ chạy khi tất cả đã hoàn chỉnh.
6. Chỉ push mã dùng migration mới **sau khi** migration đã áp dụng. Code trên `main` có thể bị một agent khác đẩy lên bất kỳ lúc nào, nên commit chờ migration cũng không được nằm trên `main`.

Cấu hình Auth production (Site URL, mẫu email, Google) nằm trong khối `[remotes.production]` của `supabase/config.toml`: xem khác biệt bằng `npx supabase config diff --project-ref <ref>`, áp bằng `npx supabase config push`.

## Đưa thay đổi lên production

Mỗi lần push `main` là một lần deploy production, nên commit từng việc ở máy và push một lần khi xong cả đợt ([AGENTS.md](../AGENTS.md)).

Trước khi push:

- `npm run check` (định dạng, ESLint, TypeScript, test unit và migration).
- `npm run build` khi đổi cấu hình Next, layout gốc, metadata hoặc route.
- `npm run test:e2e` và `npm run test:e2e:supabase` cho route và tương tác bị ảnh hưởng.
- Migration mới đã áp dụng lên production (mục trên); biến môi trường mới đã đặt trên Vercel cho Production.
- Xem lại các file sẽ đẩy: không có `.env*`, khóa, `test-results/`, `.next/`.

Sau khi deploy:

- Trên Vercel, deployment mới ở trạng thái Ready, không có lỗi build.
- Mở trang chủ, `/for-teachers`, `/sign-in`; đăng nhập một tài khoản giáo viên mở `/teach` và một trang lớp. Học viên mở Lớp của tôi và một bài tập.
- Sáng hôm sau, xem log của `/api/cron/daily-practice` (Vercel › Logs): `failed` phải bằng 0.

Quay lại bản trước: dùng Instant Rollback ở Vercel › Deployments để đưa bản production trước đó trở lại. Không có cách tự lùi migration; nếu migration đã áp dụng, bản cũ của web vẫn phải chạy được (bước 2 của mục Migration).

## Lỗi hay gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| Mọi truy vấn báo "Invalid API key" | Khóa trong biến môi trường là bản bị che. Lấy lại bằng `npx supabase projects api-keys --reveal` |
| Trang báo `TypeError: … is not a function` sau khi thêm hàm mới | Dev server (Turbopack) còn giữ module cũ. Khởi động lại `npm run dev`; sửa `app/layout.tsx` cũng cần khởi động lại |
| E2E hoặc build lỗi lạ khi dev server đang chạy | Hai tiến trình dùng chung `.next`. Dừng dev server rồi chạy lại |
| `supabase start` lỗi với Podman | Đặt `export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock` trước lệnh |
| Link trong email xác nhận hoặc đặt lại mật khẩu không mở được ở local | Link chỉ quay về các cổng trong `additional_redirect_urls` của `supabase/config.toml` (3000, 3017, 3218). Đổi cấu hình thì `npx supabase stop` rồi `start` |
| `db push` báo migration nằm trước migration cuối trên remote | Tên migration dùng mã ngắn. Đổi tên theo mã thời gian 14 chữ số sau migration cuối đã áp dụng (mục Migration, bước 1) |
| Ba job email trả 503 mỗi ngày trên production | Đúng thiết kế khi chưa đặt `EMAIL_PROVIDER`. Bật email theo [kế hoạch POC](poc-setup.md#vận-hành-khi-chưa-có-email-riêng-rà-soát-30102026) |
| Học viên quên mật khẩu khi production chưa có email riêng | Người vận hành đặt mật khẩu tạm trong Supabase Dashboard › Authentication › Users và gửi riêng cho học viên |

## Lệnh npm

| Lệnh | Việc |
|---|---|
| `npm run dev`, `build`, `start` | Chạy web local ở 127.0.0.1 |
| `npm run check` | `format:check` + `lint` + `typecheck` + `test` |
| `npm run test:e2e`, `test:e2e:supabase` | Playwright không dịch vụ / trên Supabase local |
| `npm run audit:layout` | Mở các trang ở 360/768/1280px và báo lỗi bố cục ([cách dùng](testing/layout-audit-2026-11-03.md)) |
| `npm run validate:data` | Kiểm tra dữ liệu kana, bảng audio kana và danh mục bài trong `content/` |
| `npm run audio:plan`, `audio:generate` | Kế hoạch (không gọi dịch vụ) và sinh audio ([audio](06-audio.md)) |
| `npm run lesson:import -- --file <bài.json>` | Kiểm tra một file bài (mặc định chỉ kiểm tra); thêm `--publish local` hoặc `--publish supabase --revision <n> --owner <id>` để xuất bản. Supabase từ chối bài còn nhãn mẫu hoặc thiếu audio |
| `npm run seed:local`, `seed:demo`, `admin:grant` | Tạo tài khoản và dữ liệu thử, cấp quyền quản trị; chỉ Supabase local |
| `npm run daily:import` | Chuyển Google Sheet bài hằng ngày của giáo viên thành ngân hàng câu N5/N4 ([hướng dẫn](testing/n4-review-bank.md)) |
| `npm run bank:sql`, `listening:sql` | Viết một file SQL (mặc định kết thúc bằng ROLLBACK) để xuất bản ngân hàng ôn hoặc nạp bộ đề nghe; không tự gửi tới database |
| `npm run furigana:sql` | Viết một file SQL (mặc định ROLLBACK) thêm furigana cho nhiều câu của bài đã giao một lần, ví dụ cả bài hằng ngày, từ file xuất `assignment_items` và bản đã viết `{漢字|かんじ}`. Gọi `fix_assignment_question` cho từng câu (cần migration `20261105044634`), ghi lịch sử như khi sửa trên web; từ chối nếu khác gì ngoài furigana ([DD](detail-design/phase-3.md#sửa-lỗi-hiển-thị-bài-đã-giao--05112026)) |

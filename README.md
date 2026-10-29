# Masu

Quy ước phát triển: [coding standards](docs/coding-standards.md), [hướng dẫn agent](AGENTS.md). File/thư mục/route và identifier dùng tiếng Anh; nội dung học giữ tiếng Việt/Nhật. Chạy `npm run check` trước khi bàn giao thay đổi.

Masu hướng tới dịch vụ cho giáo viên: quản lý lớp, slide/chia sẻ học liệu, bài tập và theo dõi tiến độ; dạy video qua Google Meet bên ngoài. [Thiết kế dịch vụ](docs/basic-design/teaching-service.md) bổ sung đăng ký giáo viên, tiếng Trung và nhập scan có duyệt — các phần mở rộng này chưa triển khai. Nền hiện tại bắt đầu từ tiếng Nhật N5, với trang chủ, bảng kana, luyện romaji và trang nguồn dữ liệu. [Tài liệu](docs/README.md), [BD giai đoạn 1](docs/basic-design/phase-1.md), [DD giai đoạn 1](docs/detail-design/phase-1.md).

Đã có thêm 5 bài mẫu tự biên soạn tại `/lessons`, trang đọc, `/grammar`, slide/presenter và bản in PDF. Bài mẫu chưa được giảng viên duyệt. [BD giai đoạn 2](docs/basic-design/phase-2.md), [DD giai đoạn 2](docs/detail-design/phase-2.md), [hướng dẫn nội dung](docs/content-authoring.md).

Giai đoạn 3 (lớp học, bài giao, làm bài, sổ lỗi, ôn tập FSRS, theo dõi lớp, CSV) và editor bài học/nhập từ vựng CSV của giai đoạn 4 chạy khi có Supabase; đã kiểm chứng trên Supabase local. [BD giai đoạn 4](docs/basic-design/phase-4.md), [DD giai đoạn 4](docs/detail-design/phase-4.md). [BD giai đoạn 3](docs/basic-design/phase-3.md), [DD giai đoạn 3](docs/detail-design/phase-3.md), [checklist](docs/testing/phase-3.md).

Giai đoạn 5 phần A thêm luyện nghe: câu nghe/chính tả soạn trên web, trang `/listening/[lessonId]`, câu nghe trong bài giao practice và báo cáo nghe. [BD](docs/basic-design/phase-5.md), [DD](docs/detail-design/phase-5.md), [checklist](docs/testing/phase-5.md). Kanji và furigana chưa làm.

## Chạy local

Yêu cầu Node.js 24, npm. Dependency khóa trong package-lock.json.

```bash
npm ci
npm run dev
```

Mở http://127.0.0.1:3000. Đổi cổng: `npm run dev -- --port 3017`. Không cần tài khoản cloud hoặc file .env để học/luyện kana và đọc bài công khai. Thiếu cấu hình Supabase thì trang tài khoản/lớp báo chưa kích hoạt, không có phiên giả.

## Kiểm tra

```bash
npm run check
npm run build
npm exec playwright install chromium
npm run test:e2e
```

Playwright tự chạy dev server ở 127.0.0.1:3217, dừng sau test, không tái sử dụng process khác. Next không cho hai dev server dùng chung thư mục .next, nên dừng `npm run dev` đang chạy trước khi chạy E2E. Test migration dùng PostgreSQL nhúng trong bộ nhớ với auth stub; không kết nối Supabase thật. Test audio browser dùng MP3 silence fixture và request local giả lập; test pipeline dùng adapter fake, không tiêu tốn quota TTS hoặc ghi cloud. Tránh chạy build và dev cùng lúc vì dùng chung output .next.

Production local: `npm run build`, sau đó `npm start`. Chưa có deploy hoặc kiểm chứng cloud. [Checklist](docs/testing/phase-1.md) ghi kết quả và giới hạn.

## Audio

MP3 chuẩn chưa được sinh khi chưa có credentials. Bấm nghe sẽ thử giọng Nhật của thiết bị nếu chưa có file; không có giọng Nhật thì trang báo rõ. Không có audio vẫn luyện romaji được.

```bash
npm run audio:plan
```

Dry-run không gọi dịch vụ hoặc ghi file. Để sinh thật, sao chép `.env.example` thành `.env.local`, điền AZURE_SPEECH_KEY và AZURE_SPEECH_REGION. Không đưa khóa vào git.

```bash
npm run audio:generate -- --local
```

File ở public/audio/kana, mapping ở content/audio-manifest.json. Nghe duyệt phát âm trước khi dùng thật. Commit manifest tương ứng với artifact audio đã chuẩn bị; không commit manifest trỏ tới file local không được đưa lên môi trường đích.

Upload R2: điền R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET và R2_PUBLIC_BASE_URL (ví dụ https://audio.example.com/audio/kana), chạy:

```bash
npm run audio:generate -- --r2
```

Đặt NEXT_PUBLIC_AUDIO_BASE_URL cùng giá trị public base rồi rebuild/restart web. Đường dẫn object là audio/kana/{hash}.mp3. Bucket/domain phải được người vận hành tạo trước. Muốn đồng bộ metadata thêm --sync-db và SUPABASE_URL/SUPABASE_SECRET_KEY. Script không tạo bucket hoặc tự migrate. Chạy lại kiểm tra asset theo hash và tiếp tục mapping sau lỗi; lock local ngăn chạy trùng cùng workspace, chưa hỗ trợ chạy nhiều máy đồng thời.

## Lớp học trên Supabase local

Cần Docker hoặc Podman. Supabase CLI đã khóa trong devDependencies; cấu hình ở supabase/config.toml chỉ bật database, Auth, REST và Mailpit, bắt buộc xác nhận email.

```bash
npx supabase start            # Podman: export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock
npx supabase status -o env    # lấy API_URL, PUBLISHABLE_KEY, SECRET_KEY
```

Tạo .env.local với LESSON_SOURCE=supabase, SUPABASE_URL=API_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY rồi:

```bash
npm run seed:local -- --password <mật-khẩu-giảng-viên-local>
npm run dev
```

Script seed chỉ ghi vào Supabase chạy trên máy này: tạo teacher@masu.local đã xác nhận, cấp role giảng viên và xuất bản 5 bài mẫu (vẫn mang nhãn chờ duyệt). Email xác nhận/đặt lại mật khẩu xem tại Mailpit http://127.0.0.1:54324. Kiểm thử trọn luồng lớp học:

```bash
npm run test:e2e:supabase
```

Bộ này dùng cổng 3218, đọc khóa từ `supabase status` và từ chối URL không phải local. Không dùng project cloud cho kiểm thử tự động.

Email nhắc bài local: đặt EMAIL_PROVIDER=mailpit, MAILPIT_URL, EMAIL_FROM, CRON_SECRET và EMAIL_LINK_SECRET trong .env.local, bật nhắc tại /settings/notifications rồi gọi job thủ công:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/student-reminders
```

Thư xuất hiện trong Mailpit. Job chạy lại trong cùng ngày không gửi trùng. Lịch production nằm trong vercel.json (giờ UTC).

## Database

Nguồn bài mặc định LESSON_SOURCE=local. Để đọc Supabase, cần LESSON_SOURCE=supabase, SUPABASE_URL và SUPABASE_SECRET_KEY. Teacher sign-in và API notes dùng SUPABASE_PUBLISHABLE_KEY/cookie HttpOnly, không dùng secret key để bỏ qua quyền notes. Thiếu cấu hình thì không có session giả và không trả ghi chú riêng. Xem [staging setup](docs/staging-setup.md).

Migration nền: supabase/migrations/202610280001_foundation.sql. Chỉ là artifact đã kiểm tra trên PostgreSQL nhúng. Chưa áp dụng vào cloud; chưa cần database để chạy kana. Khi có dự án Supabase local/staging được chỉ định, kiểm chứng migration và Auth thật trước khi dùng cho nội dung giai đoạn 2. Không áp dụng vào production theo hướng dẫn khởi động local này.

## Font và nguồn

Font phục vụ từ các gói @fontsource, không tải Google Fonts lúc build. License được giữ trong public/fonts và liên kết tại /sources. Dữ liệu kana ở content/kana.json; chưa nhập từ điển hoặc sao chép nội dung giáo trình.

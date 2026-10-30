# Reng

Tên sản phẩm là **Reng** (tiếng chuông vào lớp).

Quy ước phát triển: [coding standards](docs/coding-standards.md), [hướng dẫn agent](AGENTS.md). File/thư mục/route và identifier dùng tiếng Anh; pilot hiện ưu tiên dạy tiếng Nhật theo trình tự Minna no Nihongo, giữ luồng Việt–Trung. Dịch vụ giáo viên đang triển khai theo từng lát trong [đối chiếu source](docs/source-alignment.md). Chạy `npm run check` trước khi bàn giao thay đổi.

Reng hướng tới dịch vụ cho giáo viên: quản lý lớp, slide/chia sẻ học liệu, bài tập và theo dõi tiến độ; dạy video qua Google Meet bên ngoài. [Thiết kế dịch vụ](docs/basic-design/teaching-service.md) bổ sung đăng ký giáo viên, ưu tiên dạy tiếng Trung cho người Việt (Việt–Trung), chia sẻ và nhập scan có duyệt; nền tảng hướng tới nhiều môn/ngôn ngữ. Đã có đăng ký giáo viên tự phục vụ, một tài khoản vừa dạy vừa học, xuất bản không tự công khai, sức chứa lớp, link Meet, soạn bài Việt–Trung theo mẫu (bảng chữ Hán/pinyin/nghĩa, dựng slide, xác nhận đáp án, chấm chính xác thanh điệu và giản/phồn thể), chia sẻ phiên bản view/copy giữa giáo viên, sao chép và tạo bản sao bài của mình, trang quản trị (duyệt giáo viên thuê, hạn thuê, nhật ký) và SEO cho trang công khai; TTS web và nhập scan chưa triển khai. Công cụ và chi phí cho POC: [kế hoạch POC](docs/poc-setup.md). Nền hiện tại bắt đầu từ tiếng Nhật N5, với trang chủ, bảng kana, luyện romaji và trang nguồn dữ liệu. [Tài liệu](docs/README.md), [BD giai đoạn 1](docs/basic-design/phase-1.md), [DD giai đoạn 1](docs/detail-design/phase-1.md).

**Pilot hiện tại (29/10/2026): dạy tiếng Nhật theo trình tự Minna no Nihongo.** Giáo viên tạo bài 1, 2, 11 hoặc 12 từ bài mẫu tự biên soạn (bài 1: giới thiệu bản thân; bài 2: これ・それ・あれ; bài 11: đếm số lượng; bài 12: quá khứ và so sánh; mỗi bài khoảng 45–55 từ có icon minh họa, mẫu câu furigana, hội thoại dạng bong bóng, luyện thay thế và 50 câu luyện), duyệt rồi xuất bản riêng cho lớp; lớp mới mặc định tiếng Nhật; học viên tự đăng ký và vào lớp bằng mã. Mỗi lớp có thể bật **bài luyện hằng ngày** (5–15 câu tự giao từ 6:00 sáng, lấy từ bài mở gần nhất có câu luyện, cron `/api/cron/daily-practice`). Hướng dẫn sử dụng cho giáo viên, học viên và quản trị viên ở trang `/guide`. Nội dung không chép nguyên văn sách. Xem [bài Minna](docs/content-authoring.md#bài-tiếng-nhật-theo-trình-tự-minna-no-nihongo-pilot) và [kết quả kiểm thử](docs/testing/teaching-service.md).

Đã có thêm 5 bài mẫu tự biên soạn tại `/lessons`, trang đọc, `/grammar`, slide/presenter và bản in PDF. Bài mẫu chưa được giảng viên duyệt. [BD giai đoạn 2](docs/basic-design/phase-2.md), [DD giai đoạn 2](docs/detail-design/phase-2.md), [hướng dẫn nội dung](docs/content-authoring.md).

Giai đoạn 3 (lớp học, bài giao, làm bài, sổ lỗi, ôn tập FSRS, theo dõi lớp, CSV) và editor bài học/nhập từ vựng CSV của giai đoạn 4 chạy khi có Supabase; đã kiểm chứng trên Supabase local. [BD giai đoạn 4](docs/basic-design/phase-4.md), [DD giai đoạn 4](docs/detail-design/phase-4.md). [BD giai đoạn 3](docs/basic-design/phase-3.md), [DD giai đoạn 3](docs/detail-design/phase-3.md), [checklist](docs/testing/phase-3.md).

Giai đoạn 5 phần A thêm luyện nghe: câu nghe/chính tả soạn trên web, trang `/listening/[lessonId]`, câu nghe trong bài giao practice và báo cáo nghe. [BD](docs/basic-design/phase-5.md), [DD](docs/detail-design/phase-5.md), [checklist](docs/testing/phase-5.md). Kanji và furigana chưa làm.

Rà soát trải nghiệm ngày 30/10/2026: trang chủ có lối vào lớp bằng mã, tự học và giảng dạy; menu giáo viên mở trực tiếp cả lớp đang học. Trang giao bài hướng dẫn tạo/xuất bản khi chưa có học liệu và chỉ cho chọn bài đã có phiên bản xuất bản. Xem [báo cáo bug UI, cải tiến và giới hạn kiểm chứng](docs/testing/user-flow-review.md).

Rà soát mã nguồn 30/10/2026: đã sửa lỗi mất câu trả lời khi mạng chập chờn, mất bài đang soạn khi lưu lỗi, chuyển hướng ra trang ngoài qua `next`, trang chủ học viên che bài hôm nay, form lưu bài vào lớp đổi thứ tự/giờ mở; thêm link mời vào lớp. Xem [lỗi đã sửa, còn mở và giới hạn kiểm chứng](docs/testing/code-review-2026-10-30.md).

Quản lý Nhật–Trung: đã bổ sung tìm/lọc bài theo ngôn ngữ và trạng thái, nhãn ngôn ngữ từng phiên bản, lối chọn công cụ soạn/nhập và mặc định câu kiểm tra theo lớp. Xem [kết quả và phần cần nghiệm thu](docs/testing/teaching-management.md), [quy trình nâng cấp bài](docs/content-authoring.md#quản-lý-và-nâng-cấp-bài-cho-lớp-nhậttrung).

Lịch sử bài tập cũ từ Google Sheets được xem riêng tư tại `/history`, có lọc ngày/kết quả và giữ điểm gốc; giáo viên xem bản thân và học viên được chỉ định. Học viên chưa đăng ký cần xác nhận email rồi giáo viên bấm liên kết. Sheet giữ làm bản lưu; bài mới quản lý trong lớp Reng. Xem [thiết kế và cách nhập](docs/detail-design/learning-history.md), [kết quả kiểm chứng](docs/testing/learning-history.md).

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

Production local: `npm run build`, sau đó `npm start`. Bản chạy thật từ 29/10/2026: https://reng-cyan.vercel.app (Vercel Hobby, hàm chạy ở Singapore `sin1`, tự deploy mỗi lần push `main`; Supabase Free project `reng` ở Singapore). Trạng thái, giới hạn và cách cập nhật xem [kế hoạch POC](docs/poc-setup.md#production-thử-29102026). [Checklist](docs/testing/phase-1.md) ghi kết quả và giới hạn.

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

Script seed chỉ ghi vào Supabase chạy trên máy này: tạo teacher@reng.local đã xác nhận, cấp role giảng viên, xuất bản 5 bài mẫu (vẫn mang nhãn chờ duyệt) rồi đặt riêng chúng ở chế độ công khai, vì xuất bản không tự công khai. Để xem giao diện dịch vụ Việt–Trung, chạy thêm `npm run seed:demo` (cùng mật khẩu `SEED_TEACHER_PASSWORD`): tạo admin@reng.local (quản trị viên), co.lan@reng.local (giáo viên tiếng Trung đã duyệt, có bài, lớp 10 chỗ và bài luyện tập), thay.minh@reng.local (yêu cầu giảng dạy đang chờ duyệt) và hoc.vien@reng.local (học viên đã vào lớp). Nội dung bài demo chỉ để minh họa, chưa được giáo viên tiếng Trung duyệt; chạy lại không tạo trùng. Tạo hoặc cập nhật một tài khoản giáo viên khác trên stack local (đã xác minh, có quyền dạy, mật khẩu `SEED_TEACHER_PASSWORD`): `npm run seed:local -- --email <email> --name "<Họ tên>"`. Email xác nhận/đặt lại mật khẩu xem tại Mailpit http://127.0.0.1:54324; link chỉ quay về các cổng trong `additional_redirect_urls` của supabase/config.toml (3000, 3017, 3218), đổi cấu hình thì chạy `npx supabase stop` rồi `npx supabase start`. Kiểm thử trọn luồng lớp học:

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

Migration trong supabase/migrations được kiểm tra trên PostgreSQL nhúng và Supabase local, và đã áp dụng vào project production `reng` bằng `npx supabase db push` (sau khi `npx supabase link`). Migration mới phải chạy test và E2E local trước khi push lên production; không cần database để chạy kana.

## Font và nguồn

Font phục vụ từ các gói @fontsource, không tải Google Fonts lúc build. License được giữ trong public/fonts và liên kết tại /sources. Dữ liệu kana ở content/kana.json; chưa nhập từ điển hoặc sao chép nội dung giáo trình.

# Reng

Tên sản phẩm là **Reng** (tiếng chuông vào lớp).

Reng hướng tới dịch vụ cho giáo viên: quản lý lớp, slide/chia sẻ học liệu, bài tập và theo dõi tiến độ; dạy video qua Google Meet bên ngoài. [Thiết kế dịch vụ](docs/basic-design/teaching-service.md) bổ sung đăng ký giáo viên, ưu tiên dạy tiếng Trung cho người Việt (Việt–Trung), chia sẻ và nhập scan có duyệt; nền tảng hướng tới nhiều môn/ngôn ngữ. Đã có đăng ký giáo viên tự phục vụ, một tài khoản vừa dạy vừa học, xuất bản không tự công khai, sức chứa lớp, link Meet, soạn bài Việt–Trung theo mẫu (bảng chữ Hán/pinyin/nghĩa, dựng slide, xác nhận đáp án, chấm chính xác thanh điệu và giản/phồn thể), chia sẻ phiên bản view/copy giữa giáo viên, sao chép và tạo bản sao bài của mình, trang quản trị (duyệt giáo viên thuê, hạn thuê, nhật ký) và SEO cho trang công khai; TTS web và nhập scan chưa triển khai. Công cụ và chi phí cho POC: [kế hoạch POC](docs/poc-setup.md). Nền hiện tại bắt đầu từ tiếng Nhật N5, với trang chủ, bảng kana, luyện romaji và trang nguồn dữ liệu. [Tài liệu](docs/README.md), [BD giai đoạn 1](docs/basic-design/phase-1.md), [DD giai đoạn 1](docs/detail-design/phase-1.md).

**Pilot hiện tại (29/10/2026): dạy tiếng Nhật theo trình tự Minna no Nihongo.** Giáo viên tạo bất kỳ bài nào từ 1 đến 15 từ bài mẫu tự biên soạn (bài 1: giới thiệu bản thân; bài 2: これ・それ・あれ; bài 3: nơi chốn và mua sắm; bài 4: giờ giấc và sinh hoạt; bài 5: đi lại và ngày tháng; bài 6: ăn uống và lời mời; bài 7: cho, nhận và công cụ; bài 8: tính từ; bài 9: sở thích, khả năng và lý do; bài 10: có gì, ở đâu; bài 11: đếm số lượng; bài 12: quá khứ và so sánh; bài 13: mong muốn và mục đích đi lại; bài 14: thể て, nhờ vả và việc đang làm; bài 15: xin phép, cấm đoán và trạng thái; mỗi bài khoảng 45–55 từ có icon minh họa, mẫu câu furigana, hội thoại dạng bong bóng, luyện thay thế và 50 câu luyện), duyệt rồi xuất bản riêng cho lớp; lớp mới mặc định tiếng Nhật; học viên tự đăng ký và vào lớp bằng mã. Mỗi lớp có thể bật **bài luyện hằng ngày** (5–70 câu tự giao từ 6:00 sáng, cron `/api/cron/daily-practice`) lấy câu từ bài giáo viên chọn, ví dụ ngân hàng ôn, hoặc tự động từ bài mở gần nhất có câu luyện; ngân hàng câu N5/N4 từ Google Sheet của giáo viên nhập bằng `npm run daily:import -- --level N5|N4`. Hướng dẫn sử dụng cho giáo viên, học viên và quản trị viên ở trang `/guide`. Nội dung không chép nguyên văn sách. Xem [bài Minna](docs/content-authoring.md#bài-tiếng-nhật-theo-trình-tự-minna-no-nihongo-pilot) và [kết quả kiểm thử](docs/testing/teaching-service.md).

Quy ước phát triển: [coding standards](docs/coding-standards.md), [hướng dẫn agent](AGENTS.md). File/thư mục/route và identifier dùng tiếng Anh; pilot hiện ưu tiên dạy tiếng Nhật theo trình tự Minna no Nihongo, giữ luồng Việt–Trung. Dịch vụ giáo viên đang triển khai theo từng lát trong [đối chiếu source](docs/source-alignment.md). Chạy `npm run check` trước khi bàn giao thay đổi.

Tài liệu: [mục lục theo việc cần làm](docs/README.md), [vận hành](docs/operations.md) (môi trường, biến môi trường, cron, migration, phát hành), [kiến trúc](docs/02-architecture.md). Các thay đổi theo ngày ở [Nhật ký cập nhật](#nhật-ký-cập-nhật) cuối trang.

## Tính năng theo giai đoạn

Đã có thêm 5 bài mẫu tự biên soạn tại `/lessons`, trang đọc, `/grammar`, slide/presenter và bản in PDF. Bài mẫu chưa được giảng viên duyệt. [BD giai đoạn 2](docs/basic-design/phase-2.md), [DD giai đoạn 2](docs/detail-design/phase-2.md), [hướng dẫn nội dung](docs/content-authoring.md).

Giai đoạn 3 (lớp học, bài giao, làm bài, sổ lỗi, ôn tập FSRS, theo dõi lớp, CSV) và editor bài học/nhập từ vựng CSV của giai đoạn 4 chạy khi có Supabase; đã kiểm chứng trên Supabase local. [BD giai đoạn 4](docs/basic-design/phase-4.md), [DD giai đoạn 4](docs/detail-design/phase-4.md). [BD giai đoạn 3](docs/basic-design/phase-3.md), [DD giai đoạn 3](docs/detail-design/phase-3.md), [checklist](docs/testing/phase-3.md).

Giai đoạn 5 phần A thêm luyện nghe: câu nghe/chính tả soạn trên web, trang `/listening/[lessonId]`, câu nghe trong bài giao practice và báo cáo nghe. [BD](docs/basic-design/phase-5.md), [DD](docs/detail-design/phase-5.md), [checklist](docs/testing/phase-5.md). Luyện kanji theo bài (`/kanji/[lessonId]`, [BD](docs/basic-design/kanji-practice.md)) và furigana `{漢字|かんじ}` trong trang đọc, slide và bài tập đã có; chưa nhập KANJIDIC2/KanjiVG nên chưa có âm on/kun và thứ tự nét.

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

Production local: `npm run build`, sau đó `npm start`. Bản chạy thật từ 29/10/2026: https://reng-class.vercel.app (Vercel Hobby, hàm chạy ở Singapore `sin1`, tự deploy mỗi lần push `main`; Supabase Free project `reng` ở Singapore). Trạng thái, giới hạn và cách cập nhật xem [kế hoạch POC](docs/poc-setup.md#production-thử-29102026). [Checklist](docs/testing/phase-1.md) ghi kết quả và giới hạn.

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

Audio bài học (từ vựng, câu ví dụ, câu nghe) dùng `--lessons` (thêm `--db` cho bản nháp trên database, `--lesson <mã bài>` để chỉ sinh cho một bài), tải lên theo `R2_LESSON_PUBLIC_BASE_URL`; web đọc từ `NEXT_PUBLIC_LESSON_AUDIO_BASE_URL`. Bộ đề nghe Minna 1–15 có sẵn ở `content/listening/`; audio của bộ đề sinh bằng `--local --listening <file>` và đi kèm bản web trong `public/audio/lessons` (không cần R2). Cách tạo khóa Azure, sinh audio và nạp bài xem [hướng dẫn soạn bài](docs/content-authoring.md#làm-bài-nghe).

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

Migration trong supabase/migrations được kiểm tra trên PostgreSQL nhúng và Supabase local, và đã áp dụng vào project production `reng` bằng `npx supabase db push --linked` (sau khi `npx supabase link`; xem trước bằng `--dry-run`). Luôn ghi `--linked`: từ Supabase CLI 3, `db push` không có cờ này sẽ đẩy vào database local. Migration mới phải chạy test và E2E local trước khi push lên production; không cần database để chạy kana.

## Font và nguồn

Font phục vụ từ các gói @fontsource, không tải Google Fonts lúc build. License được giữ trong public/fonts và liên kết tại /sources. Dữ liệu kana ở content/kana.json; chưa nhập từ điển hoặc sao chép nội dung giáo trình.

## Nhật ký cập nhật

Mới nhất ở trên. Báo cáo kiểm thử và rà soát đầy đủ theo ngày ở [mục lục tài liệu](docs/README.md#báo-cáo-kiểm-thử-và-rà-soát).

### 10/11/2026

- Rà soát quy ước mã nguồn và tài liệu: ba script Python của đợt JLPT 09/11 viết lại bằng TypeScript (`npm run jlpt:drafts`, `npm run audit:jlpt-audio`) và bộ câu nháp nay được kiểm tra trong `npm run check`; tách trang lớp của giáo viên và bảng sửa lỗi hiển thị thành component theo từng phần; [quy ước code](docs/coding-standards.md) mô tả đủ cấu trúc thư mục, cách viết script, CSS, test và commit. Xem [báo cáo](docs/testing/code-review-2026-11-10.md).
- Tài liệu nguồn đề JLPT N4/N5 (đợt 09/11): danh mục nguồn chính thức chỉ lưu link, chờ duyệt bản quyền; 6 câu N5 và 6 câu N4 tự biên soạn đang chờ duyệt tiếng Nhật; bộ 20 câu nghe thi thử N4 (`content/listening/n4-viet-listening-mock-20.json`) chưa có audio. Xem [hướng dẫn nội dung](docs/content-authoring.md#nguồn-đề-jlpt-và-câu-tự-biên-soạn).

### 09/11/2026

- Thi thử JLPT: giáo viên lớp tiếng Nhật tạo đề N5/N4 từ ngân hàng ôn của lớp theo ba phần như đề thật, mỗi học viên một lượt có đồng hồ (mặc định 90/115 phút) tự nộp khi hết giờ; kết quả có điểm từng phần, điểm ước tính thang 180 và đếm ngược tới kỳ thi 06/12/2026. Cần áp migration `20261109032029`. Xem [thiết kế](docs/detail-design/phase-3.md#thi-thử-jlpt--09112026).
- Rà soát sau đợt merge 07/11: tên file migration nay khớp lịch sử production (`20261107044229_daily_practice_seventy`, điểm danh đổi thành `20261109024203`) để `npx supabase db push --linked` chạy được; form bài luyện hằng ngày có lựa chọn **Theo tỉ lệ của bài** và lưu form không còn tự đổi lớp sang 0 câu nghe; lưu vị trí slide không còn xóa dấu "Đã học xong"; CI chạy `npm run check` (có kiểm tra định dạng) cho PR và `main`. Xem [báo cáo](docs/testing/review-2026-11-09.md).

### 07/11/2026

- Bài luyện hằng ngày và bài giao tối đa 70 câu (migration đã áp production); lớp chọn số câu nghe mỗi ngày (0–10 hoặc theo tỉ lệ của bài); ngân hàng ôn N4/N5 thêm câu nghe có audio; học viên mở lại slide ở vị trí đã xem. Xem [thiết kế](docs/detail-design/teaching-service.md#số-câu-nghe-mỗi-ngày-bài-70-câu-và-mở-lại-slide--0711-và-09112026).

### 06/11/2026

- Rà soát giao diện, luồng và database: quyền, RLS và quan hệ dữ liệu đúng thiết kế; 38/38 và 34/34 kịch bản E2E đạt sau khi cập nhật 7 kịch bản theo giao diện mới; crawl 326 trang theo vai không có lỗi. Còn lại: quyền ghi thẳng bảng `lessons` cho phép lách kiểm tra chia sẻ lại, chưa có đường xóa dữ liệu học viên. Xem [báo cáo](docs/testing/project-audit-2026-11-06.md).
- Giáo viên sao chép tin nhắn giao bài (tên bài, hạn nộp, link) để dán vào nhóm Zalo/Messenger của lớp. Xem [thiết kế](docs/detail-design/phase-3.md#tin-nhắn-giao-bài-cho-nhóm-lớp--06112026).
- Điểm danh trong nhật ký buổi dạy và danh sách học viên hay vắng. Cần áp migration `20261109024203`. Xem [thiết kế](docs/detail-design/teaching-service.md#điểm-danh-trong-nhật-ký-buổi-dạy--06112026).

### 05/11/2026

- Sửa lỗi hiển thị bài đã giao: giáo viên sửa đề, giải thích và furigana của câu đã giao (kể cả bài hằng ngày) mà không đổi đáp án, bài làm hay điểm; mỗi lần sửa được lưu lại. Cần áp migration `20261105044634`. Xem [thiết kế](docs/detail-design/phase-3.md#sửa-lỗi-hiển-thị-bài-đã-giao--05112026).
- Furigana trong bài tập: đề, lựa chọn, đoạn văn, giải thích và lời nghe hiện cách đọc khi giáo viên viết `{漢字|かんじ}`, như trang đọc bài; xuất bản từ chối furigana làm lộ đáp án. Xem [thiết kế](docs/detail-design/phase-3.md#furigana-trong-bài-tập--05112026).
- Rà soát tài liệu, mã nguồn và trải nghiệm (04–05/11/2026): mọi trang ghi ngày giờ một kiểu ("23:59 04/11/2026"), form giao bài dùng chữ "giao" thay cho "xuất bản", lượt bỏ dở của bài không cho nộp muộn được tự nộp khoảng 6:00 sau hạn (cần áp migration `20261105012503`), thêm [sổ tay vận hành](docs/operations.md), viết lại [kiến trúc](docs/02-architecture.md). Xem [báo cáo](docs/testing/system-review-2026-11-05.md).

### 04/11/2026

- Trang lịch sử bài tập cũ từ Google Sheets (`/history`) đã gỡ ngày 04/11/2026: bài làm trên Reng xem ở trang Tiến độ (điểm theo tuần, sổ lỗi, tỉ lệ đúng theo dạng câu) và trang Luyện tập hằng ngày của lớp (`/classes/[id]/daily-practice`: điểm từng ngày với ô màu như Sheet cũ, bấm ngày để xem từng câu; giáo viên xem ở trang chi tiết học viên); link cũ chuyển về `/progress`. Bảng dữ liệu đã nhập vẫn giữ trong database. Xem [thiết kế cũ](docs/basic-design/learning-history.md).
- Chuẩn hóa Kanji Nhật v1 (04/11/2026): migration `20261104063229` đã áp dụng trên cloud `reng`, sửa `kanji: null` thành bỏ trường trong nháp và snapshot, giữ ID/version lớp đang ghim, thêm ràng buộc chặn giá trị sai kiểu. Xem [thiết kế](docs/detail-design/phase-4.md#chuẩn-hóa-kanji-v1) và [kiểm chứng](docs/testing/phase-4.md).

### 03/11/2026

- Ôn N4 (03/11/2026): bộ **Tổng ôn N4 — Minna 1–50** trong repo có **304 câu, 10 dạng bài** và 80 từ vựng. Ngoài đọc kanji, biến đổi từ, ngữ pháp và đọc hiểu, nay thêm chọn cách đọc kanji, chọn chữ Hán, từ vựng theo ngữ cảnh, câu cùng nghĩa, điền trợ từ và sắp xếp câu (bấm mảnh theo thứ tự). Đoạn văn đọc hiểu nằm trong khung riêng, và các câu cùng đoạn đi liền nhau. Bài hằng ngày 40 câu đủ 10 dạng. Production vẫn dùng bản 200 câu cho đến khi chạy `npm run bank:sql` theo [hướng dẫn](docs/testing/n4-review-bank.md#đa-dạng-dạng-bài--03112026). Bộ Minna 1–28 vẫn giữ riêng. Câu tự biên soạn, chưa sinh câu mới bằng AI; chưa có phần nghe.
- Sửa lỗi luồng học và dạy (03/11/2026): trang Tài khoản (đổi họ tên, mật khẩu), quên mật khẩu có lối vào bằng Google, thông báo câu luyện nghe rõ ràng, trình soạn hỏi lại trước khi rời trang chưa lưu, giáo viên xóa học viên khỏi lớp và học viên tự rời lớp, lịch học hằng tuần với "Buổi tới" cho học viên (migration `202611030002` đã chạy trên production), trình soạn có mục "Dùng bài trong lớp" và trang Giảng dạy có "Các bước bắt đầu dạy", học viên có mục "Hôm nay học gì" ở Lớp của tôi và trang chủ. Xem [lỗi còn lại và phần cần quyết định](docs/testing/flow-fixes-2026-11-03.md).
- Kiểm tra bố cục bằng code (03/11/2026): `npm run audit:layout` mở các trang ở 360/768/1280px và báo chữ chồng hoặc dính nhau, hàng lệch, nút sát chữ, chữ bị cắt, tràn ngang và vùng bấm nhỏ; các chỗ nó tìm thấy đã được sửa. Xem [công cụ và kết quả](docs/testing/layout-audit-2026-11-03.md).
- Đăng nhập bằng Google (03/11/2026): nút Google ở trang đăng nhập và hai trang đăng ký, quay lại đúng trang đang mở. Nút chỉ hiện khi `AUTH_GOOGLE_ENABLED=true` và nhà cung cấp Google đã bật trong Supabase Auth; production đã bật từ 03/11/2026. Xem [các bước bật](docs/poc-setup.md#bật-đăng-nhập-bằng-google-03112026) và [kiểm tra](docs/testing/google-sign-in-2026-11-03.md).
- Trang chung không gắn môn (03/11/2026): trang chủ, header, chân trang, metadata và ảnh chia sẻ giới thiệu Reng là nơi dạy và học online, không gắn tiếng Nhật; công cụ tự học tiếng Nhật nằm ở trang Tự học (`/self-study`), cùng môn tiếng Trung với bảng pinyin và luyện gõ pinyin (`/pinyin`). Xem [rà soát và phần còn gắn với ngôn ngữ](docs/testing/platform-neutral-ui-2026-11-03.md).
- Công cụ giáo viên (03/11/2026): từ chối yêu cầu làm giáo viên, audio sinh sẵn cho bài tiếng Trung, trang không còn lỗi khi danh sách dài; chấp nhận đáp án tương đương đang chờ áp migration. Xem [báo cáo](docs/testing/teacher-tools-2026-11-03.md).
- Soạn câu sắp xếp và đọc hiểu (03/11/2026): giáo viên thêm câu sắp xếp và câu có đoạn văn ngay trên trình soạn tiếng Nhật, tiếng Trung và câu kiểm tra riêng; sửa câu ngân hàng ôn không còn mất đoạn văn hay ngôn ngữ. Xem [báo cáo](docs/testing/question-authoring-2026-11-03.md).
- Độ đúng dữ liệu học tập (03/11/2026): flashcard và thẻ ôn theo bản lớp ghim, ID mục đã xóa không bị cấp lại, hàng ôn không bị thẻ hỏng che, thử lại khi mất mạng giữ kết quả đã lưu, chuỗi ngày học đủ khi ôn nhiều. Xem [báo cáo](docs/testing/data-correctness-2026-11-03.md).
- Bài tập dùng chung cho tiếng Nhật và tiếng Trung (03/11/2026): ô trả lời, phản hồi, nhãn phần và ngân hàng ôn theo ngôn ngữ của câu; lớp tiếng Trung có "Luyện chữ Hán" (pinyin nhận số thanh). Xem [rà soát](docs/testing/exercise-languages-2026-11-03.md).

### 02/11/2026

- Rà soát độ dễ dùng 02/11/2026 (đi thử học viên/giáo viên lớp Nhật và Trung ở 1280px và 390px): header gọn theo vai, menu gập trên điện thoại, bài hôm nay lên đầu, làm bài dài có danh sách câu và phím Enter, kết quả mở câu sai, pinyin gõ số thanh (`ni3 hao3` → `nǐ hǎo`), sửa thẻ ngôn ngữ tiếng Trung, khối Buổi dạy online (Meet, trình chiếu tiếp đúng phiên bản lớp, ghi buổi dạy từ slide). Xem [báo cáo và đề xuất tiếp theo](docs/testing/user-flow-review-2026-11-02.md).
- Giáo viên vừa dạy vừa học dùng một tài khoản: học trong **lớp tự học** của mình (chỉ mình là học viên, không có mã mời) và không tự vào lớp mình dạy; báo cáo lớp dạy không tính chủ lớp. Trang lớp có **nhật ký buổi dạy** (bài, slide dạy tới, ghi chú riêng, mở lại đúng slide), và bài tạo từ mẫu Minna có trang **cập nhật từ mẫu** mới nhất. Xem [Luồng 7](docs/basic-design/teaching-service.md#luồng-7--vừa-dạy-vừa-học-lớp-tự-học-nhật-ký-buổi-dạy-và-cập-nhật-bài-mẫu-02112026) và [kiểm chứng](docs/testing/teach-and-learn.md).

### 30/10/2026

- Rà soát trải nghiệm ngày 30/10/2026: trang chủ có lối vào lớp bằng mã, tự học và giảng dạy; menu giáo viên mở trực tiếp cả lớp đang học. Trang giao bài hướng dẫn tạo/xuất bản khi chưa có học liệu và chỉ cho chọn bài đã có phiên bản xuất bản. Xem [báo cáo bug UI, cải tiến và giới hạn kiểm chứng](docs/testing/user-flow-review.md).
- Rà soát mã nguồn 30/10/2026: đã sửa lỗi mất câu trả lời khi mạng chập chờn, mất bài đang soạn khi lưu lỗi, chuyển hướng ra trang ngoài qua `next`, trang chủ học viên che bài hôm nay, form lưu bài vào lớp đổi thứ tự/giờ mở; thêm link mời vào lớp. Xem [lỗi đã sửa, còn mở và giới hạn kiểm chứng](docs/testing/code-review-2026-10-30.md).
- Quản lý Nhật–Trung: đã bổ sung tìm/lọc bài theo ngôn ngữ và trạng thái, nhãn ngôn ngữ từng phiên bản, lối chọn công cụ soạn/nhập và mặc định câu kiểm tra theo lớp. Xem [kết quả và phần cần nghiệm thu](docs/testing/teaching-management.md), [quy trình nâng cấp bài](docs/content-authoring.md#quản-lý-và-nâng-cấp-bài-cho-lớp-nhậttrung).

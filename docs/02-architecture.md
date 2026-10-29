# Kiến trúc kỹ thuật

Phần nền mô tả mã nguồn hiện có; phần dịch vụ ngày 29/10/2026 ưu tiên Việt–Trung và soạn theo mẫu. [DD dịch vụ](detail-design/teaching-service.md) phân biệt schema/API đề xuất và runtime. Lựa chọn gói/giá cần hồ sơ xác minh trước vận hành, không suy ra đã deploy từ bảng stack.

## Stack

| Lớp | Chọn | Lý do |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Một codebase cho web và mobile browser, render phía server cho trang nội dung |
| Giao diện | Tailwind CSS + component trong repo | Button cva/clsx/tailwind-merge hiện có; không coi shadcn/Radix là đã cài |
| API nghiệp vụ | Next.js phía server | Kiểm tra quyền, giao/nộp/chấm bài ở các giai đoạn sau |
| Dữ liệu và xác thực | Supabase (Postgres + Auth + Realtime) | Database, đăng nhập, RLS; realtime chỉ bật khi triển khai quiz trực tiếp |
| Lưu media | Adapter R2 hiện có cho audio; storage private cho lớp/scan là thiết kế mới | Kiểm tra gói/quota thực tế; cache và quyền theo từng loại asset |
| Scan/OCR | Storage private + queue/worker dự kiến | Chưa chọn provider OCR/worker hosting; không xử lý job dài trong request web |
| Hosting | Vercel | Deploy bằng git push, cron tích hợp sẵn |
| Email | Resend adapter / Mailpit local | Template chuỗi escape trong repo, chưa dùng React Email; gửi thật còn chờ nghiệm thu |
| TTS | Azure adapter hiện có cho Nhật; Trung cần chọn locale/voice và nghe duyệt | Sinh sẵn, không gọi theo lượt học sinh; job web và review là phần mới |

Bản đầu dùng Next.js + Supabase theo bảng trên, xuyên suốt các giai đoạn. Astro với JSON tĩnh chỉ là phương án từng cân nhắc, không nằm trong kế hoạch triển khai hiện tại.

## Baseline triển khai local

Giai đoạn 1 đã có source Next.js/React/TypeScript, Tailwind và component UI trong repo. Button dùng cấu trúc cva/clsx/tailwind-merge; chưa cài toàn bộ component shadcn/Radix khi chưa cần. Font được self-host bằng @fontsource, không gọi Google Fonts lúc build. Phiên bản chính xác lấy từ package.json và package-lock.json; Node 24, npm.

Kana lấy từ JSON đã validate, không cần API hoặc Supabase runtime để mở trang/luyện. Giai đoạn 3 dùng Supabase Auth và các RPC transaction; supabase/config.toml chạy stack local bằng Supabase CLI để kiểm chứng trước cloud. Supabase hiện có migration nền và kiểm tra trên PostgreSQL nhúng, chưa áp dụng cloud. Azure/R2 có script chuẩn bị sẵn, chưa sinh MP3 thật khi chưa có credentials. Không coi các dịch vụ liệt kê trong stack là đã tích hợp hết.

Hosting chưa triển khai. Trước chọn gói Vercel cần xác minh điều kiện thương mại, lịch cron, hạn mức và giá hiện hành từ nguồn chính thức; không mặc định gói cá nhân đáp ứng dịch vụ hoặc chi phí hosting bằng 0.

## Sơ đồ luồng nội dung

```
  Soạn trên web          Nhập CSV từ vựng
        |                       |
        +-----------+-----------+
                    |
                    v
          Kho nội dung (Postgres)
          mỗi bài một khối JSON
                    |
                    v
        Sinh audio hàng loạt (script)
        Azure TTS -> mp3 -> R2
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
   Slide        Trang        Bài tập
   dạy lớp     tự học     chấm tự động
```

## Lý do tách nội dung khỏi giao diện

Nếu slide là một file riêng, bài tập là một file riêng, thì sửa một từ vựng phải sửa ba chỗ và sẽ có ngày ba chỗ lệch nhau.

Khi nội dung là một khối JSON duy nhất:

- Sửa một chỗ trong draft, các preview dựa trên draft dùng cùng nội dung; bản đã xuất bản/bài giao chỉ đổi khi có thao tác phiên bản riêng
- Thêm chế độ hiển thị mới (ví dụ xuất PDF) không phải nhập lại nội dung
- Tạo khung câu luyện từ nội dung, giáo viên bổ sung và xác nhận đáp án; không tự coi gợi ý là đáp án đúng
- Script audio quét được toàn bộ nội dung để biết câu nào còn thiếu file

## Quy ước thư mục

```text
app/
  page.tsx                    home
  kana/
    page.tsx                  kana chart
    practice/page.tsx         romaji practice
  sources/page.tsx            attribution and audio status
  lessons/[id]/               lesson reader, slide and presenter
  classes/, assignments/[id]/ learner classes, attempts and results
  review/, mistakes/, progress/, vocabulary/[lessonId]/
  teach/                      class management, assignments, reports
  actions/                    Server Actions for account and class forms
  api/                        attempts, drafts, submissions, reviews, CSV
components/
  kana/                       chart, setup, question and result views
  ui/                         shared UI primitives
  audio-provider.tsx
lib/
  kana.ts                     validation and practice domain logic
  audio-config.ts
  grading/                    shared client/server grading
  server/                     server-only Supabase access and authorization
scripts/
  generate-audio.ts
  validate-data.ts
  import-dictionary.ts        planned
  import-csv.ts               planned
```

## Nguyên tắc chấm điểm: chia đôi client và server

**Bài luyện** có thể công bố đáp án theo trải nghiệm luyện; reader/slide DTO thường lược đáp án và trả qua API đúng mục đích. Điểm lưu báo cáo luôn do server chấm lại từ raw và snapshot. Không coi mọi luồng hiện tại đều chấm client.

**Bài kiểm tra** chỉ gửi câu hỏi đã lọc. Server chấm khi nộp nhưng chỉ công bố điểm/đáp án theo feedback_policy, có thể sau hạn. RLS và API cùng bảo vệ câu test; nộp xong không mặc định được xem kết quả ngay.

Logic chấm thuần ở `lib/grading/`; các UI/API dùng cùng hợp đồng. Server là nguồn điểm chính; profile ngôn ngữ trong snapshot quyết định chuẩn hóa, không dùng mặc định Nhật cho Trung.

## Thư viện và phạm vi thực tế

| Thành phần | Trạng thái |
|---|---|
| reveal.js | Đã dùng renderer; presenter riêng qua BroadcastChannel cùng trình duyệt |
| wanakana | Đã dùng cho input Nhật, không dùng cho Trung |
| ts-fsrs | Đã dùng ôn tập; state theo phiên bản scheduler |
| @dnd-kit | Đã dùng sắp xếp slide; không suy ra UI bài order đã triển khai |
| Zod / Supabase SSR / AWS SDK S3 | Validator/Auth/storage adapter hiện có theo package.json |
| kuromoji/kuroshiro/howler/qrcode/react-email | Không nằm trong dependency hiện tại; chỉ cân nhắc khi có phạm vi riêng |
| OCR/queue/TTS web/font Trung | Chưa chọn/tích hợp; thiết kế theo DD dịch vụ |

Phiên bản lấy package.json/lockfile, không chốt lại bằng tài liệu ước lượng.

## Xác thực và phân quyền

Ba vai:

- **Khách** xem được bảng chữ cái và nội dung công khai
- **Học viên** vào lớp bằng mã, làm bài, xem kết quả của mình
- **Giảng viên** soạn bài, tạo lớp, xem toàn bộ kết quả lớp
- **Quản trị viên nền tảng** duyệt/tạm dừng giáo viên, ghi hạn thuê, xem số liệu tổng hợp và nhật ký; không đọc bài nộp hay bài riêng

Thực hiện bằng Supabase Auth cộng Row Level Security. RLS bảo vệ truy cập trực tiếp database; API vẫn phải xác thực người dùng và kiểm tra quyền theo lớp, bài học, lượt làm. API dùng service role phải tự kiểm tra đầy đủ vì khóa này có quyền vượt RLS. Không đưa khóa đó vào trình duyệt.

Mọi người đăng ký như học viên. Tài khoản đã xác minh email tự kích hoạt giảng dạy tại `/teach/start` sau khi xác nhận trách nhiệm nội dung; server gọi RPC `activate_teacher`, ghi `teacher_accounts` và `audit_events`. Người dùng không tự sửa `profiles.role`; cột này là capability tương thích do trigger đồng bộ từ `teacher_accounts`. Tư cách học đến từ enrollment, nên một tài khoản vừa dạy lớp mình vừa học lớp khác ([DD dịch vụ](detail-design/teaching-service.md)). Khi bật cài đặt duyệt (mặc định), yêu cầu giảng dạy ở trạng thái chờ đến khi quản trị viên mở quyền ở `/admin/teachers`. Quyền quản trị nằm ở bảng `platform_admins`, chỉ cấp bằng SQL (hoặc `npm run admin:grant` trên máy local).

SEO: metadata gốc dùng `SITE_URL` làm `metadataBase`; `app/sitemap.ts` liệt kê trang công khai và bài công khai, `app/robots.ts` chặn khu vực đăng nhập, quản trị và trang trình chiếu; trang bài có canonical không kèm `?version=` và JSON-LD LearningResource. Giảng viên chỉ sửa bài mình sở hữu, quản lý lớp mình tạo; chia sẻ chỉ cấp quyền trên version cụ thể, không mở dữ liệu lớp. Khách chỉ đọc nội dung đã xuất bản và được đánh dấu công khai.

Đáp án của bài kiểm tra phải thuộc phiên bản riêng không xuất hiện ở bất kỳ API đọc công khai nào, kể cả bài luyện hoặc slide. Chi tiết ranh giới nội dung tại `03-data-design.md`.

## Vận hành định kỳ

| Việc | Tần suất | Chạy bằng |
|---|---|---|
| Gửi email nhắc học viên | 20h hằng ngày | Vercel Cron |
| Gửi tóm tắt lớp cho giảng viên | 6h hằng ngày | Vercel Cron |
| Rà soát bài quá hạn và nhãn học viên | Hằng ngày; tính lại khi mở báo cáo | Báo cáo tính khi mở; tóm tắt giảng viên dùng cùng phép tính |
| Sinh audio cho nội dung mới | Thủ công khi thêm bài | Script |

Vercel Cron chạy theo giờ UTC. Muốn 20h giờ Việt Nam thì đặt `0 13 * * *`. Lịch đã khai báo trong vercel.json, gọi /api/cron/[job] với `Authorization: Bearer CRON_SECRET`.

## Môi trường và vận hành

- Tách local, staging và production; staging dùng database, bucket, khóa và tài khoản thử riêng. Preview deployment không được ghi vào production.
- Cung cấp `.env.example` chỉ chứa tên biến và giá trị mẫu. Khóa Supabase service role, TTS, R2 và email chỉ dùng phía server/script. Cron và webhook phải xác thực nguồn gọi.
- Trước khi dùng thật, có bản sao database và media, thời hạn giữ bản sao, người phụ trách và một lần khôi phục thử trên môi trường riêng. Không mặc định gói miễn phí có backup đủ dùng.
- Ghi lỗi API, audio và cron kèm mã yêu cầu; không ghi token, đáp án kiểm tra hoặc toàn bộ nội dung bài nộp vào log. Theo dõi lỗi gửi email và giới hạn sử dụng dịch vụ.
- Migration được lưu trong mã nguồn, kiểm tra trên staging trước production. Mỗi thay đổi schema có hướng khôi phục hoặc bản backup phù hợp.
- Quyền xem dữ liệu học viên giới hạn theo lớp. Bản đầu chưa có giao diện xóa tài khoản; có quy trình yêu cầu người vận hành xuất/xóa dữ liệu và chính sách giữ dữ liệu trước khi nhận lớp thật.
- Trước khi deploy, xác minh gói hosting phù hợp cách sử dụng, lịch cron và quota. Không xem ping định kỳ là bảo đảm dịch vụ không tạm dừng; cần hướng dẫn khôi phục khi gặp sự cố.

## Những thứ cố tình không dùng

**Google Slides nhúng iframe.** Khác domain nên JavaScript không đọc được trạng thái slide. Không gắn được nút phát âm, furigana hay quiz vào slide. Dùng được ở giai đoạn tạm thời, không dùng lâu dài.

**Hotlink ảnh từ Google Drive.** Bị giới hạn lượt tải, định dạng URL thay đổi không báo trước, không có CDN.

**localStorage làm nơi lưu tiến độ chính.** Mất khi học viên đổi máy hoặc xóa cache. Chỉ dùng cho tiện ích nhỏ như nhớ tab đang mở.

**Sinh hai file audio cho hai tốc độ.** Dùng `playbackRate` kèm `preservesPitch` là đủ, tiết kiệm nửa dung lượng.

## Kiến trúc dịch vụ nhiều giáo viên — dự kiến

Tiếp tục Next.js + Supabase, tách quyền chủ sở hữu và quyền chia sẻ rõ ràng. Google Meet là dịch vụ video bên ngoài; Masu lưu link riêng cho lớp và cung cấp tab slide để giáo viên chia sẻ. Không cần OAuth/SDK video cho mốc đầu. Đồng bộ presenter bằng BroadcastChannel hiện tại không phải đồng bộ slide từ xa.

Nhập scan cần object storage riêng tư, worker/queue bất đồng bộ, OCR adapter và editor duyệt; chỉ chuyển dữ liệu đã duyệt sang draft bài học/bộ câu hỏi. Không đặt ảnh chứa đáp án vào bucket audio công khai hoặc chạy OCR dài trong request web. Chưa chọn nhà cung cấp/worker hosting. Xem [BD](basic-design/teaching-service.md) và [DD dự kiến](detail-design/teaching-service.md); toàn bộ phần mở rộng chưa có trong code.

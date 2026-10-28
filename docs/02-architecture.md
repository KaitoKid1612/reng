# Kiến trúc kỹ thuật

## Stack

| Lớp | Chọn | Lý do |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Một codebase cho web và mobile browser, render phía server cho trang nội dung |
| Giao diện | Tailwind CSS + shadcn/ui | shadcn copy code vào dự án nên sửa được tự do, không bị khóa vào thư viện |
| API nghiệp vụ | Next.js phía server | Kiểm tra quyền, giao/nộp/chấm bài ở các giai đoạn sau |
| Dữ liệu và xác thực | Supabase (Postgres + Auth + Realtime) | Database, đăng nhập, RLS; realtime chỉ bật khi triển khai quiz trực tiếp |
| Lưu audio | Cloudflare R2 | Không tính phí băng thông đi ra, đây là khoản duy nhất dễ đội giá |
| Lưu ảnh | Supabase Storage | Lượng nhỏ, để chung cho tiện |
| Hosting | Vercel | Deploy bằng git push, cron tích hợp sẵn |
| Email | Resend | API sạch, template viết bằng JSX qua React Email |
| TTS | Azure Speech (ja-JP) | Sinh MP3 trước; giảng viên cần nghe duyệt, xác minh gói/quota trước khi dùng |

Bản đầu dùng Next.js + Supabase theo bảng trên, xuyên suốt các giai đoạn. Astro với JSON tĩnh chỉ là phương án từng cân nhắc, không nằm trong kế hoạch triển khai hiện tại.

## Baseline triển khai local

Giai đoạn 1 đã có source Next.js/React/TypeScript, Tailwind và component UI trong repo. Button dùng cấu trúc cva/clsx/tailwind-merge; chưa cài toàn bộ component shadcn/Radix khi chưa cần. Font được self-host bằng @fontsource, không gọi Google Fonts lúc build. Phiên bản chính xác lấy từ package.json và package-lock.json; Node 24, npm.

Kana lấy từ JSON đã validate, không cần API hoặc Supabase runtime để mở trang/luyện. Giai đoạn 3 dùng Supabase Auth và các RPC transaction; supabase/config.toml chạy stack local bằng Supabase CLI để kiểm chứng trước cloud. Supabase hiện có migration nền và kiểm tra trên PostgreSQL nhúng, chưa áp dụng cloud. Azure/R2 có script chuẩn bị sẵn, chưa sinh MP3 thật khi chưa có credentials. Không coi các dịch vụ liệt kê trong stack là đã tích hợp hết.

Hosting chưa triển khai. [Vercel Hobby](https://vercel.com/docs/plans/hobby) giới hạn sử dụng cá nhân phi thương mại; hoạt động có thu phí cần chọn gói phù hợp, không mặc định chi phí hosting bằng 0.

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

- Sửa một chỗ, mọi nơi hiển thị đều đổi theo
- Thêm chế độ hiển thị mới (ví dụ xuất PDF) không phải nhập lại nội dung
- Sinh bài tập tự động từ chính từ vựng của bài
- Script audio quét được toàn bộ nội dung để biết câu nào còn thiếu file

## Quy ước thư mục

```text
app/
  page.tsx                    home
  kana/
    page.tsx                  kana chart
    practice/page.tsx         romaji practice
  sources/page.tsx            attribution and audio status
  lessons/[id]/               planned: lesson reader and slide/page.tsx
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

**Bài luyện** gửi đáp án xuống trình duyệt, chấm tại chỗ, phản hồi tức thì. Lộ đáp án cũng không sao vì mục đích là học.

**Bài kiểm tra** chỉ gửi câu hỏi. Học viên nộp, server chấm, lưu kết quả rồi mới trả về. Bật RLS chặn bảng đáp án, nếu không mở DevTools là thấy hết.

Logic chấm viết một lần trong `lib/grading/`, dùng chung cho cả hai phía. Không viết hai bản.

## Thư viện chính

| Thư viện | Dùng cho |
|---|---|
| `reveal.js` | Trình chiếu slide, có sẵn fragment và presenter view |
| `wanakana` | Gõ romaji tự ra kana trong ô nhập |
| `ts-fsrs` | Thuật toán lặp lại ngắt quãng cho flashcard |
| `kuromoji` | Tách từ tiếng Nhật, dùng cho furigana tự động và từ điển bật lên |
| `kuroshiro` | Sinh furigana từ câu kanji |
| `dnd-kit` | Kéo thả cho bài sắp xếp câu |
| `howler` | Phát audio sprite |
| `qrcode` | Sinh mã QR trên slide |
| `react-email` | Viết template email bằng JSX |

Lưu ý `kuromoji`: từ điển khoảng 15MB, không nên tải xuống trình duyệt. Chạy ở phía server qua một API route.

## Xác thực và phân quyền

Ba vai:

- **Khách** xem được bảng chữ cái và nội dung công khai
- **Học viên** vào lớp bằng mã, làm bài, xem kết quả của mình
- **Giảng viên** soạn bài, tạo lớp, xem toàn bộ kết quả lớp

Thực hiện bằng Supabase Auth cộng Row Level Security. RLS bảo vệ truy cập trực tiếp database; API vẫn phải xác thực người dùng và kiểm tra quyền theo lớp, bài học, lượt làm. API dùng service role phải tự kiểm tra đầy đủ vì khóa này có quyền vượt RLS. Không đưa khóa đó vào trình duyệt.

Tài khoản đăng ký luôn là học viên. Người vận hành cấp quyền giảng viên qua thao tác quản trị phía server; người dùng không tự sửa `profiles.role`. Chưa có giao diện quản trị trong bản đầu. Giảng viên chỉ sửa bài mình sở hữu, quản lý lớp mình tạo. Khách chỉ đọc nội dung đã xuất bản và được đánh dấu công khai.

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

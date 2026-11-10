# Kiến trúc kỹ thuật

Mô tả hệ thống đang chạy trên production thử từ 29/10/2026 (cập nhật theo mã nguồn ngày 04/11/2026). Phần còn là thiết kế (nhập scan/OCR, TTS trên web) ghi rõ "dự kiến" ở cuối. Cách đặt biến môi trường, lịch cron, migration và phát hành ở [vận hành](operations.md); [DD dịch vụ](detail-design/teaching-service.md) ghi chi tiết từng lát đã triển khai.

## Stack

| Lớp | Đang dùng | Ghi chú |
|---|---|---|
| Web | Next.js 16 (App Router), React 19, TypeScript strict | Server Component mặc định; `"use client"` chỉ ở phần cần tương tác hoặc API trình duyệt |
| Giao diện | Tailwind CSS 4 + token CSS trong `app/styles/tokens.css` (CSS chia theo khu vực ở `app/styles/`, nạp qua `app/globals.css`), component trong repo | Button dùng cva/clsx/tailwind-merge; không cài shadcn/Radix. Font tự phục vụ từ @fontsource |
| Nghiệp vụ phía server | Server Actions (`app/actions/`) cho form; Route Handlers (`app/api/`) cho API JSON khi làm bài, ôn tập, cron và webhook | Mọi lối vào đều kiểm tra lại người gọi |
| Dữ liệu và đăng nhập | Supabase: Postgres, Auth (email/mật khẩu, Google), RLS, hàm RPC | Project `reng` ở Singapore |
| Hosting | Vercel, hàm ở `sin1` cạnh database | Push `main` là deploy production; cron khai báo trong `vercel.json` |
| Slide | reveal.js 6 | Cửa sổ Presenter đồng bộ qua BroadcastChannel trong cùng trình duyệt |
| Ôn tập | ts-fsrs | Trạng thái ghi kèm phiên bản bộ lập lịch |
| Nhập tiếng Nhật | wanakana | Chỉ cho ô trả lời tiếng Nhật; pinyin có bộ chuyển số thanh riêng |
| Kiểm tra dữ liệu | Zod | Ở mọi biên: JSON bài học, body API, kết quả RPC |
| Audio | MP3 sinh sẵn bằng script (Azure; tạm Unreal Speech cho bộ đề nghe), đặt trong `public/audio` hoặc R2 | Không gọi TTS theo lượt học viên |
| Email | Adapter Resend, Mailpit ở local | Production chưa bật gửi thư |

Phiên bản chính xác lấy theo `package.json` và `package-lock.json` (Node 24, npm).

## Sơ đồ runtime

```text
 Trình duyệt (học viên, giáo viên, khách)
        |
        v
 Vercel (sin1)
   proxy.ts ............ làm mới phiên Supabase sắp hết hạn (Server Component không ghi được cookie)
   Server Components .... đọc dữ liệu, render trang
   Server Actions ....... form của giáo viên, tài khoản, lớp
   Route Handlers ....... /api/assignments, /api/submissions, /api/reviews, /api/lessons/...
   /api/cron/* .......... Vercel Cron gọi kèm Bearer CRON_SECRET
        |
        |  lib/server/*: xác định người gọi, kiểm tra quyền, gọi RPC
        v
 Supabase (Singapore)
   Auth ................. phiên đăng nhập trong cookie HttpOnly
   Postgres + RLS ....... bảng nội dung, lớp, bài nộp, ôn tập, email
   Hàm RPC .............. thao tác nghiệp vụ trong một transaction

 Máy người vận hành: scripts/ (sinh audio, seed local, nhập ngân hàng câu) -> Azure/Unreal TTS, R2, Supabase
```

## Lớp mã nguồn

```text
app/                       route, layout, CSS chung
  actions/                 Server Actions; mỗi action tự kiểm tra người gọi
  api/                     Route Handlers JSON, cron, webhook, unsubscribe
components/<tính năng>/    tương tác của từng tính năng (classroom, editor, teach, slides, review…)
components/ui/             thành phần dùng chung (Button, LinkPending…)
lib/                       logic thuần: chấm điểm, lập lịch ôn, ngày giờ, nhập CSV, schema nội dung
lib/server/                chỉ chạy ở server (`server-only`): phiên, quyền, truy vấn, RPC, email
scripts/                   lệnh CLI, không được UI import
content/                   kana, bài mẫu, ngân hàng ôn, bộ đề nghe, câu nháp JLPT và bảng audio; mỗi
                           loại có schema Zod trong lib, test đọc lại file của bài mẫu, ngân hàng ôn,
                           bộ đề nghe và câu nháp JLPT; content/jlpt còn có danh mục nguồn đề (chỉ link)
supabase/migrations/       schema, RLS và hàm RPC
tests/ e2e/ e2e-supabase/  test logic và migration (PGlite), browser không dịch vụ, browser trên Supabase local
```

Quy ước đặt tên và tách component ở [coding standards](coding-standards.md).

## Đọc và ghi dữ liệu

- **Người gọi là ai:** `getCurrentAccount` (`lib/server/account.ts`) đọc phiên Supabase từ cookie bằng khóa publishable, lấy vai trò từ bảng `profiles` (không lấy từ metadata người dùng tự sửa được) và được nhớ trong một request. Trang cần đăng nhập dùng `requireAccount`, `requireTeacher`, `requireStudent`; trang đọc phiên không bao giờ được prerender.
- **Đọc và ghi:** sau khi biết người gọi, mã server dùng client service role (`createServiceClient`, vượt RLS) nên phải tự lọc theo người gọi. Thao tác nghiệp vụ đi qua hàm RPC (`callRpc`): hàm nhận ID người gọi (`p_teacher_id`, `p_learner_id`…), kiểm tra lại quyền sở hữu hoặc tư cách thành viên trong cùng transaction và chỉ `service_role` được gọi. Lỗi nghiệp vụ trả dạng `reng:<mã>`, thành `ServiceError` rồi thành mã HTTP trong `lib/server/api.ts` (404, 409, 413…), không lộ chi tiết database.
- **RLS** vẫn bật cho mọi bảng để chặn truy cập trực tiếp bằng khóa anon/authenticated. API ghi chú giáo viên dùng chính phiên người dùng để RLS quyết định.
- **API ghi dữ liệu** kiểm tra header `Origin` trùng site (chống CSRF), giới hạn body 64 KB và trả `Cache-Control: private, no-store`.
- **Danh sách lớn:** truy vấn có thể vượt 1.000 dòng đọc theo trang (`selectEveryPage`), danh sách ID dài chia nhóm 100 (`selectEveryPageIn`) để không vượt giới hạn URL.

## Nội dung bài học và phiên bản

- `LESSON_SOURCE=local` đọc 5 bài mẫu trong `content/`; `supabase` đọc phiên bản đã xuất bản.
- Bài có một bản nháp. **Xuất bản** tạo một dòng `lesson_versions` không đổi; lớp **ghim** một phiên bản (`class_lessons`); **bài giao** chụp câu hỏi vào `assignment_items`. Sửa nháp không đổi bài lớp đang dùng hay điểm đã có; lớp chỉ chuyển khi giáo viên bấm Cập nhật lên phiên bản mới.
- Hai schema nội dung chạy song song: v1 (bài tiếng Nhật, trình soạn Nhật, bài mẫu Minna) và v2 (mẫu Việt–Trung 5 bước, `lib/teaching-content.ts`). `lib/lesson-repository.ts` nhận diện theo `schemaVersion`.
- Xuất bản không tự công khai bài; công khai là thao tác riêng ở trang Chia sẻ.

## Chấm điểm: chia đôi client và server

**Bài luyện** có thể công bố đáp án theo trải nghiệm luyện; reader/slide DTO thường lược đáp án và trả qua API đúng mục đích. Điểm lưu báo cáo luôn do server chấm lại từ câu trả lời gốc và snapshot.

**Bài kiểm tra** chỉ gửi câu hỏi đã lọc. Server chấm khi nộp nhưng chỉ công bố điểm/đáp án theo `feedback_policy`, có thể sau hạn. RLS và API cùng bảo vệ câu kiểm tra; nộp xong không mặc định được xem kết quả ngay.

Logic chấm thuần ở `lib/grading/`; UI và API dùng cùng hợp đồng. Server là nguồn điểm chính; profile ngôn ngữ trong snapshot quyết định chuẩn hóa, không dùng mặc định Nhật cho Trung. Khi giáo viên chấp nhận một câu trả lời tương đương sau khi chấm (RPC `accept_answer_variant`), snapshot bài giao nhận thêm đáp án đó, các bài đã nộp có câu trả lời này được chấm lại thành đúng (điểm và thẻ lỗi theo sau), và bài luyện sau dùng cùng câu cũng chấp nhận; ngoài thay đổi đó, lịch sử điểm không sửa được.

## Xác thực và phân quyền

Bốn vai:

- **Khách** xem bảng chữ cái, công cụ tự học và nội dung đã công khai.
- **Học viên** vào lớp bằng mã hoặc link mời, làm bài, xem kết quả của mình.
- **Giáo viên** soạn bài, tạo lớp, giao bài, xem kết quả lớp mình.
- **Quản trị viên nền tảng** duyệt/tạm dừng giáo viên, ghi hạn thuê, xem số liệu tổng hợp và nhật ký; không đọc bài nộp hay bài riêng.

Mọi người đăng ký như học viên. Tài khoản tự kích hoạt giảng dạy tại `/teach/start` sau khi xác nhận trách nhiệm nội dung; server gọi RPC `activate_teacher`, ghi `teacher_accounts` và `audit_events`. Người dùng không tự sửa `profiles.role`; cột này do trigger đồng bộ từ `teacher_accounts`. Tư cách học đến từ enrollment, nên một tài khoản vừa dạy lớp mình vừa học lớp khác, và giáo viên học trong lớp tự học của mình. Khi bật cài đặt duyệt (mặc định), yêu cầu giảng dạy chờ quản trị viên mở quyền ở `/admin/teachers`. Quyền quản trị nằm ở bảng `platform_admins`, chỉ cấp bằng SQL (hoặc `npm run admin:grant` trên máy local).

Giáo viên chỉ sửa bài mình sở hữu và quản lý lớp mình tạo; chia sẻ chỉ cấp quyền xem/sao chép một phiên bản cụ thể, không mở dữ liệu lớp. Ghi chú giáo viên và đáp án câu kiểm tra không xuất hiện ở API đọc công khai, slide học viên hay bản chia sẻ. Chi tiết ranh giới nội dung ở [thiết kế dữ liệu](03-data-design.md).

## Render và bộ nhớ đệm

- Trang đọc phiên đăng nhập luôn render theo request (`connection()` trong `getCurrentAccount`).
- `/for-teachers` và `sitemap.xml` làm mới mỗi giờ; đổi quyền đọc hoặc lưu trữ bài làm mới `/for-teachers` ngay.
- Danh mục bài, `/grammar` và flashcard từ vựng render theo request vì đọc bài từ database.
- Trình soạn bài chỉ render ở trình duyệt (`ssr: false`) để khôi phục thay đổi chưa lưu trên máy trước lần vẽ đầu tiên.
- Không dùng `loading.tsx` cho trang riêng tư: trang phải trả 404 thật cho người không có quyền ([lý do](testing/ux-review-2026-11-04.md)). Nút điều hướng chậm có dấu xoay (`components/ui/link-pending.tsx`).

## Ngày giờ

Lớp học chạy theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè). Ngày học, hạn nộp, lịch cron và bài luyện hằng ngày tính theo lịch Việt Nam bằng `lib/study-days.ts` và `lib/vietnam-time.ts`, không theo múi giờ của máy chủ (UTC trên Vercel) hay của thiết bị. Cách hiển thị ở [thiết kế UI](12-ui-design.md#ngày-giờ-và-số).

## Việc định kỳ

| Việc | Giờ Việt Nam | Chạy bằng |
|---|---|---|
| Giao bài luyện tập hằng ngày | 6:00 | Vercel Cron `/api/cron/daily-practice` |
| Tự nộp lượt bỏ dở đã quá hạn (bài không cho nộp muộn) hoặc hết giờ thi thử JLPT | 6:00, sau bài hằng ngày | Cùng cron `/api/cron/daily-practice` |
| Email nhắc học viên | 20:00 | Vercel Cron `/api/cron/student-reminders` (chưa bật email trên production) |
| Email tóm tắt lớp cho giáo viên | 6:00 | Vercel Cron `/api/cron/teacher-digest` (chưa bật email) |
| Email tổng kết tuần | 19:00 Chủ nhật | Vercel Cron `/api/cron/weekly-summary` (chưa bật email) |
| Báo cáo lớp và nhãn học viên | Khi mở trang | Tính lúc đọc, cùng phép tính với email tóm tắt |
| Sinh audio cho nội dung mới | Thủ công | `npm run audio:generate` |

Lịch UTC, cách gọi tay và kết quả trả về ở [vận hành](operations.md#lịch-cron).

## Nguyên tắc vận hành

- Tách local, staging và production; staging dùng database, bucket, khóa và tài khoản thử riêng. Preview deployment không ghi vào production. Test tự động không dùng tài khoản cloud thật.
- Khóa service role, TTS, R2 và email chỉ dùng phía server/script, không đặt trong biến `NEXT_PUBLIC_`. Cron và webhook xác thực nguồn gọi (Bearer secret, chữ ký webhook).
- Ghi lỗi API, audio và cron kèm mã lỗi; không ghi token, đáp án kiểm tra hoặc nội dung bài nộp vào log.
- Migration nằm trong mã nguồn, được test trên PostgreSQL nhúng và Supabase local trước production, và phải tương thích với bản web đang chạy ([quy trình](operations.md#migration)).
- Trước khi nhận lớp thật cần bản sao database và media, người phụ trách và một lần khôi phục thử; gói Free hiện tại không có bản sao tự khôi phục. Chưa có giao diện xóa tài khoản: yêu cầu xuất/xóa dữ liệu do người vận hành xử lý.
- Trước khi thu tiền: chuyển gói hosting phù hợp sử dụng thương mại và bật email riêng ([kế hoạch POC](poc-setup.md)).

## Những thứ cố tình không dùng

**Google Slides nhúng iframe.** Khác domain nên JavaScript không đọc được trạng thái slide. Không gắn được nút phát âm, furigana hay quiz vào slide.

**Hotlink ảnh từ Google Drive.** Bị giới hạn lượt tải, định dạng URL thay đổi không báo trước, không có CDN.

**localStorage làm nơi lưu tiến độ chính.** Mất khi học viên đổi máy hoặc xóa cache. Chỉ dùng cho tiện ích nhỏ (nhớ tab, giữ thay đổi chưa lưu của trình soạn và bài đang làm để khôi phục).

**Sinh hai file audio cho hai tốc độ.** Dùng `playbackRate` kèm `preservesPitch` là đủ, tiết kiệm nửa dung lượng.

**Tích hợp video.** Google Meet là dịch vụ bên ngoài; Reng lưu link Meet của lớp và cung cấp thẻ slide để giáo viên chia sẻ. Không cần OAuth hay SDK video. Đồng bộ Presenter bằng BroadcastChannel không phải đồng bộ slide từ xa.

## Phần còn dự kiến

Nhập scan cần object storage riêng tư, worker/queue bất đồng bộ, OCR adapter và editor duyệt; chỉ chuyển dữ liệu đã duyệt sang draft bài học/bộ câu hỏi. Không đặt ảnh chứa đáp án vào bucket audio công khai hoặc chạy OCR dài trong request web. TTS trên web cần hạn mức ký tự theo tháng và bước nghe duyệt. Chưa chọn nhà cung cấp hay nơi chạy worker. Xem [BD](basic-design/teaching-service.md) và [DD](detail-design/teaching-service.md); phần này chưa có trong mã nguồn.

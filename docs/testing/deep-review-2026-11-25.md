# Rà soát sâu UI, logic, luồng và cách phát triển — 25/11/2026

Người dùng yêu cầu rà kỹ toàn dự án từ giao diện đến logic, luồng dùng và cách đang phát triển, rồi sửa những chỗ chưa hợp lý. Ba hướng rà chạy song song:

- **Logic server:** quyền, chấm điểm, thời gian, đồng thời, toàn vẹn dữ liệu, xóa và xuất dữ liệu, đọc database quá 1000 dòng.
- **Logic phía trình duyệt:** 123 client component; trạng thái, đua, khôi phục bản nháp, audio, bàn phím, hiệu năng.
- **Luồng dùng thật:** đi trên Supabase local bằng tài khoản đăng ký mới, PC 1440 trước rồi điện thoại 390. Gồm giáo viên mới, học viên mới, lớp tự học, giáo viên tiếng Trung, quản trị.

Kiểm tra [giao diện cùng ngày](ui-check-2026-11-25.md) đã sửa 9 lỗi trước đó.

## Đã sửa

### Dữ liệu và quyền (server)

| Vấn đề | Sửa | Kiểm chứng |
|---|---|---|
| Bảng xếp hạng tuần cộng điểm bài kiểm tra "công bố sau hạn" ngay khi nộp, nên cả bảng thấy điểm giáo viên đang giữ | Chỉ cộng bài đã tới giờ công bố (`lib/server/weekly-board.ts`) | Typecheck; dùng `hasFeedbackTimeArrived` đã có test |
| Tệp "Tải dữ liệu của tôi" có thẻ ôn câu sai của bài kiểm tra chưa công bố, lộ câu nào sai | Thẻ câu sai chờ tới giờ công bố như lượt làm (`lib/server/data-export.ts`) | — |
| Đọc lịch sử bài hằng ngày (14 ngày × 67–70 câu), lịch sử đề thi thử, số thẻ ôn ở Tiến độ và phiên bản bài của giáo viên bị cắt ở 1000 dòng, nên câu gần đây bị coi là chưa dùng và lặp lại | Đọc theo trang (`selectEveryPage(In)`) ở `daily-practice.ts`, `jlpt-exams.ts`, `learner.ts`, `classes.ts` | `npm test` |
| Đổi mật khẩu không hỏi mật khẩu đang dùng, nên ai cầm máy đang đăng nhập cũng khóa được chủ tài khoản | Tài khoản có mật khẩu phải nhập mật khẩu đang dùng (`lib/server/password-check.ts`); tài khoản chỉ có Google đặt mật khẩu đầu không cần | Trình duyệt: sai mật khẩu báo "Mật khẩu đang dùng chưa đúng." |
| Xóa tài khoản để lại lịch sử nhập từ Sheet theo email nhưng chưa gắn tài khoản, trái lời hứa ở /privacy | Migration `20261125082709` | `tests/unlinked-history-deletion-migration.test.ts` |
| Mỗi bài hằng ngày sai lại cùng một câu thì thêm một thẻ ôn, nên một câu chờ ôn nhiều lần và mỗi bản cần 3 lần đúng | Migration `20261125084314`: câu sai lại trong cùng bài nguồn mở lại thẻ cũ (chuỗi về 0, đến hạn ngay). Bài kiểm tra công bố sau hạn và bài nguồn khác vẫn có thẻ riêng | `tests/repeated-mistakes-migration.test.ts` |
| Giáo viên đã bị tạm dừng vẫn mở và điều khiển được thi đấu cả lớp | API `/api/live` và `/host` đòi vai trò giáo viên | — |
| Lỗi đọc `assignment_exams` biến mọi đề thi thử thành bài kiểm tra thường: mất đồng hồ và luật nghe một lần, đề biến khỏi /exams | Bỏ phần dự phòng cho trước migration 09/11 | — |
| Báo lỗi "giới hạn 70 câu của database" khi nguyên nhân là ngân hàng vừa đổi | Báo câu của đề không còn khớp, tải lại trang | — |
| Mã mảnh câu sắp xếp ở Minna 39–50 đánh số theo đáp án (`q3926-1…`) | Mã ngẫu nhiên; thêm test cho mọi nội dung | `tests/order-piece-ids.test.ts` |

### Học viên

| Vấn đề | Sửa |
|---|---|
| Bấm Back của trình duyệt sau khi đã lưu: bài làm hiện như lúc mở trang (câu trả lời trống), lần sửa sau bị chặn vì xung đột, và bản lưu tạm mới hơn bị xóa | Mỗi tab nhớ phiên bản đã lưu; trang cũ hơn thì tải lại và hiện "Đang tải câu trả lời mới nhất…" (`use-draft-sync.ts`). Trình duyệt: sau Back vẫn đủ câu đã chọn |
| Enter khi còn "n" romaji chưa đổi: kêu "sai" rồi hiện "Đúng" | Đọc bản nháp mới nhất trong cùng phím bấm |
| Bàn phím tiếng Nhật trên iPhone: Enter chốt chữ cũng chốt câu trả lời | Bỏ qua Enter có `keyCode 229` |
| Đoạn nghe vẫn phát khi sang câu khác, hai đoạn chồng nhau (đề thi thử mất lượt nghe duy nhất) | Mỗi lúc chỉ một đoạn; phát đoạn mới thì đoạn kia dừng (`listening-player.tsx`) |
| Đồng hồ hạn nộp dùng giờ thiết bị, máy chạy nhanh tự nộp sớm | Tính theo giờ máy chủ như đồng hồ đề thi |
| Gõ "wa" cho trợ từ は ra わ, bị chấm sai không giải thích | Vẫn chấm sai (đúng chính tả, như đề JLPT) nhưng nhắc "Trợ từ viết khác cách đọc: は (gõ ha, đọc là wa)" (`describeParticleSlip`) |
| Câu tiếng Việt gõ "hoà" chấm sai khi đáp án "hòa" | So sánh không phụ thuộc vị trí dấu thanh kiểu cũ/mới |
| Ngân hàng câu và đề thi bị gợi ý "Đọc bài" ở Hôm nay học gì, trang đọc có mục Từ vựng, Mẫu câu trống | Chỉ gợi ý bài có nội dung đọc; trang bộ câu ghi rõ "không có phần đọc", link đổi thành "Xem bộ câu" |
| Bài luyện chưa đạt còn lượt bị rơi khỏi "Bài tập cần làm" | Giữ lại với "Chưa đạt, còn N lượt" và nút "Làm lại" (trừ bài hằng ngày) |
| Kết quả đề thi thử mở đầu bằng vòng % | Mở đầu bằng điểm ước tính /180 và mức đỗ từng phần |
| Luyện kanji chấm sai 静か［な］, 〜ふん／〜ぷん… | Nhận mọi cách đọc: phần ［ ］ tùy chọn, ／ là cách khác, ghi chú ［…～］ bỏ qua |
| Lộ trình: "Học tiếp" trông như link; "Tổng ôn N4 · 1" mang số 2 | Nhãn dạng huy hiệu; số lấy từ tiêu đề bài |
| Tra ngữ pháp không tìm được 見える / みえる trong {見|み}える | Tìm cả dạng viết và cách đọc |
| Giọng thiết bị bị cắt sau 10 giây; giọng `ja_JP` không nhận | Hẹn giờ chỉ chờ lúc bắt đầu đọc; nhận cả `ja_JP` |

### Giáo viên

| Vấn đề | Sửa |
|---|---|
| Back về trình soạn bài sau khi lưu: hiện bản lúc mở trang, lần lưu sau xung đột, "Ghi đè" xóa hết phần đã lưu | Trang cũ hơn thì tải lại ("Đang tải bản nháp mới nhất…"), cả trình soạn Nhật và Việt–Trung (`StaleEditorGuard`). Trình duyệt: giữ đúng phần đã lưu |
| Lưu thất bại ghi đè bản lưu tạm bằng bản lúc bấm; rời trang trong 0,8 giây mất phần vừa gõ | Bản lưu tạm luôn là bản mới nhất, ghi ngay khi rời trình soạn |
| Sáu form (Nội dung lớp, Lịch học, Chia sẻ bài, Quyền đọc, Tạo bài Việt–Trung, Cài đặt lớp) bị React đặt lại sau khi gửi, ô hiển thị khác dữ liệu gửi đi | Gửi qua transition, giữ nguyên các ô (`submitKeepingFields`) |
| Đóng khung thi đấu rồi mở lại làm mất phòng đang chơi | Mã phòng giữ ở slide (`slide-deck.tsx`) |
| Cửa sổ Presenter: ghi chú dưới màn hình | Ẩn đầu và chân trang; ghi chú bắt đầu ở y≈485 trong cửa sổ 780px |
| Presenter vẫn báo "Đang chiếu" khi tab slide đã đóng | Mất 3 lần trả lời thì báo chờ |
| Phím S và link "Mở presenter" hiện cả với học viên | Chỉ giáo viên |
| Giao bài với ngân hàng 184 câu: nút Xem lại ở y≈12.400px, không lọc được | Từ 60 câu chia nhóm theo bài Minna, phần đề JLPT hoặc dạng câu, gập sẵn, chọn cả nhóm. Thanh đếm câu dính trên đầu. Thứ tự câu giữ theo bài. "Chọn tất cả" ẩn khi quá 70 câu. Tiêu đề điền sẵn theo bài. Ô lỗi có viền đỏ |
| Hai bài trùng tên trong ô chọn bài | Thêm "(thứ tự N trong lớp)" |
| Form đề thi thử mở ở N5 khi bài nguồn đầu là đề chính thức N4 | Cấp và tên đề lấy theo đề chính thức |
| Đề từ bài nguồn đang mở với học viên là đề "mở sách" mà giáo viên không biết | Thư viện đề ghi chú và chỉ cách để đề kín |
| Link Meet thiếu https:// bị trình duyệt từ chối bằng tiếng Anh | Ô chữ thường; máy chủ tự thêm https:// |
| Trang quản trị giáo viên: mỗi dòng cao khoảng 360px | Bố cục 2 cột trên PC, dòng khoảng 143px |

### Hiệu năng và câu chữ

- Mọi trang tải zod và schema bài tập chỉ để đếm ngược kỳ thi JLPT ở đầu trang (khoảng 45 KB gzip). Lịch thi tách sang `lib/jlpt-sessions.ts`; bản build không còn chunk zod trên trang công khai.
- Sửa câu chữ:
  - "Bài 1–26 có sẵn" thành 1–50.
  - Ô Tiến độ "thẻ đang cần ôn" thành "thẻ chưa thuộc".
  - Đăng ký "Chỉ cần họ tên và email" ghi thêm mật khẩu.
  - "Cài đặt" thành "trang Tài khoản".
  - Thông báo giáo viên không tự xóa tài khoản có email liên hệ.
  - Sáu loại nhật ký quản trị có nhãn tiếng Việt.
- Lỗi "Gửi thử" thông báo không còn làm sập trang. Phiên hết hạn khi bắt đầu bài có lời nhắc riêng.

Kiểm chứng chung:
- `npm run check`: 515/515 test.
- `npm run build` thành công.
- `npm run test:e2e`: 41/41.
- E2E Supabase:
  - Lần chạy đầy đủ: 43/45. Hai test hỏng do chính bản sửa: nhãn "Xem bộ câu", và `key` theo phiên bản làm trình soạn dựng lại sau mỗi lần xuất bản (đã bỏ `key`).
  - Chạy lại các spec liên quan sau khi sửa: qua hết.
- Hai spec cập nhật chữ: `account-deletion` và `question-authoring`.

## Cần người dùng quyết định hoặc làm

**Đã xong ngày 25/11/2026:** người dùng đã áp cả 3 migration lên production. Kiểm tra sau khi áp:
- `migration list --linked` khớp local tới `20261125093714`.
- Câu xem trước về 0, không còn nhóm thẻ lỗi đang mở nào bị trùng.
- Trigger `srs_cards_merge_repeated_mistake` đã có trên production.
- `platform_settings` có 1 dòng, `teacher_approval_required = true`.

Phần dưới giữ lại làm hồ sơ.

- **Áp 3 migration lên production:** `npx supabase db push --linked`. Code chạy được cả trước lẫn sau. Hai migration đầu chỉ thay hàm và thêm chỉ mục.
- **Gộp thẻ ôn trùng đã có:** người dùng đồng ý ngày 25/11/2026. Migration `20261125093714_merge_existing_duplicate_mistakes` sửa dữ liệu thật, gộp theo từng nhóm (học viên, bài nguồn, câu):
  - Giữ một thẻ: thẻ đang mở được sửa gần nhất.
  - Thẻ trùng chưa có lượt ôn thì xóa.
  - Thẻ trùng đã có lượt ôn thì đánh dấu xong để rời hàng ôn. Lịch sử ôn là bất biến (`review_events_immutable`) nên không chuyển và không xóa.
  - Thẻ của bài kiểm tra chưa công bố kết quả giữ nguyên.
  - Kiểm chứng: `tests/merge-duplicate-mistakes-migration.test.ts`. Trên Postgres local, 9 thẻ thử nghiệm được gộp, câu xem trước về 0, lịch sử ôn giữ nguyên 19 lượt.
- **Xem trước trên production, chỉ đọc**, nên chạy trước `db push`. Câu dưới đếm thẻ sẽ xóa, thẻ sẽ đánh dấu xong và số học viên. Lưu câu vào một file rồi chạy `npx supabase db query --linked --file <file>`.

  ```sql
  -- Read-only preview of 20261125093714_merge_existing_duplicate_mistakes: what the merge changes.
  with eligible as (
    select c.user_id, c.source_id, c.item_id, a.lesson_id, c.resolved_at, c.updated_at, c.created_at
    from public.srs_cards c
    join public.assignments a on a.id::text = c.source_id
    where c.item_type = 'mistake'
      and (a.feedback_policy = 'after_submit' or a.due_at <= now())
  ),
  ranked as (
    select eligible.*,
      row_number() over (
        partition by user_id, lesson_id, item_id
        order by resolved_at is null desc, updated_at desc, created_at desc, source_id
      ) as position
    from eligible
  ),
  extra as (
    select r.*,
      exists (
        select 1 from public.review_events e
        where e.user_id = r.user_id and e.item_type = 'mistake' and e.source_id = r.source_id
          and e.item_id = r.item_id
      ) as has_reviews
    from ranked r
    where r.position > 1
  )
  select
    count(*) filter (where not has_reviews) as cards_deleted,
    count(*) filter (where has_reviews and resolved_at is null) as cards_marked_done,
    count(*) filter (where has_reviews and resolved_at is not null) as already_done_kept,
    count(distinct user_id) as learners
  from extra;
  ```

- **`platform_settings`:** người dùng tự kiểm tra bằng `npx supabase db query --linked "select * from public.platform_settings"`. Nếu không có dòng nào, giáo viên mới được duyệt tự động; nên thêm dòng và sửa hàm bằng `coalesce` ở đợt migration sau.

## Chưa làm (đề xuất)

- **Luồng mời vào lớp:**
  - Trang /join-class chưa ghi tên lớp và giáo viên.
  - Khách được đưa tới đăng nhập thay vì đăng ký.
  - Xác nhận email xong phải bấm "Vào lớp" lại.
- **Giao diện học viên:**
  - Trang đọc bài dài (16.000px) chưa có mục lục và nút "Làm bài tập" ở cuối.
  - Câu đầu ở chế độ từng câu nằm dưới thanh công cụ trên PC 900px.
  - Lớp tự học vẫn hiện lịch học, "cả lớp sai nhiều", bảng tuần và CSV.
- **Giáo viên và quản trị:**
  - Trang chi tiết học viên chưa có hoạt động ôn và đọc bài.
  - Duyệt giáo viên chưa gửi email báo, và thông báo thành công đi theo dòng xuống cuối danh sách.
  - Chưa có nút tạo cả bộ 9 bài Tổng ôn N4 cùng lúc.
- **Luồng Việt–Trung:**
  - Pinyin số (jie3jie5) chưa đổi dấu khi dán vào trình soạn.
  - Trang Tạo bài hiện 50 bài mẫu Minna trước trình soạn.
- **Nội dung:**
  - Bộ Tổng ôn N4 chưa có thẻ もんだい nên chưa dùng được cho bài hằng ngày theo cấu trúc đề.
  - Chưa có trang từ vựng N5.
- **Các lỗi nhỏ phía trình duyệt còn lại:** focus sau một số nút xác nhận, live quiz áp kết quả poll không theo thứ tự, bảng của trình soạn không làm mới sau "Tải bản trên máy chủ"…; danh sách đầy đủ trong báo cáo rà soát.

## Cách dự án đang phát triển — nhận xét

- **CI không chặn deploy.** GitHub Actions chạy `npm run check` song song với lúc Vercel deploy `main`, nên một commit làm hỏng test vẫn lên production. E2E chỉ chạy tay. Muốn chặn thật phải đổi cách deploy (deploy từ Actions sau khi check qua), cần token Vercel nên để người dùng quyết.
- **Nội dung chiếm phần lớn thay đổi.** Từ 13/11: khoảng 87.000 dòng JSON nội dung so với 11.000 dòng mã. Nhiều vòng sửa câu sau khi soát đề. Mọi bài mẫu Minna 1–50 và bộ ôn N4 vẫn là "mẫu chờ duyệt". Nội dung N4 (Minna 26–50) vượt trình độ người duyệt hiện tại (đang học N4), nên nên có người duyệt tiếng Nhật trước khi dùng rộng.
- **74 MB audio MP3 bài học nằm thẳng trong git.** Mỗi lần sinh lại audio là repo phình thêm. Khi audio còn tăng, nên chuyển sang R2 như tài liệu audio đã tính.
- **Không có bản sao lưu và log chỉ giữ khoảng 30 phút** (Vercel Hobby). Lỗi production khó truy lại; nên cân nhắc một kênh ghi lỗi nhẹ.
- **Phạm vi tính năng rộng so với pilot một học viên.** Còn 11 ngày tới kỳ thi N5 của Nguyên. Nên ưu tiên độ ổn định của bài hằng ngày, ôn tập và đề thi thử hơn tính năng mới.
- **Tài liệu kỹ lưỡng** (121 file) và test tốt: 515 unit/database, 41 + 45 E2E. Thư viện không có lỗ hổng đã biết (`npm audit --omit=dev`), chỉ chậm vài bản vá.

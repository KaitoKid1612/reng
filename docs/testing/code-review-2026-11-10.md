# Rà soát quy ước mã nguồn và tài liệu — 10/11/2026

Người dùng yêu cầu: mã nguồn đã lớn, kiểm tra định dạng và quy ước, refactor chỗ cần để làm chuẩn cho các lần sau; kiểm tra tài liệu, trang hướng dẫn và trang giới thiệu, bổ sung theo các tính năng mới. Commit ở máy, chưa push.

## Cách kiểm tra

| Phần | Cách làm |
|---|---|
| Định dạng và lint | `npm run check` trước khi sửa: Prettier sạch, ESLint không lỗi và không cảnh báo, TypeScript đạt, 311/311 unit test |
| Quy ước không có công cụ kiểm | Quét tên file kebab-case, default export ngoài file của Next.js, dòng trống sau `"use client"`, `eslint-disable`/`@ts-ignore`/`any`, import tương đối trong `app`/`components`/`lib`, callback một chữ cái, `server-only` trong `lib/server`. Một script dùng TypeScript compiler API liệt kê component có props không phải interface `<Tên>Props`. Đo số dòng từng file |
| Cấu trúc | So mục Structure của [quy ước code](../coding-standards.md) với cây thư mục thật; đọc các file trên 500 dòng |
| Tài liệu | Hai lượt đọc độc lập: `docs/` và README đối chiếu với code và `git log` từ 04/11; trang Hướng dẫn, Cho giáo viên, trang chủ, Nguồn dữ liệu, Bắt đầu giảng dạy, Tự học đối chiếu với nhãn và hành vi trong code. Mỗi phát hiện được kiểm lại trong code trước khi sửa (một phát hiện sai đã bị loại: bài mẫu 1–15 có 42 câu kanji vào được phần chữ Hán – từ vựng của đề thi thử) |

## Phát hiện về mã nguồn

| # | Mức | Phát hiện | Trạng thái |
|---|---|---|---|
| 1 | Trung bình | Ba script Python của đợt JLPT 09/11 (`scripts/*.py`) nằm ngoài `npm run check`, không có npm script, và lặp lại phần kiểm tra mà test TypeScript không làm | **Đã sửa**: `lib/jlpt-question-draft.ts` (schema Zod, gắn mỗi câu với một phần của đề qua `jlptSectionOf`), `npm run jlpt:drafts`, `npm run audit:jlpt-audio`; test báo lỗi khi file nháp đổi mà chưa sinh lại. File sinh ra giống hệt bản cũ từng byte; script kiểm tra audio thử với server giả ở máy (OK, file quá nhỏ, 404, mất kết nối) |
| 2 | Thấp | `.github/workflows/daily-listening-banks.yml` chỉ chạy trên nhánh `feat/daily-listening-settings-20261107`, test của nó đã nằm trong `npm run check` | **Đã xóa** |
| 3 | Trung bình | `components/teach/assignment-fix-table.tsx` 599 dòng: bảng, dòng, bản Trước và form sửa 270 dòng | **Đã tách** form sang `question-fix-form.tsx`; markup giữ nguyên (so diff từng đoạn) |
| 4 | Trung bình | `app/teach/classes/[id]/page.tsx` 602 dòng, tự định nghĩa 4 component và vẽ bảng học viên, bài đã giao, nội dung lớp, ô thống kê | **Đã tách** sang `components/teach/class-*.tsx`; page còn 361 dòng; `lib/server/reports.ts` xuất kiểu `ClassReport`, `ClassReportAssignment`, `ClassReportLesson` |
| 5 | Thấp | Props khai báo inline ở 6 component; 10 module `lib` import nhau bằng `./`; callback tên `q`; `containsKanji` định nghĩa hai lần và regex chữ Hán lặp năm lần; 5 script bắt lỗi không ghi `error: unknown`; `merge-daily-listening.ts` không có npm script; test JLPT dùng `import test from "node:test"` khác 77 file còn lại | **Đã sửa**; thêm `npm run listening:merge` |
| 6 | Thấp | Quy ước code chỉ liệt kê 2 trong 18 thư mục `components`, không nói về script, dữ liệu `content`, CSS, test, cách đặt tên commit | **Đã viết lại** [quy ước code](../coding-standards.md) |
| 7 | Ghi nhận | Các commit 07–10/11 dùng tiền tố `feat:`, `fix(...)`, khác phần còn lại của lịch sử | Quy ước code ghi cách viết: một câu tiếng Anh thể mệnh lệnh, không tiền tố. Không sửa lịch sử đã push |

## Chưa làm trong đợt này

- **Tách `app/globals.css` theo tính năng**: lúc đầu hoãn vì nhánh giao diện sáng/tối đang sửa file này; người dùng yêu cầu gộp nhánh đó nên đã tách cùng ngày (mục Tách app/globals.css bên dưới).
- **Gom khoảng 60 file phẳng trong `lib/` thành thư mục con.** Phải đổi hàng trăm import và đường dẫn trong tài liệu, trong khi tiền tố tên file (`lesson-`, `class-`, `daily-`…) đã nhóm theo miền. Quy ước code ghi cách đặt tên này.
- **`components/teach` và `components/teaching`** giữ tên; quy ước code ghi rõ thư mục nào chứa gì.
- **`components/account-summary.ts`** chưa đặt tên `use-*.ts`: đổi thành `use-account-summary.ts` sau khi gộp nhánh giao diện sáng/tối.
- **Năm nhánh cũ trên remote** (`feat/daily-listening-*`, `feat/daily-practice-quality-70-*`, `fix/learner-slide-progress`, `feat/n4-listening-mock-20-*`) đã vào `main`; xóa khi người dùng đồng ý. AGENTS.md quy định làm thẳng trên `main`.

## Phát hiện về tài liệu và trang hướng dẫn

| # | Mức | Phát hiện | Trạng thái |
|---|---|---|---|
| 1 | Cao | Trang Hướng dẫn: câu nghe "cần quản trị viên tạo audio" (bài 1–15 có sẵn 6 câu nghe có audio trong trình soạn); "xong việc nào thì việc đó tự rời danh sách" (bài mới mở chỉ rời khi bấm Đánh dấu đã đọc xong) | **Đã sửa** |
| 2 | Cao | Trang Cho giáo viên hứa "email nhắc bài", trong khi production chưa đặt `EMAIL_PROVIDER` nên không gửi thư | **Đã thay** bằng việc chạy được hôm nay: tên học viên chưa nộp, điểm danh, tin nhắn giao bài; thêm thi thử JLPT |
| 3 | Cao | README "Kanji và furigana chưa làm"; màn hình S16 `/mock-exams` không tồn tại; "Đề thi thử — giai đoạn 6 mới làm"; dữ liệu "chưa áp dụng cloud", "chưa có chia sẻ bài"; "câu nghe không vào bài hằng ngày"; "3–60 câu"; dịch vụ Việt–Trung "chưa triển khai" | **Đã sửa** ở README, `03`, `04`, `07`, `11`, `staging-setup`, `content-authoring`, BD/DD dịch vụ |
| 4 | Trung bình | Năm tính năng 05–09/11 (tự nộp khi hết hạn, tin nhắn giao bài, thi thử JLPT, điểm danh, số câu nghe mỗi ngày) chỉ có DD, chưa có BD | **Đã thêm** BD ở [giai đoạn 3](../basic-design/phase-3.md) và [dịch vụ](../basic-design/teaching-service.md); ghi quyết định đưa câu nghe vào đề thi thử bằng file audio công khai |
| 5 | Trung bình | Mục lục tài liệu thiếu 8 tính năng mới; sổ tay vận hành thiếu 5 npm script và CI; vị trí slide đã lưu, API `PATCH /api/lessons/[id]/progress` chưa có trong tài liệu | **Đã thêm** |
| 6 | Trung bình | Không tài liệu nào nhắc tới `content/jlpt/` (danh mục nguồn đề chỉ lưu link, câu nháp tự biên soạn) và bộ 20 câu nghe thi thử N4 | **Đã thêm** mục [Nguồn đề JLPT và câu tự biên soạn](../content-authoring.md#nguồn-đề-jlpt-và-câu-tự-biên-soạn) và dòng giấy phép trong [rủi ro và giấy phép](../10-risks-costs-and-licenses.md) |
| 7 | Thấp | Trang Hướng dẫn thiếu chia sẻ/công khai/lưu trữ bài, cài đặt lớp, Đóng bài, bài hằng ngày nộp muộn và ngày đã lỡ, gợi ý gõ は/へ/を và số thanh pinyin, 404 do sai tài khoản, công tắc duyệt giáo viên; trang Nguồn dữ liệu chưa ghi Unreal Speech cho câu nghe N4 và font tiếng Trung; vài nhãn lệch giao diện ("Lớp của tôi" của giáo viên là "Lớp đang học", "học sinh") | **Đã sửa** |
| 8 | Thấp | `source-alignment.md` có 13 link `#Lnn` trỏ sai dòng vì code đã đổi | **Đã bỏ** số dòng ở link tới mã nguồn; link tới migration giữ vì migration không đổi |

## Cần người dùng quyết định

1. **Bộ 20 câu nghe thi thử N4** (`content/listening/n4-viet-listening-mock-20.json`): đã ghi mã audio nhưng chưa có file MP3 nào trong `public/audio/lessons`; 18/20 lời nghe là hội thoại `男：…女：…` mà máy đọc bằng một giọng, kể cả nhãn người nói. Viết lại thành lời một người, hoặc chờ cách đọc nhiều giọng, trước khi sinh audio.
2. **Câu JLPT tự biên soạn** (6 câu N5, 6 câu N4): đã duyệt cùng ngày theo yêu cầu người dùng (mục dưới). File trong `content/jlpt/generated/` chưa có mã bài và tên nên `bank:sql`/`lesson:import` chưa nhận trực tiếp; muốn dùng thì chép vào ngân hàng ôn N5/N4.
3. **Email trên production**: khi bật, thêm lại email nhắc bài vào trang Cho giáo viên và trang Hướng dẫn.

## Duyệt 12 câu JLPT tự biên soạn

Người dùng nhờ duyệt sau khi đọc báo cáo. Tiêu chí: tiếng Nhật tự nhiên, đúng một đáp án, chữ Hán được hỏi nằm trong danh sách chữ của cấp, mỗi câu vào đúng phần của đề thi thử, giải thích tiếng Việt đủ để tự học. Câu không hỏi kanji có thêm furigana cho chữ trên cấp (毎朝, 起きます, 映画, 自転車, 降る, 遅れる, 会議, 閉まる…). `buildJlptDraftLesson` nay chạy cùng kiểm tra furigana với `bank:sql`.

| Câu | Kết luận |
|---|---|
| N5-001 学校, N5-005 水 | Giữ; giải thích thêm âm ngắt, trường âm và chữ của các lựa chọn sai |
| N5-002 あした | Sửa đề thành 「あした」は 漢字で どう 書きますか (đề cũ hỏi "chữ Hán cùng nghĩa"); tag `kanji` thay `vocabulary`; giải thích cả bốn lựa chọn |
| N5-003 に, N5-004 見ました | Giữ; thêm furigana và giải thích |
| N5-006 đọc hiểu | Giữ; thêm furigana 田中, 自転車, 何(なん)で, 歩いて |
| N4-001 約束, N4-005 準備 | **Thay** bằng 試験 (しけん) và 運転 (うんてん): chữ 約, 束, 準, 備 không thuộc danh sách chữ N4, nên câu hỏi cách đọc vượt cấp. Lựa chọn sai giữ kiểu đề (âm đục, âm ngắt, ん) |
| N4-002 のに | **Sửa**: 「雨が降っているのに、出かけます」 không tự nhiên vì sau のに không đi với ý định của người nói. Đề mới: 雨が 降っている（のに）、弟は かさを 持たないで 出かけました |
| N4-003 し | **Sửa**: với 品物も いい, đáp án のに cũng có thể hiểu (rẻ mà hàng tốt). Đề mới: この店は 安い（し）、店の人も 親切です |
| N4-004 間に合いませんでした | Giữ; thêm furigana 遅れる, 会議 |
| N4-006 đọc hiểu | **Sửa**: đề cũ không cho thời gian đi đường nên không chắc còn kịp, và 「今日は 午後5時半です」 sai (phải là 今). Đề mới thêm 歩いて 15分 |

Duyệt bởi Claude theo yêu cầu người dùng. Trước khi dùng cho một kỳ thi có điểm thật, nên nhờ giáo viên tiếng Nhật xem lại một lượt.

## Gộp giao diện sáng và tối

Người dùng yêu cầu gộp nhánh `feat/site-theme-light-dark-20261110` (7 commit của một công cụ khác, chưa vào `main`) rồi đẩy cùng đợt. Gộp kiểu squash thành một commit để lịch sử `main` vẫn thẳng.

| # | Mức | Phát hiện | Trạng thái |
|---|---|---|---|
| 1 | Cao | Ở giao diện tối, chữ trên slide gần như trắng trên nền trắng (axe: tương phản 1,12), cả trang trình chiếu lẫn cửa sổ Presenter: nền slide là của reveal.js, chữ lấy token tối | **Đã sửa**: slide, Presenter, khung xem trước và bản in giữ token sáng và đặt lại màu chữ |
| 2 | Trung bình | Nhánh không qua `npm run check`: thiếu ngoặc nhọn sau `if` (ESLint `curly`), lỗi kiểu ở `useSyncExternalStore`, ép kiểu giá trị ô chọn bằng `as` | **Đã sửa**; logic chuyển sang `lib/theme.ts` theo mẫu `lib/account-hint.ts`, thêm `tests/theme.test.ts` cho script đầu trang |
| 3 | Thấp | Trên điện thoại, nhãn "Giao diện" bị ẩn nên Menu chỉ hiện ô "Tối"/"Sáng" | **Đã sửa**: nhãn hiện trong Menu |
| 4 | Ghi nhận | Viền ô nhập đổi từ `#a8a49d` sang `--muted` (đậm hơn ở giao diện sáng, đạt 3:1 cho viền); ô đáp án trên điện thoại chữ 21px → 19px | Giữ |

Kiểm tra: axe color-contrast trên 28 trang (khách 15 gồm slide và Presenter, học viên 8, giáo viên 5) ở cả hai giao diện: 0 lỗi sau khi sửa; ảnh chụp trang lớp, Presenter, bài tập, trang đọc bài ở giao diện tối; Menu 360px không tràn ngang, đổi giao diện có hiệu lực ngay và còn sau khi tải lại.

## Tách app/globals.css

Sau khi gộp giao diện sáng/tối, `app/globals.css` (3.749 dòng) được tách thành 18 file trong `app/styles/` theo khu vực (tokens, base, shell, home, kana, practice, responsive, lessons, slides, components, assignment-fixes, questions, teach, learner, editor, chinese-lessons, admin, public-pages); `globals.css` chỉ còn các dòng `@import` theo đúng thứ tự cascade.

- Phần lớn file là các đoạn liền nhau của file cũ, nên thứ tự giữ nguyên. 12 đoạn nhỏ được thêm sau ở cuối file cũ (gợi ý tài khoản, link đang chuyển trang, bảng pinyin, lịch học hằng tuần, các bước bắt đầu, khung giảng dạy, hôm nay học gì, đếm ngược, sổ lỗi, điều hướng câu trong bài thi, audio của trình soạn, lớp dùng bài) được chuyển về file của tính năng. Trước khi chuyển, một script liệt kê mọi rule ở đoạn bị vượt qua có cùng class; các rule trùng đều có độ ưu tiên khác nhau nên thứ tự không đổi kết quả.
- CSS biên dịch bằng Tailwind trước và sau khi tách có đúng 835 rule như nhau (59 rule đổi chỗ, không mất, không thêm).
- Computed style của 59.628 phần tử trên 128 lượt xem (32 trang của khách, học viên, giáo viên; 1280px và 390px; sáng và tối) giống hệt nhau trước và sau khi tách; hai lượt ở trình soạn chỉ khác ID do React tự sinh.

## Kết quả

Lượt 1 (rà soát quy ước, tài liệu, trang Hướng dẫn):

| Kiểm tra | Kết quả |
|---|---|
| `npm run check` | Đạt: Prettier, ESLint, TypeScript; 313/313 unit test (thêm 2 test cho câu nháp JLPT) |
| `npm run build` | Đạt, 75 route |
| `npm run test:e2e` | 34/34 đạt, gồm trang Hướng dẫn ở 360px và trang Cho giáo viên |
| `npm run test:e2e:supabase` | 39/39 đạt trên Supabase local (đủ 30 migration). Cảnh báo dev "Encountered a script tag" (JSON-LD) đã ghi nhận ngày 06/11 |
| Trình duyệt, Supabase local | Trang lớp của giáo viên (sau khi tách): đủ 7 mục, bảng học viên, bài đã giao, nội dung lớp, 4 ô thống kê. Trang sửa lỗi hiển thị của một đề thi thử 65 câu (chưa có E2E nào phủ): mở Sửa thì ô Đề bài nhận focus, có 14 ô cách đọc và phần xem trước; Lưu sửa hiện thông báo và nhãn "Đã sửa"; lọc Đã sửa còn 1 dòng; 390px không tràn ngang; không lỗi trang hay console. Đề sửa thử đã được trả lại như cũ |

Lượt 2 (duyệt câu JLPT, gộp giao diện sáng/tối, tách CSS):

| Kiểm tra | Kết quả |
|---|---|
| `npm run check` | Đạt; 316/316 unit test (thêm test câu nháp đã duyệt, furigana, script giao diện) |
| `npm run build` | Đạt |
| `npm run test:e2e` | 34/34 đạt |
| `npm run test:e2e:supabase` | 39/39 đạt |
| Giao diện | axe 0 lỗi tương phản trên 28 trang ở cả hai giao diện; computed style giống hệt trước và sau khi tách CSS (59.628 phần tử, 128 lượt xem) |

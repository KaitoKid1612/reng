# Rà soát mã nguồn và lỗi hệ thống — 30/10/2026

## Phạm vi và cách làm

Rà soát tĩnh mã nguồn ở mốc `0ca9940` theo bốn vùng: xác thực và phân quyền (kể cả RLS, RPC trong migration); lớp học, bài giao, chấm điểm, sổ lỗi và ôn tập; soạn bài, phiên bản, chia sẻ; cron, email, luyện hằng ngày và múi giờ. Mỗi lỗi dưới đây đã được đọc lại đến nơi gây lỗi (caller, RPC, giao diện). Phần lịch sử học tập đang làm dở (`app/history`, migration `202610300001`) không thuộc đợt này.

Chưa tái hiện được bằng trình duyệt có đăng nhập: Supabase local không khởi động được (xem [mục môi trường](#môi-trường-và-giới-hạn-kiểm-chứng)). Các lỗi được xác nhận bằng đọc mã, test đơn vị và E2E công khai; trạng thái "Đã sửa" nghĩa là mã đã đổi và qua các kiểm tra ghi ở cuối, chưa phải nghiệm thu với lớp thật.

Quy ước mức: **Cao** = mất dữ liệu người dùng hoặc lỗ hổng bảo mật; **Vừa** = sai dữ liệu hiển thị/ghi, sai báo cáo; **Thấp** = trường hợp hiếm hoặc chỉ ảnh hưởng trình bày.

## Đã sửa

| Mã | Mức | Vấn đề trước sửa | Sửa | Commit |
| --- | --- | --- | --- | --- |
| CR-01 | Cao | Lượt lưu nháp tới server nhưng mất phản hồi (đổi mạng, máy ngủ) làm lần lưu sau bị coi là "tab khác", trang khóa; tải lại trang xóa các câu làm sau đó | Client nhớ các bản đã gửi chưa có phản hồi; conflict mà draft server trùng bản đã gửi thì nhận revision và lưu tiếp; khôi phục cả khi mở lại trang | `fd035aa` |
| CR-02 | Cao | Trình soạn bài: Lưu/Xuất bản gặp lỗi mạng hoặc deploy mới thì lỗi không được bắt, cả trang thành "Application error", mất phần chưa lưu | Giữ thay đổi chưa lưu trong localStorage, khôi phục khi mở lại; bắt lỗi request ở trình soạn v1/v2, nhập CSV, giao bài; thêm `app/error.tsx` | `ca9da07` |
| CR-03 | Cao | `next=/%09/evil.example` lọt kiểm tra: trình duyệt bỏ tab nên chuyển hướng ra trang ngoài sau đăng nhập | `safeNextPath` chặn ký tự điều khiển, `\` và mọi giá trị phân giải ra origin khác; thêm `tests/auth-paths.test.ts` | `efede90` |
| CR-04 | Vừa | Bài luyện hằng ngày cho nộp muộn nên không bao giờ "quá hạn"; trang chủ chỉ hiện 3 bài, cũ nhất trước, nên học viên bỏ vài ngày không thấy bài hôm nay. Lượt đang làm của bài đã đóng/quá hạn vẫn hiện là "đang làm" | Xếp bài còn hạn trước, bài lỡ sau (mới nhất trước); lượt đang làm của bài đóng/quá hạn tính là đóng/quá hạn | `80df758` |
| CR-05 | Vừa | Chọn lại bài đã có trong lớp để đổi phiên bản thì form tự điền thứ tự = cuối, giờ mở = bây giờ, phiên bản = mới nhất: bài nhảy xuống cuối, bài hẹn mở sớm, luyện hằng ngày đổi sang bài đó | Điền sẵn giá trị hiện tại của lớp, kèm ghi chú; mặc định chọn bài chưa có trong lớp | `dfb5e57` |
| CR-06 | Vừa | Form cài đặt thông báo hiện lại giá trị cũ sau khi báo "Đã lưu"; lưu lần nữa ghi đè giá trị cũ. Trang vẫn cho bật nhắc email khi production chưa gửi email | Làm mới trang sau khi lưu; báo rõ khi hệ thống chưa bật email | `b57a942` |
| CR-07 | Vừa | Bài sao chép từ chia sẻ của giáo viên khác vẫn đặt Công khai được (đăng lại nội dung và đáp án) | Server chặn với `reshare_not_allowed` | `70fc48a` |
| CR-08 | Thấp | `/join-class?code=A&code=B` lỗi 500 | Chỉ nhận một giá trị `code` | `9f83e71` |

Cải tiến trải nghiệm cùng đợt: link mời vào lớp có nút sao chép, đặt ở đầu trang lớp khi lớp chưa có học viên (`3e8ee50`); trang chủ và hướng dẫn không còn bắt buộc bước xác nhận email vì production đang tắt bước này (`01d357c`).

## Còn mở

| Mã | Mức | Vấn đề | Lý do chưa sửa / điều kiện đóng |
| --- | --- | --- | --- |
| CR-20 | Vừa | Giáo viên nhập mã lớp của chính mình thì thành học viên của lớp: chiếm chỗ, hiện trong báo cáo/CSV, kéo lệch điểm trung bình và thống kê câu sai | Cần chủ sản phẩm chọn: chặn hẳn, hay cho tự luyện nhưng loại khỏi báo cáo (thống kê câu sai tính bằng RPC nên cần migration) |
| CR-21 | Vừa | Bài tiếng Trung (v2) cấp lại ID nhỏ nhất còn trống sau khi xóa: thẻ ôn của từ cũ gắn sang từ mới, slide sinh tự động trỏ nhầm | Đổi sang ID ngẫu nhiên như v1; cần sửa test và `scripts/seed-demo.ts` đang dựa vào `vocab-1` |
| CR-22 | Vừa | Hàng ôn lấy 200 thẻ đến hạn rồi mới bỏ thẻ không mở được (lớp/bài đã lưu trữ): khi có từ 200 thẻ như vậy, trang ôn báo hết thẻ sai | Lọc trong truy vấn hoặc phân trang; chưa xảy ra với dữ liệu hiện tại |
| CR-23 | Vừa | Flashcard từ trang lớp không mang phiên bản lớp ghim (đã ghi trong [quản lý Nhật–Trung](teaching-management.md)) | Thiết kế thống nhất đọc thẻ và lịch ôn theo phiên bản |
| CR-24 | Thấp | Rời trình soạn bằng link trong trang không cảnh báo; nay thay đổi vẫn được giữ trên máy và khôi phục khi mở lại | Thêm cảnh báo khi điều hướng nội bộ nếu cần |
| CR-25 | Thấp | "Áp dụng thay đổi slide" (v2) ghi đè chỉnh sửa slide làm sau khi dựng kế hoạch | Tính lại kế hoạch khi nháp đổi |
| CR-26 | Thấp | Dán hơn 100 từ tiếng Trung vượt giới hạn nháp, sau đó không lưu được | Chặn ở bước xem trước bảng |
| CR-28 | Thấp | Câu điền tiếng Trung trong bài tiếng Nhật chấm theo luật Nhật | Gán `gradingProfile` theo kiểu nhập |
| CR-29 | Thấp | `/reset-password` đổi được mật khẩu với bất kỳ phiên nào, không cần link khôi phục | Kiểm tra phiên đến từ link recovery |
| CR-30 | Thấp | Yêu cầu giảng dạy đang chờ duyệt không có nút từ chối; tắt duyệt thì yêu cầu cũ kẹt | Thêm thao tác từ chối/kích hoạt |
| CR-31 | Thấp | Ôn tập: thử lại sau khi mất phản hồi có thể báo đúng cho câu trả lời không được ghi | Khóa câu trả lời khi thử lại cùng request |
| CR-32 | Thấp | Chuỗi ngày học chỉ đọc 400 sự kiện gần nhất nên tính thiếu khi ôn nhiều | Tính bằng truy vấn ngày riêng |
| CR-34 | Thấp | Email (khi bật): cron Hobby chạy lệch tới 59 phút nên nhắc hạn 24 giờ có thể bỏ sót; tối đa 50 email mỗi lần; retry có thể bị Resend trả 409 do nội dung đổi; header List-Unsubscribe chỉ nhận POST; tiêu đề "sắp đến hạn" có thể dùng cho bài đã quá hạn | Xử lý trước khi bật email cho lớp thật |

## Cải tiến đợt 2 (chiều 30/10/2026)

| Mã | Cải tiến | Kiểm chứng |
| --- | --- | --- |
| CR-33 | Luyện hằng ngày lấy bài mở gần nhất có câu chọn/điền (tối đa 20 bài) thay vì bỏ qua khi bài mới chỉ có slide; log lỗi kèm mã lớp và mã lỗi dịch vụ; câu chữ trên trang lớp và BD/DD cập nhật | Typecheck, lint; chưa chạy với Supabase local |
| CR-27 | Mã bài gợi ý `lesson-NN-xxxxxx` không còn trùng giữa các giáo viên | Typecheck, build |
| CR-35 | Production chưa gửi header bảo mật: thêm chống nhúng iframe, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS | Build; E2E công khai; kiểm tra header sau deploy |
| CR-36 | `/lessons`, `/grammar` trên production trống: hướng học viên sang Lớp của tôi/Vào lớp thay vì trang trống hoặc "chưa tìm thấy mẫu" | E2E công khai |
| CR-37 | Ô gõ cách đọc ở luyện kanji tự focus khi sang câu mới | E2E kanji |

Lighthouse (mobile) trang chủ production trước đợt này: Accessibility, Best Practices, SEO đều 100.

## Bài mẫu Minna 12 (cùng ngày)

Thêm `content/starters/minna-1-12.json` và nút "Tạo bài 12 từ mẫu" ([biên soạn](../content-authoring.md)). Kiểm chứng: `tests/japanese-lessons.test.ts` chạy cùng bộ kiểm tra cho mọi bài mẫu (đủ loại slide, không có lỗi xuất bản, đáp án không dồn một vị trí, câu điền chỉ hiragana, payload công khai không lộ ghi chú/đáp án); xem trên bản local: trang đọc khổ 390px không tràn ngang, furigana dựng đúng, không còn cú pháp `{漢字|かな}` thô; chạy qua 39 slide ở 1280×720, đã tách hội thoại 8 lượt thành hai slide và bỏ cột hẹp ở bảng luyện tập 3 cho vừa khung. Nội dung là bản tự viết, cần giáo viên duyệt trước khi dạy.

## Bài mẫu Minna 1–2 (lô đầu bài 1–10)

`content/starters/minna-1-01.json`, `minna-1-02.json` đăng ký trong `lib/starter-lessons.ts`; `tests/japanese-lessons.test.ts` chạy cùng bộ kiểm tra bài mẫu (xuất bản được, đủ loại slide, đáp án không dồn một vị trí, câu điền chỉ hiragana, payload công khai không lộ ghi chú/đáp án) và `tests/lesson-visuals.test.ts` kiểm tra file icon. Đi qua toàn bộ slide bài 1, 2, 11, 12 và bài mẫu cũ 01, 03 ở 1280×720: phát hiện hai hội thoại 5 lượt có câu dài bị tràn, đã đổi quy tắc bố cục gọn của hội thoại sang tính theo dòng sau khi xuống dòng; chạy lại không còn slide tràn. Nội dung là bản tự viết, cần giáo viên duyệt.

## Hình minh họa bài Nhật (cùng ngày)

Theo [hình minh họa](../illustrations.md): icon Fluent Emoji (MIT) cho từ vựng, ô chọn hình trong trình soạn, hội thoại bong bóng có avatar, hình mở đầu cho slide tiêu đề; bài mẫu 11 gắn 22 icon, bài 12 gắn 40 icon. Kiểm chứng: `tests/lesson-visuals.test.ts` (đủ file icon, không có script, bài mẫu chỉ trỏ tới file có thật, xếp bên người nói); chụp 9 slide bài 11–12 ở 1280×720 bằng Playwright, nội dung đều nằm trong khung (sát nhất còn 24px ở hội thoại 5 lượt); trang đọc khổ 390px không cuộn ngang, hội thoại đưa nút Nghe xuống dưới bong bóng; mặt sau flashcard có hình. Ảnh AI cho nhân vật và tranh mở đầu chưa tạo.

## Bài 12: slide hình và icon bổ sung (cùng ngày)

Theo [hình minh họa](../illustrations.md): bài mẫu 12 gắn thêm 4 icon (いい, かんたん, たいへん, はじめて; 44/51 từ có hình), hình mở đầu bốn mùa và hai slide hình ghép từ icon (より／どちら trước bảng luyện tập 2, いちばん trước bảng luyện tập 3), tổng 41 slide. Slide ảnh của mọi bài được căn giữa.

- `tests/lesson-visuals.test.ts` PASS: bài mẫu chỉ trỏ tới hình có thật (gồm hình mở đầu và slide ảnh); hình ghép không có script, không tham chiếu ra ngoài file, có LICENSE.
- Xem trên bản local (bản sao riêng của repo): đi qua 41 slide ở 1280×720, không slide nào tràn khung, không ảnh hỏng, không lỗi console. Lần đầu slide ảnh lệch trái và chú thích dài xuống hai dòng; đã căn giữa, rút chú thích còn một dòng có số ①②③ khớp số trên hình.
- `npm run check` 133/133, `npm run test:e2e` 35/35, `npm run build` PASS. Production (commit `050fa69`): Vercel thành công, ba hình ghép và icon mới trả 200 `image/svg+xml`.
- Bài giáo viên đã tạo từ mẫu trước đây không tự cập nhật; cần tạo lại từ mẫu hoặc chọn hình trong trình soạn.

## Luyện kanji K1 (cùng đợt)

Theo [thiết kế luyện kanji](../basic-design/kanji-practice.md): trang `/kanji/[lessonId]`, link ở trang đọc bài và trang lớp tiếng Nhật, nút tạo câu kanji trong trình soạn.

- `tests/kanji-practice.test.ts` PASS: chỉ lấy từ có chữ Hán (bài 11 có 37 từ), chấm cách đọc bỏ khoảng trắng/〜/。 và nhận katakana, phiên luyện mỗi từ một lần với lựa chọn đúng, reducer và danh sách câu sai, câu sinh cho ngân hàng câu hợp lệ với schema nháp và không sinh lại.
- `e2e/kanji.spec.ts` PASS: học viên luyện đọc 4 từ của bài mẫu 01 ở khổ 360px (gõ sai một câu, xem câu sai, luyện lại), câu chọn mặt chữ lấy lựa chọn trong cùng bài và nhắc khi chưa chọn. Đã xem giao diện câu đọc và câu chọn ở khổ 390px.
- Chưa kiểm chứng trên trình duyệt có đăng nhập: link "Luyện kanji" ở trang lớp và nút tạo câu kanji trong trình soạn (cần Supabase local).

## Production và vận hành

- Production chưa có SMTP riêng và chưa đặt `EMAIL_PROVIDER`, nên: quên mật khẩu không dùng được (thư không tới học viên; link của mẫu email mặc định trả `code` trong khi `/auth/confirm` chỉ nhận `token_hash`); đăng ký không xác nhận email nên có thể đăng ký bằng email của người khác; ba cron email trả 503 mỗi ngày. Cách xử lý ở [kế hoạch POC](../poc-setup.md#production-thử-29102026).
- Supabase Free không có bản sao lưu tự khôi phục như gói Pro: chạy `npx supabase db dump` trước khi áp migration hoặc nhập dữ liệu thật.
- 30/10/2026 17:45: theo yêu cầu của chủ dự án, thêm học viên Nguyên vào lớp "Tiếng Nhật Minna – Lớp 1" của Việt bằng hàm `join_class` (cùng kiểm tra như khi học viên nhập mã lớp; mã lớp không in ra). Kết quả `joined`; lớp có 1 học viên; Nguyên thấy "Luyện tập hằng ngày 30/10" (7 câu, hạn 23:59) và bài 29/10 (nộp muộn được). Nhắc học qua email mặc định tắt. Lớp vẫn tự giao 7 câu/ngày từ bài 11; 60 câu/ngày cần migration `202610300002` (chưa áp dụng, giới hạn hiện 3–20) và thêm câu hỏi vào lớp.
- 30/10/2026 17:57–18:00 (tiếp phần Codex làm dở khi hết hạn mức): sao lưu production bằng `npx supabase db dump --linked` (schema và dữ liệu, lưu riêng ngoài repo), áp migration `202610300002_daily_practice_sixty.sql` (giới hạn 3–60 câu/ngày, 1–60 câu/bài giao). Sau khi bản code `4983dc7` lên Vercel, chạy SQL do `npm run daily:import` sinh từ Sheet của giáo viên: bài "Ngân hàng ôn JLPT N5 — Minna Bài 1–10" (200 câu điền, 21 câu trả lời tiếng Việt) là bài thứ 2 của lớp Minna, bài giao "Bài hôm nay 30/10 — ôn N5 (60 câu)" (ngữ pháp 25, từ vựng 15, kanji 10, tổng hợp 10; hạn 22:30, nộp muộn được, 3 lượt) và lớp tự giao 60 câu/ngày. Đọc lại: 60 câu đều parse bằng schema đang chạy và mọi đáp án khai báo đều chấm đúng. Bài tự giao lúc 6:00 hôm đó (7 câu bài 11) giữ nguyên.
- Cùng tối: bài tự giao chia theo dạng (`4bfce0d`). Mô phỏng bộ ngày 31/10 bằng dữ liệu production và đúng hàm của job sáng: 60 câu = ngữ pháp 25, từ vựng 14, kanji 9, tổng hợp 12; không lặp câu nào của bộ 30/10.

## Môi trường và giới hạn kiểm chứng

- `npx supabase start` (CLI 2.122.0, Podman 5.7.0) dừng với `ContainerCreateError: failed to copy secret file into container ... broken pipe` sau khi máy khởi động lại sáng 30/10; `podman cp`/`docker cp` thông thường vẫn chạy và volume `supabase_db_reng` còn nguyên. Vì vậy `npm run test:e2e:supabase` (30 test có đăng nhập) chưa chạy lại từ 29/10.
- Kiểm chứng trên bản sao mã tại mốc các commit trên (không gồm phần lịch sử học tập đang làm dở): `npm run check` PASS (106 test, thêm test cho `safeNextPath`, so sánh draft và thứ tự bài cần làm); `npm run build` PASS; `npm run test:e2e` PASS 30/30.
- Sau khi push, production trả 200 cho `/join-class?code=A&code=B` và hiện câu hướng dẫn mới ở trang chủ, `/guide`.
- Cần chạy lại khi Supabase local hoạt động: luồng làm bài mất mạng giữa chừng, trình soạn khôi phục bản trên máy, form lưu bài vào lớp với bài đã có, link mời trên điện thoại.

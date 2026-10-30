# Báo cáo bug UI và cải tiến luồng sử dụng Reng — 30/10/2026

Bổ sung cùng ngày: [nâng cấp quản lý bài học và bài tập Nhật–Trung](teaching-management.md). Báo cáo này giữ mốc `ecface1`; kết quả của lát nâng cấp mới được ghi ở tài liệu riêng.

## Kết luận và phạm vi

Dự án có các luồng chính để chạy một lớp pilot: giáo viên soạn/xuất bản → đưa bài vào lớp → giao bài → học viên làm/nộp → xem kết quả/ôn lỗi → giáo viên theo dõi. Điểm bất tiện rõ nhất trong đợt rà soát là tìm lối vào đúng và hướng dẫn giáo viên mới khi chưa có bài xuất bản. Đã cập nhật các điểm này trong source.

Đây là đánh giá từ mã nguồn, tài liệu và kiểm thử local, chưa phải nghiên cứu với người dùng thật hoặc nghiệm thu toàn bộ production. Có thể tiếp tục thử với lớp pilot có giáo viên hướng dẫn; chưa có bằng chứng để kết luận mọi học viên mới tự hoàn thành toàn bộ quy trình trên mọi thiết bị.

## Luồng đã đối chiếu

| Người dùng | Luồng | Bằng chứng và nhận xét |
| --- | --- | --- |
| Khách tự học | Trang chủ → bảng kana → luyện đọc → kết quả → luyện lại câu sai | `e2e/kana.spec.ts`, `e2e/audio.spec.ts`: thao tác, phản hồi, lỗi âm thanh, bàn phím và 360px được kiểm tra bằng browser local. |
| Học viên mới | Vào lớp → nhập mã → đăng nhập/đăng ký → xác nhận email → trở lại mã → vào lớp | `app/actions/classes.ts`, `app/actions/auth.ts`, `app/auth/confirm/route.ts`: source có giữ next path và mã; hướng dẫn đã bổ sung xác nhận email. Chưa chạy lại luồng email/Supabase trong đợt này. |
| Học viên trong lớp | Lớp → đọc bài/flashcard/Meet → bài tập → lưu nháp → nộp → kết quả → sổ lỗi/ôn tập | `app/classes/[id]/page.tsx`, `app/assignments/[id]/page.tsx`, `e2e-supabase/classroom.spec.ts`: có implementation và bộ test riêng; suite đăng nhập chưa chạy lại. |
| Giáo viên mới | Đăng ký → mở quyền theo cấu hình → tạo bài/lớp → xuất bản → lưu vào lớp → giao bài | `app/teach/start/page.tsx`, `app/teach/lessons/new/page.tsx`, `app/teach/classes/[id]/assign/page.tsx`: các bước đã có. Đã sửa trạng thái trống và bỏ bài chưa có phiên bản khỏi lựa chọn giao lớp. |
| Giáo viên vừa học vừa dạy | Header → Giảng dạy hoặc Lớp của tôi | Browser kiểm tra menu bằng API summary giả lập riêng cho từng role. Không dùng mock này để khẳng định quyền đăng nhập hoặc nghiệp vụ lớp. |
| Quản trị viên | Duyệt giáo viên → quản lý trạng thái/hạn → xem nhật ký | Source tại `app/admin`, logic migration được kiểm tra trong bộ check; chưa kiểm thử browser có phiên admin ở đợt này. |

## Tổng hợp tình hình UI

Mốc source đã giao: `ecface1` — `Improve onboarding and classroom navigation`, đã push `origin/main`. Bản cập nhật tài liệu này tổng hợp kết quả đã chạy ở mốc đó, không phải một đợt kiểm thử production mới. Chưa xác nhận trạng thái deployment sau push.

- Đã xử lý 8 vấn đề UI/UX trong đợt 30/10: khả năng tìm chức năng, nội dung hướng dẫn, trạng thái trống và bố cục mobile. Đây không phải 8 lỗi chức năng nghiêm trọng.
- Hai thay đổi ở form đưa bài vào lớp đã review source/typecheck, cần kiểm thử browser có phiên giáo viên trước khi đóng nghiệm thu. Luồng xác nhận email cũng chưa được chạy lại.
- Có một lỗi điều hướng/metadata được ghi nhận từ 29/10 và một hiện tượng meta chập chờn cần tái hiện; không gộp chúng vào danh sách đã sửa.
- Chưa đủ bằng chứng để tuyên bố toàn bộ UI không còn bug hoặc đã thuận tiện cho mọi người dùng.

Quy ước ưu tiên: P1 = cản trở bước chính hoặc dẫn sai cách thực hiện; P2 = làm khó tìm chức năng/hiểu nội dung; P3 = hoàn thiện trình bày hoặc vấn đề không thường xuyên. Ưu tiên là đánh giá tác động trong luồng pilot, không phải kết quả đo với người dùng thật. “Đã sửa” chỉ xác nhận mã nguồn đã đổi; cột kiểm chứng ghi rõ mức nghiệm thu.

## Danh sách vấn đề và cải tiến đã thực hiện

| Mã | Loại / ưu tiên | Màn hình và vấn đề trước sửa | Cập nhật đã giao | Trạng thái / bằng chứng |
| --- | --- | --- | --- | --- |
| UI-01 | UX / P2 | Trang chủ thiếu lối vào lớp nổi bật; học viên có mã khó biết bắt đầu ở đâu | Thêm Vào lớp bằng mã, Mở lớp của tôi và Vào lớp trong header | Đã sửa; `e2e/navigation.spec.ts` kiểm tra đường vào lớp ở 1280px/360px. |
| UI-02 | UX / P2 | Đường tự học và học trong lớp chưa rõ | Ba lối vào theo nhu cầu; link tự học không cần tài khoản ngay đầu trang | Đã sửa; browser kiểm tra link tự học và đường tới bảng kana. |
| UI-03 | Nội dung UI / P2 | Trang giáo viên chỉ giới thiệu tiếng Trung, không phản ánh pilot tiếng Nhật | Đồng bộ trang chủ, trang giáo viên và metadata cho Nhật/Trung; nêu mẫu Minna tự biên soạn | Đã sửa; `e2e/seo.spec.ts`, `e2e/navigation.spec.ts`. |
| UI-04 | Điều hướng / P2 | Tài khoản giáo viên không có shortcut lớp đang học trong header | Hiện cả Giảng dạy và Lớp của tôi | Đã sửa; browser kiểm tra menu bằng API summary giả lập teacher/student, chưa thay cho test phiên đăng nhập thật. |
| UI-05 | Hướng dẫn / P1 | Hướng dẫn đăng ký bỏ bước xác nhận email, dễ khiến học viên tưởng đã xong | Nêu mở thư, xác nhận, Spam/gửi lại và quay lại mã; mô tả duyệt giáo viên theo cấu hình | Đã sửa nội dung, đối chiếu source auth; chưa chạy lại trọn luồng email. |
| UI-06 | Trạng thái trống / P1 | Trang giao bài bảo nhờ người vận hành chạy script khi chưa có bài | Dẫn thẳng đến tạo bài đầu tiên hoặc soạn/xuất bản trong sản phẩm | Đã sửa source tại `components/teach/class-lesson-form.tsx`; còn chờ browser có tài khoản giáo viên. |
| UI-07 | Lựa chọn form / P1 | Bài chỉ có nháp vẫn chọn được nhưng select phiên bản rỗng | Chỉ liệt kê bài có phiên bản xuất bản; khi tất cả còn nháp, giải thích bước xuất bản; fallback selection theo dữ liệu mới | Đã sửa source/typecheck; còn chờ test các trạng thái không bài / chỉ nháp / nháp và bài xuất bản. |
| UI-08 | Trình bày / P3 | Tiêu đề trang chủ dài trên 360px, link tự học ở xa phần đầu | Rút gọn tiêu đề, đưa link tự học gần CTA | Đã sửa; đã xem ảnh mobile cuối, không tràn ngang; chạy lại 4 test điều hướng đạt. |

## Vấn đề còn mở và giới hạn chưa được đóng

| Mã | Ưu tiên | Hiện tượng / nguồn ghi nhận | Trạng thái hiện tại | Điều kiện đóng |
| --- | --- | --- | --- | --- |
| UI-09 | P2 | Bấm link trước khi hydration hoàn tất có thể giữ canonical của trang trước trong `<head>`; ghi nhận cả production ngày 29/10 trong `MJ-09` của [checklist dịch vụ](teaching-service.md) | Đã ghi nhận trước đợt này, chưa sửa và chưa tái hiện lại ở `ecface1`. Test hiện tải lại trang để kiểm tra metadata, nên PASS đó không chứng minh lỗi chuyển trang đã hết | Tái hiện bằng lượt chuyển trang không reload, kiểm tra canonical/metadata tương ứng URL; xác định nguyên nhân và bổ sung regression khi sửa. |
| UI-10 | P3 | Test mô tả `/for-teachers` từng thấy hai meta khi stream metadata trong lượt chạy song song; chạy lại đạt, theo ghi chú ngày 29/10 | Theo dõi hiện tượng chập chờn, chưa xác nhận là lỗi UI ổn định. Các lượt E2E 30/10 đã đạt | Tái hiện có trace và xác định ảnh hưởng người dùng; nếu không tái hiện, giữ lịch sử với môi trường/thời điểm, không tự nhận đã sửa. |

Chưa có browser nghiệm thu mới cho UI giáo viên, học viên và quản trị viên sau đăng nhập trên Supabase local trong đợt 30/10. Đây là khoảng trống kiểm chứng, không tự coi là bug. Bố cục 360px đã qua các route được suite mặc định kiểm tra; chưa thay cho Safari/iOS, bàn phím ảo, font/giọng đọc trên thiết bị thật hoặc kiểm tra accessibility toàn diện.

## Các cải tiến tiếp theo đề xuất

Các mục dưới đây là đề xuất cần xác nhận bằng quan sát sử dụng, chưa triển khai trong `ecface1` và không tính là lỗi đã tìm thấy.

| Thứ tự | Công việc | Lý do / kết quả mong đợi | Tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| 1 | Kiểm thử lại form đưa bài vào lớp với giáo viên đăng nhập | Đóng kiểm chứng UI-06/UI-07 trước khi mở rộng pilot | Không bài có link tạo; chỉ nháp có link xuất bản; danh sách trộn chỉ chọn bài có phiên bản; lưu đúng phiên bản vào lớp. |
| 2 | Chạy một lượt giáo viên–học viên mới trên điện thoại | Xác nhận người mới hoàn thành được onboarding và học bài | Giữ mã lớp qua đăng ký/email; đọc bài, lưu nháp, nộp và xem kết quả; ghi chỗ cần trợ giúp. |
| 3 | Tái hiện UI-09 và UI-10 | Làm rõ lỗi điều hướng/metadata còn mở | Lưu trace, URL, thời điểm click, head trước/sau; không dùng reload để che bước chuyển trang khi tái hiện. |
| 4 | Đánh giá menu và phần đầu trang trên thiết bị thật | Menu có nhiều mục; cần đo khả năng tìm lối vào bằng người dùng thực tế | Học viên tìm được vào lớp/tự học và giáo viên tìm được giảng dạy; ghi thao tác, thời gian và nhầm lẫn trước khi quyết định rút gọn menu. |
| 5 | Cân nhắc checklist khởi đầu cho giáo viên | Hỗ trợ chuỗi tạo bài → xuất bản → mở lớp → lưu bài → giao bài nếu pilot còn cần hướng dẫn | Chỉ bổ sung khi quan sát cho thấy người mới bỏ bước; trạng thái phản ánh dữ liệu thật và có link tới bước tiếp theo. |

## Các sửa UI đã ghi nhận trước đợt này

Theo `MJ-05`/`MJ-09` trong [checklist dịch vụ](teaching-service.md), ngày 29/10 đã xử lý: danh sách slide editor tràn ngang với nội dung dài; tóm tắt slide/mẫu câu hiện furigana thô; ô hạn thuê/ghi chú quản trị mất viền; lời nhắc audio yêu cầu giáo viên chạy script; hoàn tất romaji `n` khi rời ô; chữ số toàn góc bị giãn và câu dành cho giáo viên hiện cho học viên. Các kết quả local lịch sử được giữ nguyên tại tài liệu gốc; không tính lại thành bug mới hoặc nghiệm thu lại trong báo cáo 30/10.

## Kiểm chứng local tại mốc `ecface1`

- `npm run check`: PASS — Prettier, ESLint, TypeScript và 96 test logic/database/pipeline. Test database chạy PostgreSQL nhúng; audio dùng adapter giả. Chạy qua permission sandbox để tiến trình con Node hoạt động, không gọi cloud.
- `npm run test:e2e`: PASS — 30 test Chromium, bao gồm điều hướng ở 1280px và 360px, giữ đường tự học, menu hai role, slide, âm thanh và trang thiếu cấu hình lớp. Sau khi xem ảnh mobile, rút ngắn tiêu đề và thêm link tự học ở đầu trang; chạy lại riêng 4 test điều hướng: PASS. Đã xem ảnh mobile cuối, không bị tràn ngang.
- `npm run build`: PASS — Next.js 16.4.3 biên dịch, TypeScript và tạo 41 trang tĩnh thành công; trang chủ vẫn tĩnh.
- Chưa chạy `npm run test:e2e:supabase`: không có container Supabase local đang chạy; không dùng cấu hình cloud từ `.env.local` cho test. Trạng thái trống/lọc bài ở `ClassLessonForm` đã được review source và typecheck, chưa được xác nhận browser với tài khoản giáo viên thật trong đợt này.
- Ảnh kiểm tra bố cục nằm trong `test-results/home-flow-1280.png` và `test-results/home-flow-360.png` (artifact local, không commit).

## Nghiệm thu tiếp với lớp pilot

1. Một giáo viên mới xác nhận email, được mở quyền, tạo bài từ mẫu, duyệt và xuất bản; tạo lớp, lưu bài vào lớp, giao một bài luyện tập.
2. Một học viên mới mở link trên điện thoại, xác nhận email, trở về đúng mã lớp và vào lớp mà không phải nhập lại mã.
3. Học viên đọc/nghe bài, làm bài, tải lại giữa chừng để kiểm tra nháp, nộp và xem kết quả; giáo viên thấy điểm trong báo cáo.
4. Kiểm tra giọng đọc và chia sẻ tab slide qua Meet trên thiết bị dùng để dạy thật. Audio fallback phụ thuộc giọng thiết bị, chưa thể thay bằng đánh giá phát âm tự động.
5. Ghi nhận chỗ người dùng cần giáo viên trợ giúp. Ưu tiên cải tiến theo quan sát này trước khi mở rộng tính năng. Nhập scan và TTS web vẫn là phần chưa triển khai, không phải điều kiện để thử lớp dùng bài tự soạn hiện có.

Thiết kế tương ứng: [BD](../basic-design/teaching-service.md), [DD](../detail-design/teaching-service.md). Các kết quả lớp học cũ được giữ trong [checklist dịch vụ](teaching-service.md), không gắn PASS mới cho suite chưa chạy.

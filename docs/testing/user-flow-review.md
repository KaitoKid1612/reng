# Rà soát luồng sử dụng Reng — 30/10/2026

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

## Các bất tiện đã sửa

| Trước | Sau |
| --- | --- |
| Trang chủ chỉ ưu tiên kana; người được mời vào lớp phải tìm qua các trang khác | Vào lớp bằng mã và Mở lớp của tôi ở đầu trang; Vào lớp luôn có trong header. |
| Khó phân biệt đường tự học và học theo lớp | Ba lựa chọn vào lớp / tự học / giảng dạy, mô tả rõ nhu cầu tài khoản. |
| Trang giáo viên chỉ giới thiệu tiếng Trung dù pilot ưu tiên tiếng Nhật | Giới thiệu cả Nhật/Trung, nêu bài mẫu Minna tự biên soạn; metadata đồng bộ. |
| Tài khoản teacher chỉ thấy Giảng dạy trong header | Có cả Giảng dạy và Lớp của tôi. |
| Hướng dẫn nói tạo tài khoản xong quay lại lớp ngay | Nêu bước mở thư xác nhận, kiểm tra Spam/gửi lại, rồi trở lại mã lớp. |
| Chưa có bài thì trang giao bài bảo người vận hành chạy script | Link tạo bài hoặc mở bài để xuất bản ngay trong sản phẩm. |
| Bài chỉ có nháp xuất hiện trong select nhưng không có phiên bản để lưu | Chỉ chọn bài có phiên bản; trạng thái chỉ có nháp chỉ rõ bước xuất bản. |

## Kiểm chứng local

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

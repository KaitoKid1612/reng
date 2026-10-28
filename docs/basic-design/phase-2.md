# Basic Design giai đoạn 2 — Bài giảng và trình chiếu

Baseline 28/10/2026. Giai đoạn 1 còn chờ credentials và nghiệm thu thiết bị; thiết kế này cho phép phát triển local trong lúc chờ, không đánh dấu giai đoạn 1 đã hoàn thành.

## Phạm vi và nguồn nội dung

Triển khai danh sách bài, trang đọc, tra cứu ngữ pháp, trình chiếu, presenter và bản in PDF. Chuẩn bị 5 bài mẫu tự biên soạn theo chủ đề nhập môn; không sao chép giáo trình. Bài mẫu có nhãn cần giảng viên duyệt, chưa phải bộ bài đã nghiệm thu để đứng lớp. Audio chưa sinh phải được hiển thị đúng trạng thái, không giả báo có MP3.

Nguồn mặc định là snapshot local đã xuất bản bằng script. Khi chọn LESSON_SOURCE=supabase, đọc snapshot đã xuất bản từ database; lỗi cấu hình/dịch vụ không âm thầm chuyển sang mẫu local. Import mặc định chỉ validate/dry-run; xuất bản là thao tác có cờ rõ ràng. Bản nháp và ghi chú riêng không nằm trong payload công khai.

## Màn hình

| ID | URL | Hành vi |
|---|---|---|
| S04 | /lessons | Bài theo thứ tự, tóm tắt, số từ/mẫu câu, dẫn tới đọc và chiếu |
| S05 | /lessons/[id] | Tiêu đề, từ vựng/audio, ngữ pháp, ví dụ, ghi chú công khai; nút trình chiếu |
| S06 | /lessons/[id]/slide | Khung 1280×720, fragment, mũi tên/Space, F, Esc, B, vị trí #1-based |
| S09 | /grammar | Tìm theo Nhật/Việt/pattern, link tới bài và đúng mục |
| P01 | /lessons/[id]/presenter | Slide hiện tại/kế tiếp, thời gian buổi dạy; đồng bộ cùng origin |
| T00 | /teach/sign-in | Giảng viên đăng nhập tài khoản được người vận hành cấp; không tự đăng ký role. Từ giai đoạn 3 chuyển 308 sang /sign-in dùng chung |

Trên điện thoại trang đọc dùng một cột; bảng từ không cuộn ngang. Trang slide giữ bố cục cố định và co theo viewport, có toolbar bấm được bằng bàn phím. Người dùng chọn mở presenter; popup bị chặn được báo và có link mở thủ công. Presenter riêng lấy ghi chú bằng API xác thực, không dùng DOM notes để truyền ghi chú qua cửa sổ máy chiếu.

## Luồng và ngoại lệ

1. Chọn bài → đọc nội dung → mở trình chiếu; cùng version ID được truyền xuyên suốt URL.
2. Trình chiếu hiện dần fragment; F5 giữ slide, hash sai về slide đầu có thông báo. Fragment không được làm đổi đáp án/lịch sử nộp vì đây chỉ là câu luyện công khai.
3. Quiz trên slide bấm hiện đáp án qua API câu luyện; không gửi đáp án trong payload đọc/slide ban đầu. API chỉ trả câu của phiên bản công khai hiện có, không có câu test trong nguồn này.
4. Mở presenter → đồng bộ vị trí và fragment qua BroadcastChannel có scope lesson/version. Chỉ vị trí được broadcast, không truyền token/ghi chú/đáp án. Presenter không có quyền thì vẫn xem slide công khai nhưng không có ghi chú riêng.
5. Xuất PDF dùng ?print-pdf và Chrome Print; bản in hiện fragment, không có toolbar, teacherNotes hoặc dữ liệu test. Cần xem trước bản in trước khi chia sẻ.

Không tìm thấy bài/version trả 404. Lỗi nguồn dữ liệu có màn hình thử lại. Quiz/audio lỗi có nút thử lại, không làm hỏng điều khiển slide. Bài công khai cũ vẫn đọc được theo version khi có snapshot đó; sửa bản nháp không đổi bài đã xuất bản.

## Điều kiện nghiệm thu

Truy vết trong [checklist](../testing/phase-2.md). Cần có một bài chạy trọn luồng đọc/slide/PDF, dữ liệu ban đầu không lộ notes/answers, presenter đồng bộ, keyboard/mobile dùng được. Supabase/Auth thật, audio thật, nội dung 5 bài được giảng viên duyệt và một buổi dạy thử vẫn là điều kiện nghiệm thu riêng.

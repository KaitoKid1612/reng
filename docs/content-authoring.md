# Biên soạn và xuất bản nội dung

## Nguồn và duyệt bài

Từ giai đoạn 4, giảng viên soạn và xuất bản bài trên web tại /teach/lessons/new và /teach/lessons/[id]/edit, nhập từ vựng hàng loạt tại /teach/import-csv (CSV UTF-8 hoặc dán bảng Excel). Script bên dưới vẫn dùng cho bài mẫu trong repo và kiểm tra hàng loạt.

Draft nằm ở content/lessons/*.json. Năm bài hiện tại là mẫu tự biên soạn, không nhập từ giáo trình hoặc từ điển bên ngoài. Giữ isSample=true cho đến khi giảng viên duyệt câu Nhật, nghĩa Việt, cách đọc, đáp án và audio. Không đánh dấu đã duyệt chỉ vì validator chạy qua.

ID bài/item dùng tiếng Anh hoặc mã ổn định, không tái dùng ID cũ cho ý nghĩa khác. Slide chỉ refs/ref tới từ vựng/ngữ pháp/câu luyện. TeacherNotes là ghi chú riêng; note.body là nội dung công khai. Không đặt đáp án kiểm tra cần bảo mật vào questions của bài công khai.

## Kiểm tra và xuất bản local

```bash
npm run lesson:import -- --file content/lessons/lesson-01.json
npm run lesson:import -- --file content/lessons/lesson-01.json --publish local --revision 1
```

Lệnh đầu chỉ validate. Lệnh thứ hai tạo version 2 nếu version hiện tại là 1; revision sai bị từ chối. Local catalog giữ toàn bộ version cũ; đổi draft không làm thay đổi trang đang đọc. URL có version ID giữ được snapshot cũ. Trước xuất bản, xem nội dung dài nhất ở chế độ đọc và slide.

## Audio cho bài học

```bash
npm run audio:plan -- --lessons
npm run audio:generate -- --lessons --local
```

Plan chỉ liệt kê công việc. Generate cần khóa Azure; output ở public/audio/lessons, mapping ở content/lesson-audio-manifest.json. Script cập nhật hash trong draft, kiểm tra draft chưa bị sửa trong khi chạy. Sau khi nghe duyệt, xuất bản version mới; không sửa catalog cũ để chèn audio. Kana vẫn dùng manifest và thư mục audio/kana riêng.

Với R2, dùng --lessons --r2 và R2_LESSON_PUBLIC_BASE_URL; đặt NEXT_PUBLIC_LESSON_AUDIO_BASE_URL cùng base cho web. Thêm --sync-db khi muốn đăng ký metadata trong Supabase. Không đặt secret vào biến NEXT_PUBLIC_ hoặc tên file audio.

Bài soạn trên web nằm trong database, không có file JSON. Sinh audio cho nháp đó (từ vựng, câu ví dụ, transcript câu nghe):

```bash
npm run audio:plan -- --lessons --db --lesson lesson-id
npm run audio:generate -- --lessons --db --sync-db --r2 --lesson lesson-id
```

Bỏ --lesson để xử lý mọi bài chưa lưu trữ. Script ghi hash vào nháp chỉ khi revision chưa đổi trong lúc chạy, rồi giảng viên tải lại editor, nghe thử và xuất bản. Câu nghe không xuất bản được khi chưa có audio. Với Supabase local có thể dùng --local thay --r2; database cloud bắt buộc --r2 để metadata có URL công khai.

## Xuất bản Supabase

Chỉ thực hiện khi đã chỉ định staging, áp dụng migration và chuẩn bị owner teacher. Draft phải isSample=false, đủ audio và các hash đã được đăng ký trong audio_assets.

```bash
npm run lesson:import -- --file path/to/reviewed-lesson.json --publish supabase --revision 0 --owner teacher-user-uuid
```

RPC dùng transaction cho draft/version/pointer, từ chối sai owner/revision. Script không tạo tài khoản, apply migration hoặc deploy. Với Supabase local, `npm run seed:local` xuất bản 5 bài mẫu cho giảng viên mẫu và giữ is_sample=true; script từ chối URL không phải máy local. Đặt LESSON_SOURCE=supabase để web đọc nguồn thật; lỗi cloud hiển thị lỗi, không âm thầm thay bằng bài mẫu.

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

## Định hướng chia sẻ và nhập scan — chưa triển khai

Bài Nhật mẫu/CLI/editor hiện tại giữ nguyên. Dịch vụ mới thêm ngôn ngữ, nguồn/quyền dùng, chia sẻ version view/copy và ảnh/PDF làm nguồn nhập. Bản copy phải có chủ mới, nguồn và quyền media; không mang theo notes hoặc câu test riêng. Không cho chia sẻ lại nếu quyền nguồn không cho phép.

Scan đi qua upload riêng tư → nhận dạng/gợi ý → giáo viên sửa/duyệt → draft chuẩn → xuất bản → giao bài. Cho nhập tay khi nhận dạng kém. Chỉ thêm ảnh vào slide không tạo câu tự chấm. Giáo viên xác nhận quyền dùng scan và đáp án; không đưa ảnh nguyên trang có lời giải tới học sinh. Nhật/Trung phải được duyệt bởi người đủ chuyên môn. Chi tiết theo [BD dịch vụ](basic-design/teaching-service.md).

## Soạn bài theo mẫu — luồng sản phẩm mới, chưa triển khai

Giáo viên là người soạn và chịu trách nhiệm chuyên môn. Masu cung cấp mẫu bố cục, công cụ nhập và bộ bài minh họa nhỏ do giáo viên tiếng Trung biên soạn/duyệt; không yêu cầu đội vận hành viết toàn bộ giáo trình. Giáo viên có thể dùng mẫu trống, dùng lại bài của mình hoặc sao chép bài đồng nghiệp khi được cấp quyền.

Luồng mặc định: **Chọn mẫu → Nhập nội dung → Dựng slide → Thêm bài tập → Xem trước và giao lớp**. Luôn có đường nhập tay; không cần có tài liệu scan, không cần AI/OCR hoặc tài khoản cloud mới soạn được nội dung cơ bản. Các thao tác lưu/xuất bản/giao lớp vẫn cần backend tài khoản như hiện tại.

### Bước 1 — Chọn mẫu và mục tiêu nhỏ

| Mẫu | Giáo viên cần chuẩn bị | Khung bài được tạo |
|---|---|---|
| Buổi đầu làm quen | Một mục tiêu, vài từ/câu quen thuộc | Mục tiêu → nội dung mới → mẫu hội thoại → luyện tập → việc về nhà |
| Dạy từ mới | Bảng từ và ví dụ | Mục tiêu → ôn bài cũ (tùy chọn) → từ mới → ví dụ → luyện tập → việc về nhà |
| Luyện hội thoại | Tình huống và lượt lời | Mục tiêu → từ/câu cần dùng → hội thoại → luyện theo vai → việc về nhà |
| Ôn tập | Chọn bài/từ/câu đã dạy | Mục tiêu → ôn kiến thức → ví dụ → câu luyện → việc về nhà |

Đề xuất ban đầu 3–5 từ/cụm từ, một mẫu câu và 3–5 câu luyện cho một bài nhập môn nhỏ; giáo viên điều chỉnh, không dùng số lượng này làm giới hạn cứng hay chuẩn sư phạm. Bài đầu không bắt buộc có phần ôn bài cũ. Mẫu chỉ cung cấp cấu trúc; phần nội dung mẫu phải ghi rõ minh họa/chưa duyệt nếu chưa được giáo viên duyệt.

### Bước 2 — Nhập nội dung quen thuộc

Giao diện Việt–Trung dùng cột **Chữ Hán | Pinyin | Nghĩa Việt | Ví dụ (tùy chọn)**. Giáo viên thêm từng dòng hoặc dán bảng Excel/Google Sheets, xem trước và sửa lỗi theo ô/dòng. Các trường bổ sung như pinyin/nghĩa ví dụ và ghi chú riêng nằm trong phần mở rộng. Không bắt nhập JSON, mã slide, tên asset hoặc chọn loại slide ngay từ đầu; mã nội bộ do hệ thống tạo.

Cho lưu nháp khi chưa đủ nội dung. Khi xuất bản, kiểm tra trường bắt buộc theo loại nội dung; ví dụ không có pinyin chỉ là cảnh báo nếu giáo viên chủ động bỏ, không tự sinh rồi coi là đúng. Giữ dấu thanh và giản/phồn theo bài. Audio có trạng thái chưa có/đang tạo/cần nghe duyệt/sẵn sàng; giáo viên không phải chạy CLI. TTS trên web là phần cần làm thêm, không phải khả năng hiện có của editor.

### Bước 3 — Dựng và chỉnh slide

Bấm **Dựng slide từ nội dung**, hệ thống áp dụng bố cục có sẵn, chia nội dung dài thành nhiều slide để đọc rõ. Giáo viên xem trước rồi thêm/bớt/đổi thứ tự; trình soạn chi tiết hiện tại là lựa chọn bổ sung. Nội dung bảng và slide dùng chung tham chiếu, sửa từ không phải sửa lại thủ công mọi slide.

Dựng lại chỉ cập nhật phần do hệ thống tạo sau khi xem danh sách thay đổi. Không tự xóa slide/ghi chú đã sửa tay. Có hủy thao tác khi còn ở bản nháp chưa lưu; khi tải lại lấy bản đã được server xác nhận. Thay mẫu phải cho xem trước và xác nhận thay đổi, không làm mất bài đang soạn.

### Bước 4 — Tạo bài tập có kiểm tra

Giáo viên chọn từ/câu vừa nhập và dạng **Trắc nghiệm** hoặc **Điền từ**. Hệ thống điền khung câu hỏi, giáo viên bổ sung lựa chọn, đáp án chấp nhận, điểm và giải thích. Không tự coi tất cả từ còn lại là đáp án nhiễu hợp lệ; các lựa chọn phải được kiểm tra để tránh nhiều đáp án đúng ngoài ý muốn. Nếu chưa đủ dữ liệu thì báo phần cần nhập, không bịa đáp án.

Giáo viên xác nhận từng câu sau khi sửa cuối cùng trước khi dùng trong bài xuất bản. Câu luyện hiện trên slide không được dùng làm câu test bí mật. Giáo viên chọn câu luyện cho bài về nhà practice; test dùng luồng câu riêng và chính sách phản hồi hiện tại. Scan chỉ là một nguồn bổ sung để tạo draft ở bước nhập nội dung/bài tập, vẫn đi qua kiểm tra này.

### Bước 5 — Xem trước, xuất bản và giao lớp

**Lưu nháp** giữ bài đang làm; **Xuất bản** tạo version để dùng dạy; **Giao cho lớp** chọn lớp, version, thời điểm mở, hạn và loại practice/test. Xem trước cả slide lẫn màn hình học sinh; lỗi dẫn về đúng dòng/câu. Lớp và hạn nộp không được tự suy ra từ bài mẫu. Xuất bản không tự mở bài cho mọi lớp hoặc tự gửi email; học liệu mặc định riêng cho lớp được cấp quyền, công khai/chia sẻ là lựa chọn riêng có xác nhận.

Không bắt buộc giao bài nếu giáo viên chỉ muốn trình chiếu. Sửa draft sau xuất bản không đổi bài đang dạy hoặc bài đã giao. Hiển thị “Đã lưu” khi server xác nhận, báo còn thay đổi chưa lưu và xung đột hai tab; không dùng trạng thái xem trước để báo đã xuất bản/giao thành công.

### Dạy từ dễ đến khó và thử nghiệm thực tế

Mỗi bài có mục tiêu làm được gì, đối tượng, kiến thức cần biết trước và thứ tự gợi ý trong khóa. Lộ trình nhập môn minh họa: làm quen âm/thanh điệu cơ bản → chào hỏi → nói tên → hỏi/đáp ngắn → ôn tập. Đây là khung để giáo viên chuyên môn điều chỉnh, không phải giáo trình tiếng Trung đã được thẩm định. Không tự khóa học sinh vì chưa học bài trước trừ khi có thiết kế điều kiện học riêng sau này.

Ví dụ mục tiêu bài nhỏ: “Học sinh chào hỏi và nói tên mình”. Giáo viên chọn vài từ/cụm từ, một mẫu tự giới thiệu, hội thoại ngắn và vài câu luyện; không nhồi toàn bộ kiến thức phát âm vào một buổi. Masu gợi ý thứ tự, giáo viên quyết định độ khó và thời lượng theo lớp.

Thử với một giáo viên tiếng Trung chưa được hướng dẫn editor, một bài nhập môn và một lớp thật trước khi làm nhiều mẫu. Mục tiêu thử nghiệm: từ chọn mẫu đến bản sẵn sàng dạy dưới 30 phút với nội dung giáo viên đã chuẩn bị; đo riêng thời gian chuẩn bị chuyên môn, nhập/sửa/xem trước và các chỗ cần người hỗ trợ. Đây là mục tiêu cần đo, chưa phải kết quả. Ưu tiên mẫu + bảng + dựng slide + practice trước OCR.

# Lỗi luồng học và dạy — 03/11/2026

Người dùng hỏi những chức năng nào đang lỗi trong luồng học và dạy, và yêu cầu sửa. Phần lớn mục trong danh sách rà soát là **chưa làm** (ngoài phạm vi bản thử), không phải hỏng. Bảng dưới chỉ gồm những chức năng **đã có nhưng không chạy đúng** trên production.

## Đang lỗi trên production

| Chức năng | Vì sao lỗi | Xử lý |
|---|---|---|
| Quên mật khẩu | Production chưa có SMTP riêng; thư mặc định của Supabase không tới học viên | Đã sửa tạm bằng code (dưới đây). Sửa hẳn cần tên miền và Resend ([kế hoạch POC](../poc-setup.md)) |
| Câu luyện nghe | Bài có câu nghe chưa có audio thì không xuất bản được. Trình soạn bảo giáo viên chạy một lệnh mà họ không chạy được, và production chưa có khóa Azure để ai tạo audio | Đã đổi thông báo cho đúng thực tế. Sửa hẳn cần khóa Azure/R2 và nút tạo audio trên web |
| Nút Nghe ở từ vựng, hội thoại | Production chưa có audio tạo sẵn; máy không có giọng Nhật/Trung thì không có tiếng | Cần khóa Azure/R2 rồi chạy công cụ tạo audio ([06](../06-audio.md)) |
| Email nhắc bài, email tóm tắt lớp | Chưa đặt `EMAIL_PROVIDER` (chưa có SMTP); trang cài đặt đã báo "chưa bật" | Cùng việc bật email |
| Rời trình soạn bằng link trong trang | Không hỏi lại dù còn thay đổi chưa lưu (CR-24); bản nháp vẫn khôi phục được trên máy | Đã sửa |
| Duyệt giáo viên mới | Bật mặc định; nếu production chưa có tài khoản quản trị (lần kiểm tra 29/10 chưa có), giáo viên mới kẹt ở "đang chờ duyệt" | Cần người dùng xác nhận: đăng nhập production và xem có mục "Quản trị" trên thanh đầu trang |

## Đã sửa trong đợt này

- **Quên mật khẩu:** trang `/forgot-password` có nút Đăng nhập bằng Google khi Google đã bật. Supabase gộp lần đăng nhập Google vào tài khoản cùng email, nên người dùng Gmail vào lại được ngay mà không cần thư. Sau khi gửi yêu cầu, Reng nhắc: không thấy thư thì báo giáo viên hoặc quản trị viên để được cấp mật khẩu tạm.
- **Trang Tài khoản** (`/settings/account`, nút Tài khoản cuối trang Lớp của tôi và trang Giảng dạy): đổi họ tên hiển thị, đặt mật khẩu mới khi đang đăng nhập mà không cần thư. Đổi mật khẩu sẽ đăng xuất các thiết bị khác, giống luồng đặt lại mật khẩu.
- **Câu luyện nghe:** thông báo trong trình soạn không còn đưa ra dòng lệnh. Thông báo nói rõ Reng chưa tạo được audio trên web: muốn xuất bản thì xóa câu nghe, hoặc nhờ quản trị viên tạo audio.
- **Trình soạn bài** (tiếng Nhật và tiếng Trung): còn thay đổi chưa lưu mà bấm link trong trang thì Reng hỏi lại trước khi chuyển. Đóng hoặc tải lại tab vẫn dùng hộp hỏi của trình duyệt như trước.

## Kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| `/forgot-password` có nút Google; gửi yêu cầu thì hiện lời nhắc báo giáo viên/quản trị viên | Đạt |
| Đổi họ tên ở trang Tài khoản, tải lại vẫn thấy tên mới; đổi lại tên cũ | Đạt |
| Nhập lại mật khẩu không khớp, hoặc trùng mật khẩu đang dùng, thì báo lỗi | Đạt |
| Đổi mật khẩu: thiết bị khác bị đăng xuất, thiết bị đang dùng vẫn đăng nhập; mật khẩu cũ bị từ chối, mật khẩu mới đăng nhập được | Đạt |
| Trình soạn có thay đổi chưa lưu, bấm link Giảng dạy: hiện hộp hỏi; Hủy thì ở lại, Đồng ý thì chuyển trang | Đạt |
| `tests/leave-warning.test.ts`: chỉ hỏi khi bấm link trong site ở cùng tab, không hỏi với tab mới, tải về, neo trong trang, site khác (trình duyệt tự hỏi) | Đạt |
| `npm run audit:layout` trên `/forgot-password`, `/sign-in`, `/settings/account`, `/classes`, `/teach`, trình soạn | Không có lỗi; chỉ còn cảnh báo "…" đã chấp nhận ở danh sách slide |
| `npm run check` | Đạt |

Kiểm tra trên dev server local với Supabase local, dùng tài khoản thử local. Chưa thử đặt mật khẩu cho tài khoản chỉ đăng nhập bằng Google, vì Supabase local chưa bật Google. E2E chưa chạy theo yêu cầu người dùng ngày 03/11/2026.

## Xóa học viên khỏi lớp và rời lớp

Làm sau khi người dùng đồng ý, cùng ngày. **Không cần migration:** dữ liệu đã có `enrollments.left_at`. Khi có giá trị này, học viên không vào được bài và bài tập, không chiếm chỗ trong lớp, không nhận email nhắc, báo cáo tách riêng "đã rời lớp", còn vào lại bằng mã thì được khôi phục (`join_class`). Trước đó chỉ thiếu thao tác ghi giá trị này.

- **Giáo viên:** trang chi tiết học viên có mục Thành viên lớp, nút Xóa khỏi lớp với bước xác nhận. Lời xác nhận nói rõ học viên không mở được bài (kể cả bài đang làm dở), điểm và bài đã nộp vẫn giữ, học viên còn mã thì vào lại được, muốn chặn thì đổi mã lớp.
- **Học viên:** cuối trang lớp có nút Rời lớp với bước xác nhận; rời xong về Lớp của tôi.
- Lớp tự học không có hai nút này, vì chủ lớp là học viên duy nhất; muốn bỏ thì lưu trữ lớp.

| Kiểm tra | Kết quả |
|---|---|
| Giáo viên bấm Xóa khỏi lớp: hiện lời xác nhận; Giữ trong lớp thì hủy | Đạt |
| Xác nhận xóa: trang học viên ghi "đã rời lớp"; báo cáo lớp đếm người đã rời | Đạt |
| Học viên bị xóa không còn thấy lớp; mở trang lớp thì 404 | Đạt |
| Nhập lại mã lớp: vào lại được lớp | Đạt |
| Học viên bấm Rời lớp, xác nhận: về Lớp của tôi, lớp không còn trong danh sách | Đạt |
| `npm run audit:layout` trang chi tiết học viên và trang lớp | Không có lỗi hay cảnh báo |

Kiểm tra trên dev server local với Supabase local, tài khoản thử (`co.lan@reng.local`, `hoc.vien@reng.local`). Sau đó đã cho học viên vào lại lớp để giữ dữ liệu mẫu. Chưa thử với lớp tự học trên trình duyệt; ở đó nút bị ẩn và server cũng từ chối.

## Lịch học hằng tuần

Làm sau khi người dùng đồng ý, cùng ngày. Cần migration `202611030002_class_schedules.sql` (bảng mới, không sửa dữ liệu cũ).

| Kiểm tra | Kết quả |
|---|---|
| `tests/class-schedule.test.ts`: buổi tới theo giờ Việt Nam (đang học, đã xong, sang tuần sau, máy chủ khác múi giờ), Hôm nay/Ngày mai, sắp xếp và bỏ trùng, chặn giờ hoặc thời lượng sai | Đạt |
| `tests/class-schedule-migration.test.ts`: mỗi lớp một dòng, giới hạn số buổi và độ dài ghi chú, anon/authenticated không đọc ghi được | Đạt |
| Giáo viên thêm 2 buổi và ghi chú, lưu: khối Buổi dạy online hiện "Buổi tới"; tải lại vẫn đúng thứ tự | Đạt |
| Trang Giảng dạy và Lớp của tôi hiện "Buổi tới"; trang lớp học viên hiện buổi tới, lịch hằng tuần, ghi chú và nút Meet | Đạt |
| `npm run audit:layout` trang lớp (giáo viên, học viên), Giảng dạy, Lớp của tôi | Không có lỗi hay cảnh báo, sau khi tách nút "Thêm buổi trong tuần" khỏi ô ghi chú |

Kiểm tra trên Supabase local đã áp migration. Người dùng chạy migration trên production ngày 03/11/2026 (sao lưu, `migration list`, `db push`), sau đó code mới được push. Phiên làm việc không tự đọc được danh sách migration production, vì chế độ tự động chặn. Vì vậy code đọc lịch có thêm lớp bảo vệ: thử trên máy local, khi đổi tên bảng để giả lập migration chưa chạy, cả bốn trang (Giảng dạy, trang lớp giáo viên, Lớp của tôi, trang lớp học viên) vẫn trả 200, chỉ không hiện "Buổi tới", và server ghi log lỗi đọc.

## Giao diện trang lớp của giáo viên

Người dùng báo ba chỗ xấu trên production sau khi có lịch học. Đã tái hiện trên dữ liệu local giống production (lớp "Tiếng Nhật Minna – Lớp 1" của `ui-teacher@reng.local`: 6 bài luyện hằng ngày, 1 học viên).

| Chỗ | Lỗi | Sửa |
|---|---|---|
| Câu cả lớp sai nhiều | Lớp ít học viên thì câu sai nào cũng vượt 50%, nên một bài luyện hằng ngày liệt kê cả 59 câu; viền đỏ (kiểu câu trả lời sai) chạy dọc cả nhóm | Mỗi bài là một thẻ viền xám; hiện 10 câu sai nhiều nhất, phần còn lại trong "Xem thêm N câu" |
| Cách Reng chọn câu mỗi ngày | Mở ra là một đoạn chữ dài; dòng "Đang lấy câu từ…" dính liền ngay sau, như cùng một đoạn | Trạng thái nguồn câu tách riêng ngay dưới phần giới thiệu, tiếp theo là form; phần giải thích chuyển xuống cuối, thành danh sách năm ý trong khung |
| Mã lớp | Nút "Sao chép link mời" và hàng "Đổi mã mới", "Ngừng nhận học viên" dính sát nhau | Ba nút chung một hàng (điện thoại thì xuống dòng có khoảng cách); nút sao chép không gửi form |

Kiểm tra: ảnh chụp trước và sau ở 360px và 1280px; "Xem thêm" mở đủ 59 câu; sao chép link không đổi mã lớp; `npm run audit:layout` trang lớp không có lỗi hay cảnh báo; `npm run check` đạt.

## Luồng giáo viên rõ hơn

| Kiểm tra | Kết quả |
|---|---|
| `tests/teaching-start.test.ts`: trạng thái lớp so với phiên bản, thứ tự và trạng thái 7 bước, ẩn danh sách khi đang dạy | Đạt |
| Giáo viên mới (`gv.moi@reng.local`): trang Giảng dạy hiện "Các bước bắt đầu dạy", 0/7, bước "Tạo lớp học" in đậm | Đạt |
| Giáo viên đã có học viên và bài tập: không thấy danh sách, kể cả khi chưa đặt lịch | Đạt |
| Trình soạn `lesson-01` của giáo viên có 81 lớp: mục Dùng bài trong lớp hiện 8 lớp và "Xem thêm"; Xuất bản xong hiện "Cập nhật lên phiên bản 4"; bấm thì báo "Lớp A …: đã cập nhật lên phiên bản 4." | Đạt |
| Lớp mới chưa có bài: "Đưa vào lớp" báo "… đã có bài (phiên bản 4), mở ngay cho học viên." | Đạt |
| `npm run audit:layout` trang Giảng dạy (giáo viên mới, giáo viên lớp Trung) và trình soạn tiếng Trung | Không có lỗi hay cảnh báo |

Lần thử đầu bắt được trang Giảng dạy lỗi 500: truy vấn nhúng `classes` vào `class_lessons` gặp hai khóa ngoại nên mơ hồ. Đã đổi sang lọc theo danh sách lớp trước khi commit.

## Còn lại, cần người dùng quyết định
- **Email:** mua tên miền, cấu hình Resend và SMTP cho Supabase Auth, rồi bật xác nhận email, quên mật khẩu và nhắc bài.
- **Audio:** khóa Azure Speech và R2, chạy công cụ tạo audio cho bài đang dùng; sau đó làm nút tạo audio trên trình soạn (cần trần chi phí ở trang quản trị).
- **Tài khoản quản trị trên production:** xác nhận đã có, nếu chưa thì cấp bằng SQL ([poc-setup.md](../poc-setup.md) bước 5).

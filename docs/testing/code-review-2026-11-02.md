# Rà soát lỗi lần 2 — 02/11/2026

## Phạm vi và cách làm

Rà soát tĩnh mã nguồn thay đổi từ mốc rà soát trước (`0ca9940`, xem [lần 1](code-review-2026-10-30.md)) tới `HEAD`, cộng commit `5eef6ef` (vừa dạy vừa học, đang chờ migration). Không rà nội dung bài mẫu JSON, icon SVG và tài liệu. Mỗi phát hiện được đọc lại tới nơi gây lỗi trước khi sửa; "Đã sửa" nghĩa là mã đã đổi và qua các kiểm tra ghi ở cuối, chưa phải nghiệm thu với lớp thật.

Quy ước mức giữ như lần 1: **Cao** = mất dữ liệu hoặc lộ dữ liệu; **Vừa** = sai dữ liệu hiển thị/ghi; **Thấp** = trường hợp hiếm hoặc chỉ ảnh hưởng trình bày.

## Sự cố production cùng ngày

Commit `5eef6ef` được giữ lại ở máy vì cần migration `202611020001`–`202611020003` trước. Lúc 10:24, một phiên Codex làm trong cùng thư mục tạo commit bài mẫu 13 nối tiếp commit đó và đẩy lên `main`. Vercel triển khai mã đọc cột `classes.daily_practice_lesson_id` và `classes.self_study` khi database production chưa có hai cột này, nên trang lớp, trang học viên và job luyện hằng ngày gặp lỗi trong khoảng 10:26–10:50. Bài luyện 02/11 đã được giao lúc 06:09, trước sự cố. Đã khắc phục bằng commit `f8be22c` (revert `5eef6ef`, giữ bài 13): production trả 200 cho trang công khai và chuyển hướng đăng nhập bình thường cho trang riêng. Từ nay việc cần migration không được để trên `main` ở máy cho tới khi migration đã áp dụng.

## Kết quả

| Mã | Mức | Vấn đề | Trạng thái |
|---|---|---|---|
| CR-38 | Cao | Liên kết lịch sử học tập: RPC coi `email_confirmed_at` là bằng chứng chủ email, nhưng production tắt xác nhận email nên mọi tài khoản đăng ký đều "đã xác nhận". Nút liên kết không cho giáo viên biết tài khoản nào sẽ được gắn, nên người biết email học viên có thể đăng ký trước và nhận lịch sử riêng | **Đã sửa**: liên kết hai bước, xem tên hiển thị, giờ đăng ký, lần đăng nhập gần nhất, xác nhận đã hỏi học viên; server kiểm tra lại đúng tài khoản đã xem. Production hiện không còn hồ sơ chờ liên kết |
| CR-39 | Cao | Trình soạn bài: lần lưu tới server nhưng mất phản hồi làm revision server tăng; chỉnh sửa sau đó được giữ trên máy với revision cũ và bị xóa khi tải lại trang, đúng như thông báo lỗi hướng dẫn | **Đã sửa**: bản trên máy nhớ các bản đã gửi chưa có phản hồi; mở lại mà nội dung server trùng một bản đã gửi thì vẫn khôi phục (trình soạn v1 và v2) |
| CR-40 | Vừa | Chặn đặt công khai bản sao bài được chia sẻ (CR-07) chỉ nằm ở mã ứng dụng; RPC `set_lesson_visibility` không chặn, bản sao đã công khai trước đó vẫn công khai | Đã sửa trong bản áp lại: migration `202611020004` (chờ áp dụng production) |
| CR-41 | Thấp | Luyện hằng ngày tìm câu ở tối đa 20 bài trước khi kiểm tra bài hôm nay đã có; khi bài đang mở không còn câu chọn/điền, bấm "Giao bài hôm nay ngay" báo không có câu dù bài hôm nay đã giao | Đã sửa trong bản áp lại: kiểm tra bài của ngày trước khi tìm nguồn |
| CR-42 | Vừa | (`5eef6ef`) Migration ghim lớp đang bật luyện hằng ngày vào bài của lần luyện gần nhất, kể cả lớp đang để tự động | Giữ có chủ đích: hai lớp production đang lấy từ ngân hàng ôn và cần giữ nguyên khi thêm bài mới. Tài liệu ghi rõ; giáo viên chọn lại Tự động nếu muốn |
| CR-43 | Thấp | (`5eef6ef`) Trang lớp luôn tìm nguồn luyện hằng ngày, kể cả khi đã tắt, và hiện cảnh báo "chưa giao được bài luyện" cho lớp không bật | Đã sửa trong bản áp lại: chỉ tìm nguồn và hiện trạng thái khi đang bật |
| CR-44 | Cao | (`5eef6ef`) Mã đọc cột mới nên phải chạy sau migration | Đã xảy ra (sự cố trên). Quy trình: migration trước, đẩy mã sau |
| CR-45 | Vừa | (`5eef6ef`) Chủ lớp đã tự vào lớp mình trước khi bị chặn vẫn làm bài ở vai học viên nhưng bị loại khỏi báo cáo. Production có đúng trường hợp này: lớp "Ôn JLPT N4" do Việt tạo và tự vào ngày 31/10 | Đã sửa trong bản áp lại: migration chuyển lớp chỉ có chủ lớp thành lớp tự học |
| CR-46 | Thấp | Nhập Sheet: mã câu hôm nay được viết thường nhưng dòng lịch sử so trùng theo chữ gốc, nên `T-12` và `t-12` thành hai câu cùng mã | Đã sửa trong bản áp lại: mã câu so khớp không phân biệt hoa thường |
| CR-47 | Thấp | (`5eef6ef`) Ngân hàng N4/N5 dùng mã bài cố định toàn hệ thống, giáo viên thứ hai hoặc lớp thứ hai không nhập được | Đã sửa trong bản áp lại: mã bài kèm mã lớp |

## Trang theo dõi lớp (người dùng báo cùng ngày)

| Mã | Mức | Vấn đề | Trạng thái |
|---|---|---|---|
| CR-48 | Vừa | Form bài luyện hằng ngày: sau khi bấm Lưu, ô số câu quay về giá trị cũ (React đặt lại form, `<select>` không nhận mặc định mới); Lưu lần nữa có thể tắt bài luyện ngoài ý muốn. Ô ngôn ngữ ở cài đặt lớp cùng lỗi | **Đã sửa**: `key` theo giá trị đã lưu; E2E kiểm tra ô giữ 7 câu sau khi lưu |
| CR-49 | Vừa | Số câu không nằm trong danh sách (lớp ôn N4 đặt 40 câu khi nhập) hiện thành "Tắt"; Lưu sẽ tắt bài luyện, còn action từ chối 40 | **Đã sửa**: thêm 20/30/40, luôn hiện số đang dùng, action nhận 3–60 |
| CR-50 | Thấp | "Câu cả lớp sai nhiều" liệt kê mọi câu sai của mọi bài (lớp một học viên: 64 dòng, khoảng 4.400px, mỗi dòng lặp "1/1 học viên sai") | **Đã sửa**: mỗi bài một nhóm thu gọn, bài mới nhất mở; "Bài đã giao" gom bài cũ hơn |

Dữ liệu dựng lại trên Supabase local (ngân hàng 200 câu, bài 11, 6 bài giao, một học viên sai khoảng 1/4): trang từ 7.620px còn 3.782px ở 1280px, mục câu sai từ 4.366px còn 606px; 360px không tràn ngang.

Sau phản hồi tiếp theo (chữ sát nhau, cần lọc đúng/sai):

| Mã | Mức | Vấn đề | Trạng thái |
|---|---|---|---|
| CR-51 | Thấp | Thanh điều hướng có 10–11 mục: ở 1280px mỗi mục bị bẻ thành hai dòng sát nhau, ở điện thoại các mục dồn sát nhau với khoảng cách không đều | **Đã sửa**: không bẻ tên mục, cả mục xuống hàng, khoảng cách đều |
| CR-52 | Vừa | Trang chi tiết học viên in mọi câu của mọi bài (khoảng 37.000px với 6 bài), câu trả lời và đáp án dính một dòng | **Đã sửa**: nhóm theo bài thu gọn, bộ lọc Sai/Đúng cho mọi bài, câu trả lời và đáp án tách dòng |
| CR-53 | Thấp | Trang kết quả 60 câu không có cách xem riêng câu sai; dòng trong thẻ câu cách nhau 6px | **Đã sửa**: bộ lọc Tất cả/Sai/Đúng có số câu, thẻ giãn dòng, nhãn Đúng/Sai |
| CR-54 | Thấp | Đầu trình soạn bài có mã bài `lesson-` + 32 ký tự liền; ở 360px dòng này rộng hơn khung tùy ký tự của mã ngẫu nhiên, nên E2E "editor fits 360px" lúc đạt lúc hỏng | **Đã sửa**: tiêu đề và dòng phụ của đầu trang được ngắt ở bất kỳ đâu (`overflow-wrap: anywhere`); chạy riêng 3 lần với 3 mã khác nhau đều đạt |

## Kiểm chứng phần đã sửa

- `npm run check`: PASS, 145/145 test, gồm `tests/local-draft.test.ts` (khôi phục sau lần lưu mất phản hồi, bỏ bản cũ khi nơi khác đã lưu, đổi revision gốc thì quên bản đã gửi).
- `npm run test:e2e`: PASS, 35/35.
- `npm run test:e2e:supabase` trên Supabase local: PASS, 31/31; `e2e-supabase/learning-history.spec.ts` đi qua luồng kiểm tra tài khoản → chưa đánh dấu xác nhận thì không gửi → đánh dấu → liên kết, học viên chỉ xem hồ sơ của mình.
- Sau các sửa giao diện CR-48 đến CR-54 (cùng ngày, sau khi áp migration): `npm run check` 158/158; `npm run test:e2e:supabase` 35/35 (gồm lọc Sai/Đúng ở trang kết quả và trang học viên, ô số câu giữ giá trị đã lưu); `npm run test:e2e` 35/35 khi chạy riêng (lượt chạy ngay sau suite Supabase có `e2e/audio.spec.ts` › chờ giọng Nhật quá thời gian, không liên quan thay đổi); build PASS.
- Giới hạn: không đăng nhập tài khoản thật trên production; chưa giả lập mất phản hồi trên trình duyệt thật cho CR-39 (kiểm tra bằng test logic).

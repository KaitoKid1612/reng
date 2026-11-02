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
| CR-40 | Vừa | Chặn đặt công khai bản sao bài được chia sẻ (CR-07) chỉ nằm ở mã ứng dụng; RPC `set_lesson_visibility` không chặn, bản sao đã công khai trước đó vẫn công khai | Chờ: thêm kiểm tra trong RPC và đưa bản sao đang công khai về riêng tư, gộp vào đợt migration tiếp theo |
| CR-41 | Thấp | Luyện hằng ngày tìm câu ở tối đa 20 bài trước khi kiểm tra bài hôm nay đã có; khi bài đang mở không còn câu chọn/điền, bấm "Giao bài hôm nay ngay" báo không có câu dù bài hôm nay đã giao | Chờ: sửa cùng đợt áp lại `5eef6ef` (cùng file) |
| CR-42 | Vừa | (`5eef6ef`) Migration ghim lớp đang bật luyện hằng ngày vào bài của lần luyện gần nhất, kể cả lớp đang để tự động | Giữ có chủ đích: hai lớp production đang lấy từ ngân hàng ôn và cần giữ nguyên khi thêm bài mới. Tài liệu ghi rõ; giáo viên chọn lại Tự động nếu muốn |
| CR-43 | Thấp | (`5eef6ef`) Trang lớp luôn tìm nguồn luyện hằng ngày, kể cả khi đã tắt, và hiện cảnh báo "chưa giao được bài luyện" cho lớp không bật | Chờ: sửa khi áp lại |
| CR-44 | Cao | (`5eef6ef`) Mã đọc cột mới nên phải chạy sau migration | Đã xảy ra (sự cố trên). Quy trình: migration trước, đẩy mã sau |
| CR-45 | Vừa | (`5eef6ef`) Chủ lớp đã tự vào lớp mình trước khi bị chặn vẫn làm bài ở vai học viên nhưng bị loại khỏi báo cáo. Production có đúng trường hợp này: lớp "Ôn JLPT N4" do Việt tạo và tự vào ngày 31/10 | Chờ: khi áp lại, lớp chỉ có chủ lớp là thành viên được chuyển thành lớp tự học |
| CR-46 | Thấp | Nhập Sheet: mã câu hôm nay được viết thường nhưng dòng lịch sử so trùng theo chữ gốc, nên `T-12` và `t-12` thành hai câu cùng mã | Chờ: sửa khi áp lại (cùng file) |
| CR-47 | Thấp | (`5eef6ef`) Ngân hàng N4/N5 dùng mã bài cố định toàn hệ thống, giáo viên thứ hai hoặc lớp thứ hai không nhập được | Chờ: mã bài theo lớp khi áp lại |

## Trang theo dõi lớp (người dùng báo cùng ngày)

| Mã | Mức | Vấn đề | Trạng thái |
|---|---|---|---|
| CR-48 | Vừa | Form bài luyện hằng ngày: sau khi bấm Lưu, ô số câu quay về giá trị cũ (React đặt lại form, `<select>` không nhận mặc định mới); Lưu lần nữa có thể tắt bài luyện ngoài ý muốn. Ô ngôn ngữ ở cài đặt lớp cùng lỗi | **Đã sửa**: `key` theo giá trị đã lưu; E2E kiểm tra ô giữ 7 câu sau khi lưu |
| CR-49 | Vừa | Số câu không nằm trong danh sách (lớp ôn N4 đặt 40 câu khi nhập) hiện thành "Tắt"; Lưu sẽ tắt bài luyện, còn action từ chối 40 | **Đã sửa**: thêm 20/30/40, luôn hiện số đang dùng, action nhận 3–60 |
| CR-50 | Thấp | "Câu cả lớp sai nhiều" liệt kê mọi câu sai của mọi bài (lớp một học viên: 64 dòng, khoảng 4.400px, mỗi dòng lặp "1/1 học viên sai") | **Đã sửa**: mỗi bài một nhóm thu gọn, bài mới nhất mở; "Bài đã giao" gom bài cũ hơn |

Dữ liệu dựng lại trên Supabase local (ngân hàng 200 câu, bài 11, 6 bài giao, một học viên sai khoảng 1/4): trang từ 7.620px còn 3.782px ở 1280px, mục câu sai từ 4.366px còn 606px; 360px không tràn ngang.

## Kiểm chứng phần đã sửa

- `npm run check`: PASS, 145/145 test, gồm `tests/local-draft.test.ts` (khôi phục sau lần lưu mất phản hồi, bỏ bản cũ khi nơi khác đã lưu, đổi revision gốc thì quên bản đã gửi).
- `npm run test:e2e`: PASS, 35/35.
- `npm run test:e2e:supabase` trên Supabase local: PASS, 31/31; `e2e-supabase/learning-history.spec.ts` đi qua luồng kiểm tra tài khoản → chưa đánh dấu xác nhận thì không gửi → đánh dấu → liên kết, học viên chỉ xem hồ sơ của mình.
- Giới hạn: không đăng nhập tài khoản thật trên production; chưa giả lập mất phản hồi trên trình duyệt thật cho CR-39 (kiểm tra bằng test logic).

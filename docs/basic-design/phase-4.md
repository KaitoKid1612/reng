# Basic Design giai đoạn 4 — Tự chủ nội dung và nhắc bài

> Phạm vi nền Nhật: tài liệu giai đoạn này giữ thiết kế/bằng chứng triển khai trước dịch vụ Việt–Trung; không chứng minh tính năng mới đã có. Thiết kế hiện hành xem [BD dịch vụ](../basic-design/teaching-service.md), [DD dịch vụ](../detail-design/teaching-service.md) và [checklist dịch vụ](../testing/teaching-service.md). Kết quả PASS/Chưa chạy lịch sử được giữ nguyên.

Baseline 28/10/2026. Giai đoạn 1–3 mới nghiệm thu local; thiết kế này tiếp tục trên Supabase local. Yêu cầu nguồn: ADMIN-01/02/03, VOCAB-05, NOTI-01/02/03 trong 01; dữ liệu 03, thông báo 08, slide 05.

## Phạm vi

Giảng viên tạo bài mới, soạn từ vựng/ngữ pháp/câu luyện/slide trên web, xem trước slide ngay khi gõ, kéo thả thứ tự slide, lưu nháp và xuất bản phiên bản mới mà không mở editor code. Từ vựng nhập hàng loạt từ CSV hoặc dán bảng từ Excel, báo lỗi từng dòng. Học viên/giảng viên chọn nhận email; hệ thống gửi nhắc học tối, tổng kết tuần và tóm tắt lớp buổi sáng chỉ khi có việc, có link hủy một chạm.

Ngoài phạm vi: sinh audio từ web (vẫn chạy script ADMIN-04), tải ảnh lên Storage (slide ảnh nhận đường dẫn local/HTTPS), sửa câu luyện dạng ghép đôi/sắp xếp/nghe (giữ nguyên nếu có), nhân bản bài, web push, xóa cứng bài.

## Màn hình

| ID | URL | Hành vi chính |
|---|---|---|
| T06a | /teach/lessons/new | ID bài (chữ thường, số, gạch nối), tiêu đề, thứ tự; tạo bản nháp trống của giảng viên |
| T06 | /teach/lessons/[id]/edit | Cột trái: thông tin bài, từ vựng, ngữ pháp, câu luyện, danh sách slide kéo thả và form slide đang chọn. Cột phải: xem trước slide 1280×720 co giãn. Nút "Lưu nháp" và "Xuất bản" tách riêng |
| T07 | /teach/import-csv | Chọn bài, tải file CSV UTF-8 hoặc dán bảng; xem trước từng dòng hợp lệ/lỗi/trùng; thêm dòng hợp lệ vào bản nháp |
| N01 | /settings/notifications | Học viên: nhắc hằng ngày / chỉ khi sắp hết hạn / tắt, tổng kết tuần. Giảng viên: tóm tắt lớp buổi sáng. Mặc định tắt |
| N02 | /unsubscribe/[token] | Xác nhận hủy mọi email nhắc; nút POST, không hủy chỉ vì trình quét mở link |

T01 có lối vào soạn bài, tạo bài và nhập CSV. Trang tiến độ học viên có lối vào cài đặt thông báo. Trên điện thoại editor xếp một cột, xem trước nằm dưới form slide.

## Luồng chính

1. **Tạo và soạn bài:** tạo bài → thêm từ vựng/ngữ pháp/câu luyện → thêm slide, chọn loại và trỏ tới mục đã nhập → xem trước → lưu nháp. Bản nháp có thể chưa đầy đủ; học viên không thấy bản nháp.
2. **Xuất bản:** kiểm tra đủ trường, tham chiếu, đáp án, đường dẫn ảnh; lỗi hiện theo từng mục và không xuất bản. Mục thiếu audio là cảnh báo, giọng thiết bị được dùng tạm như giai đoạn 2. Xuất bản tạo phiên bản mới; lớp và bài giao cũ giữ phiên bản đã ghim.
3. **Hai tab/hai người cùng sửa:** lưu bằng revision cũ báo xung đột; giảng viên chọn tải bản trên máy chủ hoặc ghi đè có chủ đích. Không tự ghi đè.
4. **CSV:** dòng đầu là tiêu đề cột (jp, kanji, romaji, vi, note hoặc tên tiếng Việt tương ứng); dòng thiếu jp/romaji/vi, jp không phải kana hoặc quá dài bị đánh dấu lỗi kèm số dòng; dòng trùng từ đã có bị bỏ qua. Chỉ thêm khi giảng viên xác nhận.
5. **Nhắc bài:** 20:00 giờ Việt Nam học viên bật nhắc nhận email nếu có thẻ đến hạn hoặc bài chưa nộp (due_only: bài hết hạn trong 24 giờ). Chủ nhật 19:00 tổng kết tuần nếu hai tuần gần nhất có hoạt động. 06:00 giảng viên nhận tóm tắt lớp nếu có bài nộp mới, câu sai nhiều hoặc học viên bỏ bài.
6. **Hủy:** link cuối email và header List-Unsubscribe một chạm tắt mọi email nhắc ngay, hủy job chưa gửi. Bounce/complaint từ nhà cung cấp tạm dừng gửi tới địa chỉ đó.

## Ngoại lệ

| Tình huống | Kết quả |
|---|---|
| Bài không thuộc giảng viên | 404 |
| Xóa từ/ngữ pháp/câu đang được slide dùng | Không cho xóa, nêu slide đang tham chiếu |
| Rời trang khi chưa lưu | Trình duyệt hỏi xác nhận |
| Audio hash không có trong audio_assets | Lỗi chặn xuất bản |
| File CSV không phải UTF-8 | Báo cách lưu "CSV UTF-8" trong Excel, không nhập |
| Chưa cấu hình nhà cung cấp email/cron secret | Job không chạy, trả 503; không gửi giả |
| Gửi lỗi tạm thời | Thử lại có giới hạn; không mất lịch sử lỗi |
| Hết hạn lease khi worker dừng giữa chừng | Lượt chạy sau tiếp nhận, dùng cùng idempotency key |

## Quyền

Chỉ giảng viên sở hữu bài được soạn, nhập CSV và xuất bản; xuất bản đi qua RPC kiểm tra owner/revision trong transaction. Mỗi người chỉ đọc/sửa tùy chọn thông báo của mình. Cron và webhook xác thực bằng secret/chữ ký, không dùng phiên người dùng. Link hủy là token ký có phạm vi, không phải user_id thuần.

## Điều kiện nghiệm thu

Truy vết tại [checklist giai đoạn 4](../testing/phase-4.md). Local cần: tạo bài mới từ trang trắng tới khi học viên thấy trên danh sách mà không mở editor code; lỗi CSV từng dòng; xung đột revision; email chỉ gửi khi đã bật và có việc, chạy cron hai lần không gửi trùng, hủy có hiệu lực ngay; thư đi vào Mailpit. Gửi thật qua Resend tới hộp thư thử, SPF/DKIM/DMARC và lịch cron trên hosting là điều kiện nghiệm thu riêng.

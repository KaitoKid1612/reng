# Nhắc bài

Rà soát dịch vụ Việt–Trung ngày 29/10/2026. Email local có bằng chứng giai đoạn 4; quota nhiều giáo viên và gửi thật chưa nghiệm thu. Giáo viên không tự bật đồng ý nhận tin thay học sinh; giao bài không tự phát sinh email ngoài lựa chọn người nhận.

## Chọn kênh

MVP dùng email opt-in và mục việc cần làm trong website. Web Push là mở rộng chưa triển khai, Zalo OA ngoài phạm vi. Hiệu quả nhắc học cần đo trên lớp thử, không suy ra từ tỷ lệ mở email ước lượng. Không cam kết kênh miễn phí khi số giáo viên/lớp tăng.

## Dịch vụ gửi email

Code hiện có adapter Resend cho gửi thật và Mailpit local; chưa xác minh gói/quota production cho dịch vụ nhiều giáo viên. Tính ngân sách theo số người opt-in, loại email và retry; gói/provider khác cần kiểm chứng trước đổi, không đặt ngưỡng lớp cố định dựa trên free tier cũ.

Bản triển khai giai đoạn 4 dùng template chuỗi có escape và CSS inline (lib/notifications/templates.ts) thay cho react-email, vì email được dựng trong route handler cron. Local gửi vào Mailpit; production dùng Resend qua HTTP với Idempotency-Key. Chi tiết tại [DD giai đoạn 4](detail-design/phase-4.md).

## Cấu hình tên miền

Làm sai thì email vào thẳng spam và bạn không bao giờ biết.

1. Gửi từ tên miền riêng, ví dụ `nhacbai@reng.example`. Không gửi từ địa chỉ Gmail.
2. Thêm ba bản ghi DNS: SPF, DKIM, DMARC. Resend hướng dẫn từng bước, khoảng 20 phút.
3. Thêm header one-click unsubscribe.

Trước gửi thật kiểm tra yêu cầu domain/xác thực của đúng provider và nơi nhận, dùng địa chỉ gửi thuộc domain đã xác minh. DNS và khả năng gửi phải thử lại khi cấu hình thay đổi, không coi một lần cấu hình là đủ vĩnh viễn.

Email nhắc học phải có lựa chọn nhận tin và cách hủy. Không dùng phần này để kết luận miễn trừ pháp lý cho loại email nào; kiểm tra yêu cầu vận hành trước gửi thật. Bản hiện tại có header/link hủy theo DD phase-4; ví dụ:

```
List-Unsubscribe: <https://reng.example/unsubscribe/abc123>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

Nó bảo vệ danh tiếng tên miền: học viên chán sẽ bấm hủy thay vì bấm "báo spam".

## Nguyên tắc nội dung

**Không có gì để nói thì đừng gửi.** Học viên hôm qua đã ôn hết thẻ, không có bài tập sắp hạn — bỏ qua ngày đó.

Email ngày nào cũng đến mà ngày nào cũng rỗng thì sau hai tuần không ai mở nữa. Đây là quy tắc quan trọng hơn mọi thứ khác trong file này.

## Ba loại email

### Hằng ngày cho học viên

Gửi 20h, chỉ khi có việc.

Nội dung:
- Tiêu đề có tên học viên và một con số cụ thể: "Hà ơi, hôm nay có 12 từ cần ôn". Không dùng "Nhắc nhở học tập hằng ngày" — cái đó trông như thư quảng cáo.
- Chuỗi ngày học liên tiếp. Người ta ngại làm đứt chuỗi hơn là ngại bỏ một buổi học.
- Số thẻ cần ôn, bài tập sắp hết hạn
- Một từ của ngày kèm câu ví dụ
- Một nút lớn duy nhất: "Ôn 12 thẻ ngay"
- Chân email: lý do nhận, link đổi tần suất, link hủy

Cho học viên chọn: hằng ngày, chỉ khi sắp hết hạn, hoặc tắt hẳn.

### Hằng tuần cho học viên

Tổng kết tuần: học bao nhiêu từ mới, điểm bài tập, so với tuần trước.

Đây mới là thứ tạo cảm giác tiến bộ. Email hằng ngày thúc hành động, email hằng tuần cho thấy kết quả.

### Hằng ngày cho giảng viên

Gửi 6h sáng. Tóm tắt lớp: ai nộp bài, câu nào cả lớp sai nhiều, ai đang bỏ bài.

Đọc trên đường tới lớp là biết buổi hôm nay cần chữa gì. Chỉ tốn thêm một email mỗi ngày.

## Tùy chọn và chống gửi trùng

Lưu lựa chọn tại notification_preferences theo `03`. Mặc định tắt; học viên chủ động đăng ký daily hoặc due_only, tổng kết tuần có lựa chọn riêng; giảng viên bật teacher_digest riêng. due_only nghĩa là bài chưa nộp sẽ hết hạn trong 24 giờ tới. Mỗi lần gửi phải kiểm tra lại tùy chọn và việc còn cần làm. Ngày thống kê theo Asia/Ho_Chi_Minh.

Khóa `(user_id, email_type, for_date)` của email_log chống tạo trùng công việc, nhưng không tự bảo đảm API gửi chỉ thực hiện một lần.

1. Tạo job pending với idempotency_key cố định từ khóa ghép; nếu đã tồn tại thì dùng job đó.
2. Worker nhận job bằng cập nhật nguyên tử sang sending, tăng attempts và đặt lease_until để hai worker không gửi cùng lúc.
3. Gửi với cùng idempotency_key khi provider hỗ trợ; thành công lưu provider_message_id, sent_at và status sent.
4. Lỗi chắc chắn chưa gửi thì đánh failed để retry có backoff và giới hạn số lần. Không xóa lịch sử lỗi.
5. Timeout không rõ provider đã gửi hay chưa: đối soát theo provider_message_id/idempotency key trước khi thử lại. Nếu provider không hỗ trợ chống trùng hoặc hết cửa sổ chống trùng thì cần xử lý thủ công; không hứa exactly-once.
6. Worker chết được tiếp nhận lại sau khi lease hết hạn, vẫn theo quy tắc đối soát trên.

Link hủy dùng token ngẫu nhiên hoặc chữ ký có phạm vi, không dùng user_id thuần. Hủy cập nhật tùy chọn ngay và vô hiệu hóa các job chưa gửi. Webhook phải xác thực chữ ký, xử lý sự kiện lặp an toàn; bounce/complaint dừng gửi tới địa chỉ đó cho tới khi xử lý.

## Theo dõi mở email

Cột `opened_at` lấy từ webhook đã xác thực. Tín hiệu mở email có thể thiếu hoặc bị proxy tải tự động; không dùng riêng tín hiệu này để kết luận học viên ngừng học.

Tiến độ/bài nộp trong website là căn cứ chính để giáo viên xem ai cần hỗ trợ. Không tự nhắn qua kênh khác hoặc coi không mở email là không học.

## Lịch chạy

| Email | Giờ VN | Cron (UTC) |
|---|---|---|
| Nhắc học viên | 20:00 | `0 13 * * *` |
| Tóm tắt giảng viên | 06:00 | `0 23 * * *` |
| Tổng kết tuần | Chủ nhật 19:00 | `0 12 * * 0` |

Vercel Cron chạy theo UTC. Việt Nam là UTC+7, không có giờ mùa hè nên không phải lo lệch theo mùa.

## Web Push

Web Push ngoài MVP; quyền trình duyệt, hỗ trợ thiết bị và ngân sách gửi cần kiểm chứng nếu triển khai. Không xin quyền khi chưa có tính năng thực tế.

Giai đoạn 6 mới triển khai. Lưu subscription từng thiết bị tại push_subscriptions, chỉ user sở hữu được đăng ký/hủy qua API. Endpoint và khóa không được lộ trong báo cáo. Vô hiệu hóa subscription khi dịch vụ báo hết hiệu lực; retry giới hạn với lỗi tạm thời. Chỉ gửi khi push_enabled và bài vẫn cần nhắc. Dùng Web Push API chuẩn; khóa gửi phía server.

Lưu ý: iOS chỉ hỗ trợ web push khi người dùng đã thêm trang vào màn hình chính. Cần một hướng dẫn nhỏ cho học viên dùng iPhone.

Push dùng cho tin ngắn và gấp: "Bài tập bài 5 hết hạn trong 2 giờ". Nội dung dài để cho email.

## Thời điểm xin quyền

Đừng hỏi ngay lúc học viên mở trang lần đầu — gần như ai cũng từ chối.

Hỏi sau khi học viên hoàn thành phiên ôn đầu tiên, lúc họ đang có cảm giác tích cực: "Nhắc bạn ôn mỗi tối nhé?"

## Phạm vi dịch vụ nhiều giáo viên

Dịch vụ mới giữ opt-in và job idempotency hiện tại. Giáo viên chỉ xem việc cần nhắc của lớp mình; không xem địa chỉ email/lịch học ngoài phạm vi. Trước khi gửi, kiểm tra lại membership, trạng thái nộp, hạn và lựa chọn nhận tin. Mã/lời mời lớp không tự đăng ký nhận email. Bổ sung quota/tốc độ gửi theo giáo viên và audit trước mở nhiều giáo viên; chưa triển khai quota này. Không đưa signed URL scan, đáp án test, notes hay link Meet riêng vào email digest không đúng đối tượng.

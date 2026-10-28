# Nhắc bài

## Chọn kênh

**Email cộng Web Push.** Không dùng Zalo OA, lý do ở `10-risks-costs-and-licenses.md`.

Email mang nội dung đầy đủ, push mang tính tức thì. Hai cái bù cho nhau và cả hai đều miễn phí.

Nói thẳng một điều: học viên Việt mở email ít hơn mở tin nhắn. Tỉ lệ mở email nhắc học thường quanh 20–40%. Nên đừng để email gánh một mình.

## Dịch vụ gửi email

**Resend** cho giai đoạn đầu. Free 3.000 email mỗi tháng, tối đa 100 mỗi ngày, 3 tên miền.

Con số chặn bạn là 100/ngày, không phải 3.000/tháng. Tính thử:

| Quy mô | Email/ngày | Có vừa không |
|---|---|---|
| 1 lớp 20 người | 20 | Thoải mái |
| 2 lớp 25 người | 50 | Vừa |
| 3 lớp 30 người | 90 | Sát trần, thêm báo cáo tuần là vượt |

Khi tới ngưỡng đó chuyển sang **Brevo** (300/ngày miễn phí) hoặc **Mailjet** (6.000/tháng, 200/ngày). Đổi provider chỉ là thay một hàm `send()` nếu bạn bọc nó lại từ đầu.

Template viết bằng `react-email`, cú pháp JSX giống component thường.

## Cấu hình tên miền

Làm sai thì email vào thẳng spam và bạn không bao giờ biết.

1. Gửi từ tên miền riêng, ví dụ `nhacbai@n5.tenban.com`. Không gửi từ địa chỉ Gmail.
2. Thêm ba bản ghi DNS: SPF, DKIM, DMARC. Resend hướng dẫn từng bước, khoảng 20 phút.
3. Thêm header one-click unsubscribe.

Bạn chưa phải bulk sender — Google chỉ xếp vào nhóm đó khi gửi từ 5.000 email mỗi ngày tới tài khoản Gmail cá nhân. Với người gửi thường thì Gmail chỉ yêu cầu có SPF hoặc DKIM. Nhưng cứ làm đủ cả ba, vì Gmail vẫn chấm điểm bạn theo đó và một lần cấu hình là xong vĩnh viễn.

Về unsubscribe: email giao dịch do người dùng chủ động kích hoạt thì được miễn, nhưng email nhắc học hằng ngày về bản chất là đăng ký nhận tin. Thêm hai header:

```
List-Unsubscribe: <https://n5.tenban.com/unsubscribe/abc123>
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

Giá trị của nó không phải để làm báo cáo đẹp, mà để phát hiện học viên nào ba tuần liền không mở email. Với những em đó, email đã vô dụng — bạn cần nhắn trực tiếp.

## Lịch chạy

| Email | Giờ VN | Cron (UTC) |
|---|---|---|
| Nhắc học viên | 20:00 | `0 13 * * *` |
| Tóm tắt giảng viên | 06:00 | `0 23 * * *` |
| Tổng kết tuần | Chủ nhật 19:00 | `0 12 * * 0` |

Vercel Cron chạy theo UTC. Việt Nam là UTC+7, không có giờ mùa hè nên không phải lo lệch theo mùa.

## Web Push

Miễn phí hoàn toàn, hiện ngay trên màn hình điện thoại, học viên bấm đồng ý một lần.

Giai đoạn 6 mới triển khai. Lưu subscription từng thiết bị tại push_subscriptions, chỉ user sở hữu được đăng ký/hủy qua API. Endpoint và khóa không được lộ trong báo cáo. Vô hiệu hóa subscription khi dịch vụ báo hết hiệu lực; retry giới hạn với lỗi tạm thời. Chỉ gửi khi push_enabled và bài vẫn cần nhắc. Dùng Web Push API chuẩn; khóa gửi phía server.

Lưu ý: iOS chỉ hỗ trợ web push khi người dùng đã thêm trang vào màn hình chính. Cần một hướng dẫn nhỏ cho học viên dùng iPhone.

Push dùng cho tin ngắn và gấp: "Bài tập bài 5 hết hạn trong 2 giờ". Nội dung dài để cho email.

## Thời điểm xin quyền

Đừng hỏi ngay lúc học viên mở trang lần đầu — gần như ai cũng từ chối.

Hỏi sau khi học viên hoàn thành phiên ôn đầu tiên, lúc họ đang có cảm giác tích cực: "Nhắc bạn ôn mỗi tối nhé?"

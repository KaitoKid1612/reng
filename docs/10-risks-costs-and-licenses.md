# Rủi ro, chi phí và quyền sử dụng

## Phạm vi và trạng thái

Rà soát ngày 29/10/2026 cho dịch vụ Việt–Trung. Bỏ các con số free tier, dự đoán “0 đồng” và kết luận giấy phép từ thiết kế cũ vì chưa có hồ sơ xác minh hiện hành. Tài liệu này quy định việc cần kiểm tra, không phải bảng giá, tư vấn pháp lý hay xác nhận đã mua gói/deploy.

## Quyền dùng học liệu

Giáo viên chịu trách nhiệm chuyên môn và quyền đưa tài liệu vào lớp/chia sẻ. Nền tảng lưu nguồn, tác giả, điều kiện sử dụng và phạm vi cấp phép theo bài/media. Có quyền dùng trong một lớp không tự suy ra quyền để đồng nghiệp sao chép hoặc xuất bản lại.

| Nguồn | Hồ sơ phải có trước khi dùng |
|---|---|
| Giáo viên tự soạn | Tác giả, quyền hình/audio đính kèm, phạm vi chia sẻ view/copy/tiếp tục chia sẻ |
| Sách/ảnh scan/PDF | Nguồn, chủ quyền, bằng chứng được dùng và phân phối phù hợp phạm vi; không mặc định scan sách là học liệu dùng tự do |
| Bản thu/TTS/font | Điều khoản đúng voice/font/provider, quyền lưu/phát/chia sẻ, attribution khi có yêu cầu |
| Từ điển/dữ liệu mở Nhật/Trung | URL nguồn chính thức, phiên bản/ngày lấy, bản giấy phép cụ thể, nghĩa vụ phân phối và ghi công đã được kiểm tra |
| Bản sao đồng nghiệp | Source owner/version, grant, điều kiện sử dụng và giới hạn chia sẻ tiếp |

JMdict/KANJIDIC2/KanjiVG/VOICEVOX/Tatoeba từng được cân nhắc cho module Nhật; chưa mặc định cấp phép áp dụng cho sản phẩm mới. Không nhập dữ liệu hay khẳng định chỉ bỏ một cột là giải quyết toàn bộ quyền sử dụng. Trang /sources chỉ ghi nguồn thực tế đã dùng, không ghi công như thể dữ liệu đã được nhập khi chưa có.

Có chức năng báo cáo nội dung, đầu mối xử lý/gỡ, audit và thông báo cho chủ bài/người nhận bị ảnh hưởng. Thu hồi grant ngăn truy cập mới, không hứa xóa được mọi bản đã tải; gỡ vi phạm là quy trình riêng.

## Dữ liệu học sinh và scan

Chủ lớp chỉ đọc học sinh/kết quả thuộc lớp mình. Chia sẻ slide không chia sẻ danh sách học sinh, email, bài nộp, ghi chú riêng hay đề test. API dùng service role, database và storage đều cần kiểm chứng biên quyền.

Scan mặc định riêng tư, loại thông tin cá nhân không cần thiết trước nhận dạng. Trước bật OCR phải kiểm tra nhà cung cấp xử lý/lưu dữ liệu ở đâu, thời gian giữ, điều kiện dùng cho huấn luyện và cơ chế xóa; thông báo cho giáo viên về việc gửi tệp ra ngoài. Không dùng tệp thật để thử dịch vụ chưa được phép.

Nguồn/OCR trung gian dự kiến giữ 30 ngày hoặc xóa theo yêu cầu; asset đã xuất bản có vòng đời riêng theo snapshot. Xóa nguồn không tự phá bài đã giao. Yêu cầu xuất/xóa tài khoản do vận hành xử lý khi chưa có UI, xác định thời hạn giữ dữ liệu và nghĩa vụ liên quan trước nhận lớp thật.

## Ngân sách và quota

Không suy số lớp tối đa từ free tier chung. Chi phí và gói cho POC 10 giáo viên đã kiểm tra ngày 29/10/2026 ở [kế hoạch POC](poc-setup.md). Mô hình chi phí theo tháng cần có:

| Khoản | Đơn vị đo và kiểm soát |
|---|---|
| Web/database/Auth/backup | Người dùng hoạt động, request, dung lượng, connection, backup/restore; tách staging/production |
| Ảnh/PDF/audio | Dung lượng gốc + preview + bản sao, request và băng thông, số version còn giữ |
| OCR/worker | Trang xử lý, lượt retry, thời gian chạy, concurrency và quota mỗi giáo viên |
| TTS/bản thu | Ký tự/voice/locale hoặc dung lượng bản thu, lượt tạo lại và asset tái dùng hợp lệ |
| Email | Số người opt-in, loại email/ngày/tuần, bounce, retry và quota gửi |
| Video | Tài khoản và điều kiện Google Meet do giáo viên sử dụng bên ngoài; không tính là video do Reng cung cấp |

Bản thử scan đề xuất 10 trang/20 MB/job, 100 trang/tháng/giáo viên và 1 job đồng thời; cần cấu hình, đo rồi điều chỉnh, chưa là gói giá. Khi quota hết báo rõ/cho nhập tay, không tự đổi sang nhà cung cấp khác hoặc tự bật tính phí. Audio/video/OCR/email đều có thể phát sinh chi phí; không coi băng thông audio là khoản duy nhất.

Trước chọn gói, ghi URL chính thức, ngày kiểm tra, gói/region/đơn vị tính, điều kiện thương mại và ngân sách chặn. Quyết định thu phí Reng chưa chốt. Không mặc định hosting cá nhân đáp ứng dịch vụ thương mại hoặc lịch cron mong muốn.

## Rủi ro và cách xử lý

| Rủi ro | Cách giảm/kiểm chứng |
|---|---|
| Giáo viên bỏ cuộc vì editor khó | Mẫu + bảng + dựng slide, thử một bài dễ trước OCR, đo AUTHOR-08 |
| Dữ liệu lẫn giữa giáo viên | Test UI/API/RLS/storage bằng hai chủ lớp, grant scope theo version |
| Scan/AI sai chữ hoặc đáp án | Ảnh cạnh draft, phần chưa rõ cần sửa, giáo viên duyệt revision trước publish |
| Nội dung đổi làm sai bài đã giao | Version bất biến, assignment snapshot, copy độc lập, không cập nhật ngầm |
| Audio sai giọng/thiếu font/dấu | Locale rõ, nghe duyệt và kiểm tra chữ Hán/pinyin trên thiết bị thật |
| Mạng/job/provider lỗi | Lease/retry/idempotency/CAS, giữ sửa tay, lỗi rõ và đường nhập thủ công |
| Email không đến hoặc gửi sai lớp | Opt-in và membership kiểm tra lại khi gửi, bounce/complaint, hộp thư thử và audit |
| Dịch vụ tạm dừng/mất dữ liệu | Gói phù hợp, giám sát, backup và khôi phục thử; không dựa vào cron ping |
| Link Meet bị gửi ra ngoài | Chỉ hiện đúng lớp; quyền cuộc gọi do Meet quản lý, không hứa chống chia sẻ link |

Chưa làm Zalo OA, video nội bộ, marketplace, chấm tự luận/viết tay tự động hoặc chấm phát âm trong MVP. Đây là lựa chọn phạm vi, không dựa trên con số giá chưa kiểm chứng.

## Điều kiện trước lớp thật

- Có nội dung/nguồn/media được phép dùng và giáo viên chuyên môn duyệt.
- Có cấu hình gói/quota và đầu mối chi phí, lỗi, lạm dụng, yêu cầu dữ liệu.
- Rà quyền hai giáo viên/hai lớp, notes/test/scan/private media và membership sau rời lớp.
- Chạy backup/restore thử, kiểm tra log không chứa khóa/tệp/đáp án riêng.
- Gửi email thử đúng opt-in/unsubscribe; kiểm tra cấu hình domain của provider thực tế.
- Dạy qua Meet trên thiết bị thật, nghe và xem font/PDF, ghi kết quả vào checklist; chưa coi local tests là nghiệm thu này.

# Tổng quan

## Định hướng dịch vụ — 29/10/2026

Masu là dịch vụ hỗ trợ giáo viên tổ chức lớp, soạn và chia sẻ học liệu, giao bài, chấm điểm và theo dõi học sinh. Giáo viên dạy trực tiếp hoặc qua Google Meet; Masu cung cấp slide và hoạt động học tập trước, trong và sau buổi học. Tiếng Nhật N5 là bộ nội dung đầu tiên đã có mã nguồn, không phải giới hạn của sản phẩm. Tiếng Trung là trường hợp mở rộng ưu tiên theo nhu cầu hiện tại.

Ví dụ: một giáo viên tiếng Trung đăng ký tài khoản giáo viên, tạo lớp 10 học sinh, gửi lời mời vào lớp và lưu link Meet. Trong buổi học giáo viên mở slide Masu, chia sẻ tab trình chiếu qua Meet. Học sinh dùng tài khoản của mình để đọc bài được cấp quyền, làm bài trên điện thoại và xem kết quả theo chính sách bài giao. Giáo viên nhìn được ai chưa nộp, ai sai nhiều và ai cần nhắc.

## Vấn đề đang giải quyết

Slide, tài liệu scan, bài tập, điểm và nhắc học đang nằm ở nhiều công cụ. Giáo viên phải nhập lại nội dung và khó tái sử dụng bài của đồng nghiệp; học sinh thiếu một nơi theo dõi việc cần làm. Masu gom học liệu và hoạt động lớp, giữ liên kết phiên bản giữa bài dạy và bài giao.

## Mục tiêu

- Giáo viên tự đăng ký, tạo lớp và quản lý học sinh của mình.
- Soạn một nguồn nội dung để trình chiếu, đọc lại, ôn tập và tạo bài tập.
- Chia sẻ phiên bản slide cho giáo viên khác theo quyền xem hoặc sao chép.
- Giao bài có hạn, tự chấm câu có đáp án xác định, hỗ trợ giáo viên xử lý câu cần chấm tay.
- Theo dõi tiến độ và nhắc học theo lựa chọn nhận tin.
- Chuyển ảnh/PDF bài tập thành bản nháp tương tác có giáo viên duyệt.

## Người dùng và phạm vi

Giáo viên độc lập là chủ sở hữu lớp và học liệu của mình. Học sinh có thể tham gia nhiều lớp bằng lời mời/mã lớp và chủ yếu dùng điện thoại. Người vận hành xử lý hỗ trợ, lạm dụng và sự cố. Một tài khoản có thể vừa dạy lớp của mình vừa học lớp khác trong thiết kế dịch vụ; mô hình role độc quyền hiện tại cần được nâng cấp trước khi hỗ trợ điều này.

Dịch vụ bản đầu tập trung vào giáo viên cá nhân, không xây tổ chức/trung tâm nhiều cấp quản trị. Thu phí, gói dịch vụ và thanh toán chưa chốt, không mặc định 10 học sinh là một gói thương mại hoặc giới hạn chung.

## Nguyên tắc nền tảng

Nội dung tách khỏi giao diện; phiên bản xuất bản bất biến; bài giao giữ snapshot. Chia sẻ slide không chia sẻ danh sách học sinh, bài nộp, điểm, ghi chú riêng hoặc ngân hàng đề test. Giáo viên nhận bản sao chỉnh sửa độc lập, không ghi đè bài gốc. Tệp scan được lưu riêng tư và chỉ trở thành học liệu sau khi duyệt.

Google Meet đảm nhiệm âm thanh/video. Bản đầu chỉ lưu link cuộc họp và chia sẻ tab trình chiếu; chưa tích hợp tạo cuộc họp tự động, nhúng cuộc gọi hoặc đồng bộ slide tới thiết bị học sinh theo thời gian thực. Cửa sổ presenter hiện tại chỉ đồng bộ giữa các cửa sổ cùng trình duyệt, không phải phòng học online.

## Phạm vi và trạng thái

Đã có mã nguồn cho nền tiếng Nhật, lớp học/bài giao, editor, chấm khách quan, tiến độ và email; bằng chứng local xem checklist từng giai đoạn. Chưa suy ra đã triển khai cloud hoặc sẵn sàng phục vụ khách hàng.

Đăng ký giáo viên tự phục vụ, tiếng Trung, sức chứa lớp, link Meet, chia sẻ giữa giáo viên và nhập scan là **yêu cầu mới, chưa triển khai**. [Basic Design dịch vụ](basic-design/teaching-service.md), [thiết kế kỹ thuật dự kiến](detail-design/teaching-service.md) và [tiêu chí nghiệm thu](testing/teaching-service.md) phân biệt phần có thể tái sử dụng và phần phải làm thêm.

Chưa làm: video call nội bộ, tự chấm mọi bài tự luận/viết tay, marketplace bán học liệu, thanh toán và ứng dụng di động riêng. Không dùng iframe Google Slides hay PPTX làm nguồn dữ liệu chính.

## Tiêu chí thành công

Hai giáo viên độc lập (Nhật và Trung) vận hành lớp riêng, không đọc được dữ liệu lớp nhau. Một lớp giới hạn 10 chỗ nhận đủ 10 học sinh và chặn người thứ 11 đúng cả khi vào đồng thời. Giáo viên dạy bằng slide qua Meet, chia sẻ bản sao cho đồng nghiệp, giao bài có chấm/tiến độ/nhắc học. Ảnh bài tập thử được chuyển thành câu tương tác sau duyệt; đo thời gian sửa so với nhập tay trước khi mở OCR rộng rãi.

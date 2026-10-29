# Masu — Tài liệu dịch vụ hỗ trợ giảng dạy

Masu hướng tới dịch vụ cho nhiều giáo viên: tạo lớp, trình chiếu và chia sẻ học liệu, bài tập, tiến độ và nhắc học; dạy video qua Google Meet bên ngoài. Tiếng Nhật N5 là nền đã có; tiếng Trung, đăng ký giáo viên, chia sẻ và nhập scan là phạm vi mới chưa triển khai. Đọc [tổng quan](00-overview.md) trước.

## Cách đọc

Định hướng dịch vụ ngày 29/10/2026: [Basic Design](basic-design/teaching-service.md), [DD dự kiến](detail-design/teaching-service.md), [tiêu chí nghiệm thu NOT RUN](testing/teaching-service.md). Đây là nguồn cho phạm vi mới, không phải kết quả đã triển khai.

Giai đoạn 2: [Basic Design](basic-design/phase-2.md), [Detail Design](detail-design/phase-2.md), [checklist](testing/phase-2.md), [biên soạn nội dung](content-authoring.md), [chuẩn bị staging](staging-setup.md).

Giai đoạn 3: [Basic Design](basic-design/phase-3.md), [Detail Design](detail-design/phase-3.md), [checklist](testing/phase-3.md).

Giai đoạn 4: [Basic Design](basic-design/phase-4.md), [Detail Design](detail-design/phase-4.md), [checklist](testing/phase-4.md).

Giai đoạn 5 (phần A — luyện nghe): [Basic Design](basic-design/phase-5.md), [Detail Design](detail-design/phase-5.md), [checklist](testing/phase-5.md).

Quy ước mã nguồn: [coding standards](coding-standards.md). Tên file và thư mục dùng tiếng Anh; ngôn ngữ nội dung tài liệu vẫn là tiếng Việt. Rule cho agent tại AGENTS.md ở thư mục gốc.

| File | Nội dung | Đọc khi nào |
|---|---|---|
| `00-overview.md` | Mục tiêu, người dùng, phạm vi | Đọc đầu tiên |
| `01-requirements.md` | Yêu cầu chức năng và phi chức năng | Trước khi chốt phạm vi |
| `02-architecture.md` | Stack công nghệ, kiến trúc hệ thống | Trước khi dựng dự án |
| `03-data-design.md` | Schema JSON nội dung và database | **Chốt trước khi code** |
| `04-screen-design.md` | Danh sách màn hình, luồng chính | Trong giai đoạn basic design |
| `05-slide-engine.md` | Cơ chế render và trình chiếu slide | Khi làm phần bài giảng |
| `06-audio.md` | Pipeline sinh, lưu và phát audio | Khi làm phần phát âm, luyện nghe |
| `07-exercises-and-grading.md` | Các dạng bài tập, logic chấm, báo cáo | **Chốt trước khi code** |
| `08-notifications.md` | Email nhắc bài và web push | Giai đoạn 4 trở đi |
| `09-roadmap.md` | Chia giai đoạn, thứ tự làm | Lập kế hoạch |
| `10-risks-costs-and-licenses.md` | Giấy phép dữ liệu, chi phí, rủi ro | **Đọc trước khi dùng dữ liệu mở** |
| `11-design-workflow.md` | Làm basic design / detail design đến đâu | Đọc cùng README |
| `12-ui-design.md` | Hệ màu, typography, nguyên tắc giao diện | Trước khi viết component đầu tiên |
| `basic-design/phase-1.md` | Basic Design: phạm vi, màn hình, hành vi và quyền | Trước triển khai giai đoạn 1 |
| `detail-design/phase-1.md` | Detail Design: module, dữ liệu, luyện và audio | Khi triển khai giai đoạn 1 |
| `testing/phase-1.md` | Truy vết yêu cầu và kết quả kiểm chứng | Khi review/nghiệm thu |
| `basic-design/phase-3.md` | Basic Design: lớp học, bài giao, làm bài, ôn tập, theo dõi | Trước triển khai giai đoạn 3 |
| `detail-design/phase-3.md` | Detail Design: RPC, API, chấm/nộp, FSRS, báo cáo | Khi triển khai giai đoạn 3 |
| `testing/phase-3.md` | Truy vết và kết quả kiểm chứng giai đoạn 3 | Khi review/nghiệm thu |
| `basic-design/phase-4.md`, `detail-design/phase-4.md`, `testing/phase-4.md` | Editor bài học, nhập CSV, email nhắc bài | Giai đoạn 4 |
| `basic-design/phase-5.md`, `detail-design/phase-5.md`, `testing/phase-5.md` | Luyện nghe: câu nghe/chính tả, player, audio cho nháp database, báo cáo nghe | Giai đoạn 5 |

## Nguyên tắc xuyên suốt

Một nguồn nội dung, nhiều cách hiển thị. Mỗi bài học là một khối JSON. Từ khối đó sinh ra slide trình chiếu, trang đọc, flashcard và bài tập. Sửa một từ vựng là sửa đúng một chỗ.

## Trạng thái tài liệu

Định hướng dịch vụ được cập nhật ngày 29/10/2026; các phần mới đều chưa triển khai. Nền local giai đoạn 1–4 và phần A giai đoạn 5 đã có mã nguồn; kết quả/giới hạn kiểm chứng xem checklist từng giai đoạn, chưa nghiệm thu cloud hoặc lớp học thật. Hướng dẫn khởi động tại README.md ở thư mục gốc.

Các quyết định trong tài liệu là đặc tả dự kiến, không phải tính năng đã hoàn thành. Phần nào đã triển khai thì cập nhật lại file tương ứng thay vì viết tài liệu mới. Mốc triển khai và tiêu chí nghiệm thu lấy theo `09-roadmap.md`; font, màu và kích thước lấy theo `12-ui-design.md`.

Đợt bổ sung này tập trung vào phiên bản nội dung, quyền truy cập, nộp bài, dữ liệu ôn tập và vận hành. Giá, quota, giấy phép và điều khoản dịch vụ trong tài liệu cũ chưa được kiểm chứng lại; phải xác minh từ nguồn chính thức trước khi chọn gói hoặc nhập dữ liệu bên ngoài.

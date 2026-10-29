# Rà soát và trạng thái bộ tài liệu

Ngày: 29/10/2026. Phạm vi công việc: **tài liệu thiết kế**, không coding, không đổi cấu hình dịch vụ thật, không apply migration/deploy. Các quyết định theo yêu cầu người dùng được đồng bộ ở bộ docs; các lựa chọn tích hợp cần thử nghiệm được giữ mở rõ ràng, không tự coi là đã giải quyết.

## Quyết định sản phẩm đã thống nhất

- Nền tảng nhiều giáo viên, có thể mở rộng nhiều môn; mốc đầu dạy tiếng Trung cho người Việt. Không triển khai đồng thời mọi môn.
- Giáo viên tự soạn/chịu trách nhiệm chuyên môn; Masu cung cấp công cụ, 4 mẫu và bộ minh họa nhỏ được giáo viên tiếng Trung duyệt.
- Luồng chọn mẫu → bảng chữ Hán/pinyin/nghĩa Việt → dựng slide → tạo/duyệt câu luyện → xem trước/xuất bản/giao lớp. Bắt đầu bài dễ, mục tiêu nhỏ; thử một giáo viên/một bài/một lớp.
- Dạy video qua Meet bên ngoài; không nhúng video hoặc coi presenter cùng trình duyệt là đồng bộ từ xa.
- Lớp riêng, ví dụ capacity 10; cùng tài khoản vừa dạy vừa học, giới hạn chỗ được khóa khi join.
- Chia sẻ version view/copy, bản sao độc lập giữ nguồn và quyền media; không chia sẻ học sinh/điểm/notes/test.
- Scan là nguồn nhập bổ sung; ảnh → draft → giáo viên duyệt → bài tương tác. Choice/fill trước, OCR sau luồng thủ công; không hứa tự chấm mọi tự luận/viết tay.
- Version/snapshot bất biến; điểm/feedback/membership/opt-in do server kiểm tra, không tin client hoặc làm lộ đáp án qua ảnh.

## Phạm vi rà soát theo file

Bảng gồm toàn bộ 35 file Markdown có sẵn trong docs. File rà soát này là file thứ 36; README gốc được rà riêng bên dưới. Nhãn “đã rà” mô tả tài liệu, không mô tả tính năng đã chạy.

| File | Nội dung đã đối chiếu/cập nhật |
|---|---|
| [00-overview.md](00-overview.md) | Định hướng nhiều giáo viên; ưu tiên Việt–Trung; giáo viên tự soạn, mẫu/bài dễ, phạm vi và trạng thái. |
| [01-requirements.md](01-requirements.md) | Nguồn yêu cầu SERVICE/LANG/SHARE/AUTHOR/SCAN; tách module Nhật khỏi MVP; NFR là mục tiêu cần đo. |
| [02-architecture.md](02-architecture.md) | Stack thực tế, biên quyền, version, grade server và provider/job mới; bỏ nhầm lẫn thư viện đã cài. |
| [03-data-design.md](03-data-design.md) | Nền v1 và mẫu v2 riêng; context ngôn ngữ, authoring_state private, snapshot; phân biệt bảng có migration và dự kiến. |
| [04-screen-design.md](04-screen-design.md) | Màn hình nền S/T và dịch vụ SV; wizard 5 bước, lớp/Meet, chia sẻ và review scan. |
| [05-slide-engine.md](05-slide-engine.md) | Renderer/version, self-host font, presenter riêng; template Trung/notes/PDF; import slide cũ ngoài MVP. |
| [06-audio.md](06-audio.md) | Pipeline Nhật hiện có so với job web Trung mới; locale/hash/quyền/duyệt/worker, không hứa quota/giá. |
| [07-exercises-and-grading.md](07-exercises-and-grading.md) | Choice/fill, practice/test, profile Trung giữ thanh/giản-phồn, điểm từ server và nội dung review. |
| [08-notifications.md](08-notifications.md) | Email opt-in/local đã có, quota nhiều giáo viên mới; không hứa push/miễn phí hoặc dùng open rate làm tiến độ. |
| [09-roadmap.md](09-roadmap.md) | Service A → B1 soạn mẫu → B2 chia sẻ → C1 nhập ảnh → C2 OCR → D chấm tay; nền phase cũ giữ lịch sử. |
| [10-risks-costs-and-licenses.md](10-risks-costs-and-licenses.md) | Hồ sơ quyền nội dung, dữ liệu riêng, ngân sách/quota/backup; bỏ giá và diễn giải giấy phép chưa xác minh. |
| [11-design-workflow.md](11-design-workflow.md) | Thứ tự nguồn quyết định; ranh giới tài liệu nghiệp vụ, thiết kế kỹ thuật và nghiệm thu. |
| [12-ui-design.md](12-ui-design.md) | UI Việt–Trung theo locale; bảng/pinyin/wizard/mobile, token/keyboard, dữ liệu thử ẩn danh. |
| [README.md](README.md) | Mục lục dịch vụ và cách đọc, dẫn audit, phân biệt thiết kế và bằng chứng local. |
| [basic-design/phase-1.md](basic-design/phase-1.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 1; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [basic-design/phase-2.md](basic-design/phase-2.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 2; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [basic-design/phase-3.md](basic-design/phase-3.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 3; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [basic-design/phase-4.md](basic-design/phase-4.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 4; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [basic-design/phase-5.md](basic-design/phase-5.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 5; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [basic-design/teaching-service.md](basic-design/teaching-service.md) | Luồng nghiệp vụ, vai/quyền, vòng đời, SV01–SV07; chọn mẫu/dạy bài nhỏ và retry/lỗi. |
| [coding-standards.md](coding-standards.md) | Quy ước tiếng Anh cho mã/file, ngôn ngữ nội dung theo khóa; không cần sửa thêm trong lượt audit. |
| [content-authoring.md](content-authoring.md) | Luồng 5 bước, 4 mẫu, giáo viên duyệt chuyên môn, giữ sửa tay, thử bài dễ trước scan. |
| [detail-design/phase-1.md](detail-design/phase-1.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 1; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [detail-design/phase-2.md](detail-design/phase-2.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 2; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [detail-design/phase-3.md](detail-design/phase-3.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 3; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [detail-design/phase-4.md](detail-design/phase-4.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 4; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [detail-design/phase-5.md](detail-design/phase-5.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 5; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [detail-design/teaching-service.md](detail-design/teaching-service.md) | Dữ liệu/quyền/job, review/template, API dự kiến, errors/CAS/idempotency, profile và rollout/backfill. |
| [staging-setup.md](staging-setup.md) | Tách nền Nhật và nghiệm thu dịch vụ; tài khoản thử, migrate/backup, class/font/audio/Meet/OCR/opt-in. |
| [testing/phase-1.md](testing/phase-1.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 1; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [testing/phase-2.md](testing/phase-2.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 2; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [testing/phase-3.md](testing/phase-3.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 3; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [testing/phase-4.md](testing/phase-4.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 4; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [testing/phase-5.md](testing/phase-5.md) | Giữ thiết kế/bằng chứng nền Nhật giai đoạn 5; thêm nhãn phạm vi và liên kết dịch vụ, không chuyển kết quả cũ thành nghiệm thu Việt–Trung. |
| [testing/teaching-service.md](testing/teaching-service.md) | SV/AU/CT và truy vết yêu cầu; toàn bộ chức năng dịch vụ mới vẫn NOT RUN. |

[README gốc](../README.md) mô tả trạng thái code/local và dẫn thiết kế dịch vụ; giữ lệnh chạy hiện có, không đổi sang lệnh API v2 chưa tồn tại. [AGENTS.md](../AGENTS.md) giữ workflow/identity và ưu tiên Việt–Trung. Chưa sửa runtime hoặc dependencies.

## Truy vết phạm vi dịch vụ

| Nhóm yêu cầu | Tài liệu hành vi/hợp đồng | Ca nghiệm thu mới |
|---|---|---|
| AUTH-01, SERVICE-01/02 | BD quyền/onboarding, DD backfill/API, 02/03 | SV-01–04, SV-23, CT-04/06 |
| CLASS-08/09 | BD lớp/Meet, DD khóa capacity/settings/membership | SV-05–08, CT-09 |
| LANG-01 | 03 v2, 06 locale, 07 profile Trung, 12 UI | SV-09/10/26, CT-01–03/07 |
| SHARE-01/02 | BD view/copy, DD grant/media/provenance/API | SV-11–14, AU-07, CT-05 |
| SCAN-01–03 | BD scan, DD storage/job/review/retention, 10 | SV-15–21/25, CT-05/08 |
| GRADE-01 | 07, DD pending_review dự kiến Service D | SV-22; chấm tay chỉ nghiệm thu khi triển khai riêng |
| OPS-01/02 | 08/10, DD rollout/quota, staging-setup | SV-24, CT-04–09 |
| AUTHOR-01–08 | content-authoring, BD SV07, DD template/review/CAS | AU-01–09, CT-01–03/09 |

Yêu cầu module Nhật và kết quả nền vẫn truy vết ở phase-1–5. Không lấy PASS trong phase cũ làm bằng chứng các ca SV/AU/CT.

## Các quyết định còn mở trước tích hợp thật

| Điểm mở | Phạm vi đã chốt | Cần làm để đóng, chưa phải lý do dừng viết docs |
|---|---|---|
| Font/voice Trung | Đúng locale, giữ dấu pinyin, nghe/nhìn duyệt; không fallback Nhật | Chọn font/voice có giấy phép phù hợp, kiểm tra nét/phát âm và tải trên thiết bị thật trước B1 |
| TTS web/worker và OCR provider | Job nền có quota/lease/review, storage private; OCR ở C2 | Benchmark bộ tệp được phép dùng, ngân sách/trang và điều khoản xử lý dữ liệu trước bật provider |
| Schema/API thực thi | V1 giữ nguyên, v2 có context/profile, CAS và requestId | Viết migration/validator/API chi tiết với limit byte/rate từng endpoint và kiểm chứng từ dữ liệu cũ trước code tương ứng |
| Giản/phồn và bộ nội dung mẫu | Bài chọn profile rõ, giáo viên cung cấp/duyệt, không áp mặc định từ UI Việt | Chốt với giáo viên thử nghiệm và quyền dùng tài liệu, chưa tự biên soạn cả giáo trình |
| Gói hosting/email/storage | Không hứa free tier, có quota/backup và thử khôi phục | Hồ sơ gói/region/giá/cron/điều khoản chính thức trước mở dịch vụ; chưa mua hoặc bật tính phí |
| Chấm tay/thi chuẩn hóa/thu phí | Ngoài MVP theo Service D hoặc thiết kế riêng | Làm DD và nghiệp vụ riêng khi mở phạm vi, không thêm âm thầm vào soạn bài |

## Kiểm tra và giới hạn kết luận

Rà các liên kết nội bộ/fence/JSON minh họa, parser Markdown, tính thống nhất v1/v2 và truy vết yêu cầu dịch vụ. Bộ code checks chạy để đáp ứng quy ước repo, không tạo bằng chứng cho chức năng mới. Không chạy E2E/build cho đợt chỉ sửa Markdown và không đánh dấu ca sản phẩm mới đã đạt.

Bộ tài liệu bao phủ phạm vi nghiệp vụ/thiết kế đã chốt ở mức toàn hệ thống. Chi tiết triển khai từng API, provider và kết quả thử nghiệm còn mở như bảng trên; không gọi đây là đã hoàn thành tích hợp hoặc đã nghiệm thu lớp thật. Khi quyết định thay đổi phải cập nhật đồng thời requirement/BD/DD/checklist thay vì thêm ghi chú mâu thuẫn ở file mới.

## Kết quả kiểm tra đợt tài liệu

- Parser Markdown qua trên 36 file docs, README gốc và AGENTS.md, có bỏ ignore docs của formatter để thực sự đọc nội dung.
- 206 liên kết/anchor nội bộ và 2 khối JSON minh họa hợp lệ; mọi file docs được liệt kê trong bảng rà soát.
- Kết quả PASS/Chưa chạy/Chờ cấu hình ở 15 tài liệu phase được đối chiếu Git và giữ nguyên.
- npm run check qua: format code, ESLint, typecheck và 70 tests nền. Không chạy chức năng dịch vụ mới; SV/AU/CT giữ NOT RUN.

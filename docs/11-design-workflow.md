# Quy trình thiết kế — 基本設計・詳細設計

## Quyết định

Làm Basic Design toàn hệ thống và Detail Design theo từng giai đoạn chuẩn bị triển khai. Thay thế chủ trương trước đây chỉ viết DD cho schema và chấm điểm.

BD mô tả hành vi người dùng, màn hình, nghiệp vụ, quyền và kiến trúc tổng thể. DD mô tả hợp đồng dữ liệu/API, module, thuật toán, validation, trạng thái và xử lý lỗi đủ để lập trình và kiểm thử. Không cần tách tài liệu cho mỗi component nhỏ.

| Tầng | Nguồn |
|---|---|
| Yêu cầu | 00, 01 |
| BD toàn hệ thống | 02, 04, 09, 12 |
| BD giai đoạn 1 | [basic-design/phase-1.md](basic-design/phase-1.md) |
| DD dùng chung | 03, 05, 06, 07, 08 |
| DD giai đoạn 1 | [detail-design/phase-1.md](detail-design/phase-1.md) |
| BD/DD giai đoạn 2–5 | [phase-2](basic-design/phase-2.md), [phase-3](basic-design/phase-3.md), [phase-4](basic-design/phase-4.md), [phase-5](basic-design/phase-5.md); DD tương ứng trong detail-design/ |
| Truy vết và nghiệm thu | [testing/phase-1.md](testing/phase-1.md), [phase-2](testing/phase-2.md), [phase-3](testing/phase-3.md), [phase-4](testing/phase-4.md), [phase-5](testing/phase-5.md) |

## Luồng làm việc

1. Chốt phạm vi và yêu cầu có ID.
2. Viết BD: màn hình, bố cục, luồng chính/ngoại lệ, quy tắc, quyền.
3. Viết DD: dữ liệu, module/API nếu cần, validation, trạng thái, lỗi và điều kiện chạy.
4. Rà soát yêu cầu → BD → DD → testcase, ghi điểm chưa kiểm chứng. Quyết định đã được giao triển khai không cần xin lại chỉ vì chuyển từ tài liệu sang code.
5. Triển khai; thay đổi hợp đồng thì sửa tài liệu cùng mã nguồn.
6. Chạy kiểm tra phù hợp, ghi kết quả thật. Chỉ nghiệm thu khi đủ tiêu chí.

## Nguồn quyết định

09 quyết định mốc triển khai; 01 mức quan trọng; 04 khớp mốc màn hình. 03 dữ liệu dùng chung; 07 chấm/nộp; 12 token UI. DD giai đoạn chi tiết hóa, không đặt quy tắc mâu thuẫn.

Phiên bản dependency lấy từ package.json và lockfile. Mỗi phạm vi có một bản BD/DD cập nhật tại chỗ. Thay đổi lớn sau dạy thử phải cập nhật tác động; lỗi thiết kế được sửa ngay khi phát hiện. Giai đoạn 1 hoàn thiện BD/DD trước code. BD/DD nền giai đoạn 1–5 có tài liệu riêng và bằng chứng local tương ứng; dịch vụ Việt–Trung là thiết kế chưa triển khai, giai đoạn 6 ngoài MVP. Các lựa chọn provider/voice/font/gói cần hồ sơ quyết định trước tích hợp thật.

## Thiết kế dịch vụ ngày 29/10/2026

[BD dịch vụ](basic-design/teaching-service.md), [DD dự kiến](detail-design/teaching-service.md) và [checklist](testing/teaching-service.md) bổ sung mô hình nhiều giáo viên, đa ngôn ngữ, chia sẻ và scan. 00/01/09 đã điều chỉnh phạm vi tương ứng. BD/DD phase-1 đến phase-5 mô tả nền N5 đã triển khai; không coi chúng là bằng chứng cho tính năng dịch vụ mới.

DD dịch vụ ghi rõ các hợp đồng dự kiến và quyết định kỹ thuật còn phải chốt trước từng lát triển khai; chưa có migration hoặc thay đổi runtime trong đợt tài liệu này. Theo thứ tự Service A → B1 (soạn theo mẫu, dạy bài dễ) → B2 (chia sẻ/dùng lại) → C1 → C2, không xây OCR hoặc video trước luồng vận hành lớp. Hợp đồng soạn theo mẫu xem [biên soạn](content-authoring.md) và các phần bổ sung AUTHOR-01–08 trong BD/DD/checklist dịch vụ.

## Thứ tự ưu tiên khi đọc tài liệu

00/01 chốt sản phẩm Việt–Trung; BD dịch vụ và content-authoring chốt trải nghiệm; 09 chốt thứ tự Service A/B1/B2/C1/C2/D. 03/05/06/07/08/12 và DD dịch vụ chốt hợp đồng dùng chung, khác biệt v1/v2 phải được ghi rõ. Phase-1 đến phase-5 giữ bằng chứng nền Nhật, không ghi đè quyết định dịch vụ mới.

Nếu có khác biệt, sửa đồng thời hợp đồng/BD/DD/checklist trước code; không im lặng chọn một bản. Kết quả audit và lựa chọn còn mở ở [documentation-review.md](documentation-review.md). Hoàn tất tài liệu theo phạm vi đã chốt không đồng nghĩa mọi quyết định nhà cung cấp hoặc thông số từng API đã được xác minh.

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
| Truy vết và nghiệm thu | [testing/phase-1.md](testing/phase-1.md) |

## Luồng làm việc

1. Chốt phạm vi và yêu cầu có ID.
2. Viết BD: màn hình, bố cục, luồng chính/ngoại lệ, quy tắc, quyền.
3. Viết DD: dữ liệu, module/API nếu cần, validation, trạng thái, lỗi và điều kiện chạy.
4. Rà soát yêu cầu → BD → DD → testcase, ghi điểm chưa kiểm chứng. Quyết định đã được giao triển khai không cần xin lại chỉ vì chuyển từ tài liệu sang code.
5. Triển khai; thay đổi hợp đồng thì sửa tài liệu cùng mã nguồn.
6. Chạy kiểm tra phù hợp, ghi kết quả thật. Chỉ nghiệm thu khi đủ tiêu chí.

## Nguồn quyết định

09 quyết định mốc triển khai; 01 mức quan trọng; 04 khớp mốc màn hình. 03 dữ liệu dùng chung; 07 chấm/nộp; 12 token UI. DD giai đoạn chi tiết hóa, không đặt quy tắc mâu thuẫn.

Phiên bản dependency lấy từ package.json và lockfile. Mỗi phạm vi có một bản BD/DD cập nhật tại chỗ. Thay đổi lớn sau dạy thử phải cập nhật tác động; lỗi thiết kế được sửa ngay khi phát hiện. Giai đoạn 1 hoàn thiện BD/DD trước code. Chưa coi BD chi tiết màn hình giai đoạn 2–6 là hoàn thành.

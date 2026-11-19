# Basic Design — Luyện đề JLPT

Ngày 19/11/2026. Người dùng muốn một chỗ "vào là luyện đề", xem được mọi đề: đề chính thức các năm, đề Reng tự soạn, đề thi thử. Hai lựa chọn của người dùng:
- **Giáo viên mở đề** (không đổi database), thay vì học viên tự mở đề.
- **Soạn thêm 3 đề N5**, vì N5 chưa có đề Reng nào.

## Màn hình `/exams` (Luyện đề)

Mọi tài khoản đã đăng nhập; mục **Luyện đề** ở thanh đầu trang. Không cho máy tìm kiếm thu thập (`PRIVATE_PATHS`).

- Mỗi lớp tiếng Nhật của người dùng có một mục; lớp không có đề và không có nguồn đề thì không hiện.
  - Lớp đang học và lớp tự học: bảng **đề đã mở** gồm tên, loại (Đề chính thức / Đề Reng / Đề thi thử) kèm cấp, số phút, hạn bắt đầu và kết quả.
    - Chưa làm: **Làm đề**. Đang làm: **Làm tiếp**. Hết hạn bắt đầu: ghi rõ.
    - Đã nộp: điểm ước tính /180, "Ước tính đỗ" hoặc lý do chưa đỗ, và **Xem kết quả**. Chưa tới lúc công bố điểm thì ghi "Đã nộp, chờ công bố điểm".
  - Lớp mình dạy: cùng bảng, thay kết quả bằng link tới bài nộp của lớp.
- Lớp mình làm chủ (lớp tự học hoặc lớp dạy) có thêm **Thư viện đề của lớp**, gồm các bài lớp ghim mà ghép được trọn đề:
  - **Đề chính thức** (sách 2012, 2018 trên jlpt.jp): một đề, nút **Mở đề này**; đã mở thì ghi "Đã mở cho lớp".
  - **Ngân hàng viết theo dạng đề** (mọi câu có nhãn dạng như `kanji-reading`, câu nghe có `jlpt:n5`/`jlpt:n4` và `section:n`): tên đề kế tiếp "Đề Reng N5 số k", số đề còn ghép được mà không trùng câu với các đề trước của lớp, nút **Mở đề này**. Hết câu mới vẫn mở được; đề mới lặp câu ra ít nhất.
- Mở đề: đúng cấp của nguồn, số phút theo cấp (N5 90, N4 115), công bố điểm ngay sau khi nộp. Hạn bắt đầu 23:59 sau 30 ngày (lớp tự học) hoặc 7 ngày (lớp dạy). Dùng lại `publishJlptExam`. Xong thì quay về trang với thông báo, hoặc thông báo lỗi.
- Lớp tự học: chủ lớp là học viên duy nhất, nên mở đề xong làm luôn được. Lớp dạy: chủ lớp mở, học viên thấy đề ở trang Luyện đề của mình.

## Đề Reng đúng cấu trúc đề thật

- Ngân hàng viết theo dạng đề, đủ câu cho mọi dạng của cấp (`fillsJlptTest`), cho ra đề đúng số câu và thứ tự như đề thật (`composeJlptExam`, `jlptTestParts`):
  - **N4: 85 câu.** Từ vựng 7/5/8/4/4; ngữ pháp và đọc hiểu 13/4/4/3/3/2; nghe 8/7/5/8.
  - **N5: 67 câu.** Từ vựng 7/5/6/3; ngữ pháp và đọc hiểu 9/4/4/2/2/1; nghe 7/6/5/6.
- Mỗi dạng chọn câu chưa ra ở các đề trước của lớp. Câu cùng đoạn văn đi liền nhau.
- Ngân hàng thiếu một dạng thì quay về cách cũ (`JLPT_PRESETS`: N5 25/20/20, N4 25/25/20).
- Form **Thi thử JLPT** ở trang Giao bài xem trước đúng con số này.

| Cấp | Đề chính thức | Đề Reng (không trùng câu) |
|---|---|---|
| N4 | 2012 (97 câu), 2018 (98 câu) | 2 đề từ ngân hàng hằng ngày; thêm 2 đề chuẩn và 2 đề nâng cao ở ngân hàng riêng (19/11/2026, [kiểm chứng](../testing/n4-reng-exams-2026-11-19.md)) |
| N5 | 2012 (89 câu), 2018 (91 câu) | 3 đề (ngân hàng mới `n5-jlpt-mock.json`) |

## Không làm

- Học viên tự mở đề ở lớp mình không làm chủ: cần thêm migration. Người dùng chọn để giáo viên mở.

Chi tiết dữ liệu ngân hàng N5 ở [soạn nội dung](../content-authoring.md#đề-reng-n5-theo-cấu-trúc-đề--19112026); kiểm chứng ở [báo cáo](../testing/exam-center-2026-11-19.md).

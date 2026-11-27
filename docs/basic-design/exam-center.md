# Basic Design — Luyện đề JLPT

Ngày 19/11/2026. Người dùng muốn một chỗ "vào là luyện đề", xem được mọi đề: đề chính thức các năm, đề Reng tự soạn, đề thi thử. Hai lựa chọn của người dùng:

- **Giáo viên mở đề** (không đổi database), thay vì học viên tự mở đề.
- **Soạn thêm 3 đề N5**, vì N5 chưa có đề Reng nào.

## Màn hình `/exams` (Luyện đề)

Mọi tài khoản đã đăng nhập; mục **Luyện đề** ở thanh đầu trang. Không cho máy tìm kiếm thu thập (`PRIVATE_PATHS`).

- Mỗi lớp tiếng Nhật của người dùng có một mục; lớp không có đề và không có nguồn đề thì không hiện.
  - Lớp đang học và lớp tự học: bảng **đề đã mở** gồm tên, loại (Đề chính thức / Đề Reng / Đề thi thử) kèm cấp, số phút, giờ đóng đề (cột "Đóng lúc", trước 26/11/2026 ghi "Hạn bắt đầu") và kết quả.
    - Chưa làm: **Làm đề**. Đang làm: **Làm tiếp**. Quá giờ đóng hoặc giáo viên đã bấm Đóng bài: "Đề đã đóng" (từ 26/11/2026 xét cả Đóng bài).
    - Đã nộp: điểm ước tính /180, "Ước tính đỗ" hoặc lý do chưa đỗ, và **Xem kết quả**. Chưa tới lúc công bố điểm thì ghi "Đã nộp, chờ công bố điểm".
  - Lớp mình dạy: cùng bảng, thay kết quả bằng link tới bài nộp của lớp.
- Lớp mình làm chủ (lớp tự học hoặc lớp dạy) có thêm **Thư viện đề của lớp**, gồm các bài lớp ghim mà ghép được trọn đề:
  - **Đề chính thức** (sách 2012, 2018 trên jlpt.jp): một đề, nút **Mở đề này**; đã mở thì nút ẩn.
  - **Ngân hàng viết theo dạng đề** (mọi câu có nhãn dạng như `kanji-reading`, câu nghe có `jlpt:n5`/`jlpt:n4` và `section:n`): tên đề kế tiếp "Đề Reng N5 số k", nút **Mở đề này**. Đề ghép không trùng câu với các đề trước của lớp; hết câu mới vẫn mở được, đề mới lặp câu ra ít nhất.
  - **Không chú thích (27/11/2026, người dùng yêu cầu):** mỗi dòng chỉ có tên đề và nút, không ghi nguồn, "Đề trọn bộ", "Đã mở cho lớp" hay số đề còn ghép được. Đầu trang chỉ có tiêu đề "Luyện đề JLPT"; mục Bản in đề JLPT chỉ ghi số câu dưới tên đề. Còn giữ một dòng cảnh báo khi bài nguồn đang mở với học viên (lớp dạy). Bìa bản in vẫn ghi nguồn theo điều kiện dùng của jlpt.jp.
- Mở đề: đúng cấp của nguồn, số phút theo cấp (N5 90, N4 115), công bố điểm ngay sau khi nộp. Giờ đóng đề 23:59 sau 30 ngày (lớp tự học) hoặc 7 ngày (lớp dạy). Dùng lại `publishJlptExam`. Xong thì trang cuộn tới đúng lớp đó: thông báo ngay dưới tên lớp ("Đã mở đề mới…" ở lớp mình học; ở lớp mình dạy thì báo đã mở cho lớp, vì giáo viên không có nút Làm đề) và dòng đề mới tô nền. Lỗi thì thông báo ở đầu trang.
- Bấm **Mở đề này** một lần chỉ mở một đề: trong lúc chờ nút ghi "Đang mở…" và bị khoá, bấm đúp không mở thêm đề.
- Lớp tự học: chủ lớp là học viên duy nhất, nên mở đề xong làm luôn được. Lớp dạy: chủ lớp mở, học viên thấy đề ở trang Luyện đề của mình.

## Bố cục (kiểm tra UI 19/11/2026)

- Máy tính (từ 1100 px): bảng của mọi lớp chung độ rộng cột, nên trang dài vẫn dò thẳng một cột. Loại, số phút, giờ đóng đề không xuống dòng.
- Cột kết quả: điểm /180 in đậm, kết luận và lý do chữ nhỏ bên dưới, **Xem kết quả** bên phải.
- Điện thoại: mỗi đề một khối, gồm tên đề, một dòng "Loại · số phút · Hạn bắt đầu …", rồi kết quả.

## Đề Reng đúng cấu trúc đề thật

- Ngân hàng viết theo dạng đề, đủ câu cho mọi dạng của cấp (`fillsJlptTest`), cho ra đề đúng số câu và thứ tự như đề thật (`composeJlptExam`, `jlptTestParts`):
  - **N4: 85 câu.** Từ vựng 7/5/8/4/4; ngữ pháp và đọc hiểu 13/4/4/3/3/2; nghe 8/7/5/8.
  - **N5: 67 câu.** Từ vựng 7/5/6/3; ngữ pháp và đọc hiểu 9/4/4/2/2/1; nghe 7/6/5/6.
- Mỗi dạng chọn câu chưa ra ở các đề trước của lớp. Câu cùng đoạn văn đi liền nhau.
- Ngân hàng thiếu một dạng thì quay về cách cũ (`JLPT_PRESETS`: N5 25/20/20, N4 25/25/20).
- Form **Thi thử JLPT** ở trang Giao bài xem trước đúng con số này.

| Cấp | Đề chính thức | Đề Reng (không trùng câu) |
| --- | --- | --- |
| N4 | 2012 (97 câu), 2018 (98 câu) | 2 đề từ ngân hàng hằng ngày; thêm 2 đề chuẩn và 2 đề nâng cao ở ngân hàng riêng (19/11/2026, [kiểm chứng](../testing/n4-reng-exams-2026-11-19.md)) |
| N5 | 2012 (89 câu), 2018 (91 câu) | 3 đề (ngân hàng mới `n5-jlpt-mock.json`) |

## Bộ đề có bản in — 23/11/2026

Người dùng muốn mỗi cấp N5, N4 có 3 đề hoàn chỉnh, làm được trên Reng và in ra giấy được, ưu tiên đề đã từng thi có nguồn hợp pháp ([prompt](../prompts/jlpt-exam-sets.md)).

| Cấp | Đề 1 | Đề 2 | Đề 3 |
| --- | --- | --- | --- |
| N5 | Đề chính thức tập 2018 (91 câu) | Đề chính thức tập 2012 (89 câu) | Đề thi thử Reng N5 số 1 (67 câu, từ `n5-jlpt-mock.json`) |
| N4 | Đề chính thức tập 2018 (98 câu) | Đề chính thức tập 2012 (97 câu) | Đề thi thử Reng N4 số 1 (85 câu, từ `n4-jlpt-mock-standard.json`) |

- Rà lại nguồn trên mạng ngày 23/11/2026: jlpt.jp vẫn chỉ có hai tập đề chính thức; 問題例 2009 chỉ là câu mẫu (N5 29, N4 34 câu, dạng đề trước 2010), không đủ một đề. Vì vậy Đề 3 là đề thi thử Reng.
- **Đề thi thử Reng cố định:** ghi sẵn danh sách câu trong `content/jlpt/reng-exam-sets.json`, đúng cấu trúc `jlptTestParts`, giữ mã câu của ngân hàng. Tên đề "Đề thi thử Reng N5 số 1", không ghi tháng năm thi, không gọi là đề thi cũ.
  - Lớp ghim ngân hàng chứa đủ câu của đề thì Thư viện đề có thêm dòng đề cố định, nút **Mở đề này** (mở một lần) và link **Bản in**.
  - Câu của đề cố định tính là đã ra: số đề còn ghép được của ngân hàng giảm, và đề Reng ghép sau không lặp câu. Số thứ tự "Đề Reng N5 số k" của ngân hàng không tính đề cố định.
  - Phần nghe N5 lấy từ 32 câu nghe mới (41–72), vì 40 câu nghe đầu cũng nằm trong ngân hàng ôn hằng ngày của lớp Minna.
- **Bản in** (`/exams/print/<mã đề>`): chỉ giáo viên đang làm chủ một lớp tiếng Nhật còn hoạt động mở được, vì bản in có đáp án. Học viên thấy thông báo, không thấy đề. Bản in không đổi lịch mở hay đóng đề của lớp.
  - Bốn tập: **Đề** và **Phiếu trả lời** cho học viên; **Đáp án và giải thích**, **Lời thoại nghe** cho giáo viên.
  - A4 dọc, đen trắng. Mỗi phần thi (言語知識（文字・語彙）, 言語知識（文法）・読解, 聴解) bắt đầu trang mới, ghi số phút như đề thật. Không cắt một câu hay một đoạn đọc qua hai trang.
  - Đầu tập ghi cấp, tên đề, thời gian và dòng nguồn: 出典 jlpt.jp cho đề chính thức, "Đề thi thử do Reng biên soạn, không phải đề thi thật." cho đề Reng.
  - Câu nghe có mã QR tới file MP3 của câu; tập Lời thoại nghe có thêm link và, với đề chính thức, link bản ghi âm gốc trên jlpt.jp.
  - Nút **In / Lưu PDF** mở hộp thoại in của trình duyệt.
- Trang Luyện đề có mục **Bản in đề JLPT** (giáo viên và chủ lớp). Mục "Đề mẫu chính thức trên mạng" (link tới jlpt.jp) đã bỏ ngày 27/11/2026 theo yêu cầu người dùng.
- **Đề nào cũng có bản in (27/11/2026):** danh sách Bản in đề JLPT có thêm hai đề N4 trọn bộ (07/2025, 12/2025; thứ tự: đề jlpt.jp, đề trọn bộ, đề Reng). Ở Thư viện đề, dòng đề jlpt.jp và đề trọn bộ có link Bản in như đề Reng cố định; ngân hàng ghép đề thì không, vì mỗi lần ghép ra đề khác. Trong danh sách đề đã mở của lớp, chủ lớp có link Bản in cạnh tên mọi đề, kể cả đề ghép: in đúng các câu lớp đã làm. Bìa đề trọn bộ không có dòng nguồn hay dòng "đề thi thử Reng".
- Hướng dẫn in ở [/guide](../../app/guide/page.tsx), mục "In đề JLPT ra giấy".

## Đề JLPT N4 tháng 07/2025 — 27/11/2026

Cùng ngày có thêm đề tháng 12/2025, làm giống hệt (thiếu 文字・語彙 câu 6–10 do ảnh đề không có).

Người dùng đưa một đề N4 trọn bộ (câu hỏi, đáp án, ảnh trang đề và file nghe MP3) và muốn giao cho lớp của mình.

- Đề vào Reng như đề chính thức: một bài riêng, làm một lượt, đủ mọi câu theo thứ tự đề, có giờ như đề thật. Tên trong Thư viện đề là tên bài ("Đề JLPT N4 tháng 07/2025"), loại "Đề thi thử" trong danh sách đề.
- Phần nghe phát bản ghi âm gốc, mỗi câu một đoạn; học viên thấy lời thoại sau khi trả lời như các câu nghe khác.
- Chưa có bản in A4 cho đề này (bản in chỉ có ở các đề trong mục Bản in đề JLPT).
- Dữ liệu và cách nạp ở [soạn nội dung](../content-authoring.md#đề-jlpt-n4-tháng-072025-27112026).

## Không làm

- Học viên tự mở đề ở lớp mình không làm chủ: cần thêm migration. Người dùng chọn để giáo viên mở.

Chi tiết dữ liệu ngân hàng N5 ở [soạn nội dung](../content-authoring.md#đề-reng-n5-theo-cấu-trúc-đề--19112026); kiểm chứng ở [báo cáo](../testing/exam-center-2026-11-19.md).

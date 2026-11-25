# Kiểm tra lại bộ đề JLPT có bản in — 25/11/2026

Kiểm tra lần hai sau [đợt 23/11](jlpt-exam-sets-2026-11-23.md): giao diện Luyện đề, bản in và làm đề cố định bằng thao tác thật, rồi rà lại nguồn đề trên mạng.

## Giao diện

Chạy trên Supabase local (container `supabase_*_reng`) và `next dev`. Hai ngân hàng `n5-jlpt-mock` và `n4-jlpt-mock-standard` được nạp vào một lớp của `teacher@reng.local` bằng `npm run bank:sql -- --class … --commit`. Script Playwright nằm ngoài repo.

**Giáo viên, 1280/1440/1920 rồi 390:**
- Thư viện lớp có 4 dòng: hai đề cố định, mỗi dòng có Bản in và Mở đề này, cùng hai dòng ghép từ ngân hàng.
- Mở hai đề cố định:
  - thông báo hiện trong lớp, đề vào bảng;
  - dòng thư viện còn Bản in, mất nút mở;
  - ngân hàng giảm một đề.
- Danh sách Bản in đề JLPT có 24 link (6 đề × 4 tập). Mọi tập trả 200, số câu, mã QR, ô tô và dòng đáp án khớp dữ liệu. Không có phương án hay câu trống, không lộ cú pháp `{漢字|かな}` hay `[[…]]`, không có ảnh hỏng.
- Tab giữa các tập đổi `?booklet=` và `aria-current`. Nút In / Lưu PDF gọi `window.print()`. Tab bàn phím đi đúng thứ tự.
- Trường hợp đặc biệt:
  - mã đề lạ trả 404;
  - `?booklet=` lạ về tập Đề.
- axe 0 lỗi ở mọi trang, sáng và tối. Không tràn ngang ở 390, không lỗi console.

**Học viên (`hoc.vien@reng.local`), vào lớp bằng mã:**
- Không thấy mục Bản in.
- Làm Đề thi thử Reng N5 số 1 ở 1280:
  - 67 câu, chế độ Cả bài;
  - nghe hai câu: MP3 trả 206, nút khóa sau một lần nghe;
  - nộp bài qua bước Xác nhận nộp.
  - Trang kết quả chia điểm theo 3 phần và ước tính trên 180.
- Làm Đề thi thử Reng N4 số 1 ở 390: 85 câu theo từng câu bằng nút Câu sau, rồi nộp bài.
- axe 0 lỗi.

**PDF:** 24 tập đều khổ A4, số câu và đáp án khớp, tập học viên không có đáp án.

### Lỗi tìm thấy và đã sửa

| Lỗi | Sửa |
|---|---|
| Bìa và đầu mỗi phần của bản in ghi "Đề 3: Đề thi thử Reng N5 số 1" / "JLPT N5 · Đề 3": trên giấy thành hai số cho một đề | Bìa và đầu phần chỉ ghi tên đề; số Đề 1–3 giữ ở danh sách Bản in đề JLPT (`app/exams/print/[examId]/page.tsx`) |
| Đề Reng N4, もんだい６: tờ thông tin thuê xe ở cuối trang 9, câu 29 sang một mình trang 10 | `.exam-print-passage-block { break-inside: avoid }` khi in: đoạn đọc vừa một trang giữ mọi câu của nó cùng trang; tờ thông tin và câu 28, 29 nay chung trang 11 |
| Trên điện thoại (≤600px) vẫn hiện nút Từng câu / Cả bài, nửa khuất dưới thanh Nộp bài. Bấm Cả bài nút đổi trạng thái nhưng đề vẫn từng câu. Lỗi có từ trước đợt này: luật ẩn trong `@media` đứng trước luật `display: inline-flex` nên bị đè | Chuyển luật ẩn xuống sau luật gốc trong `app/styles/learner.css`; 390px tính ra `display: none`, 1280px vẫn `inline-flex` |

Do `break-inside` mới, vài tập đề dài thêm 1 trang vì đoạn văn không còn bị cắt ngang (đề Reng N4 13 → 14 trang, N5 2018 19 → 20).

Không phải lỗi:
- Trang /guide có `{漢字|かんじ}`: đó là hướng dẫn cú pháp furigana.
- Câu 43 đề Reng N5 có phương án ①③④⑤: đó là các món trong tờ thực đơn, giống đề thật.

## Nguồn trên mạng

Kết quả ở `content/jlpt/source-audit-2026-11-25.json`. Một agent đã:
- dùng 36 từ khóa mới;
- gửi 114 yêu cầu HEAD;
- xét 32 nguồn.

Agent chỉ đọc metadata: không tải PDF hay MP3, không chép câu hỏi, không vượt trang chống bot.

- **Link chính thức không đổi.** Mọi file Reng ghi đều trả 200 với cùng ngày sửa và cỡ file như 23/11:
  - 44 file N4/N5 của hai tập đề;
  - 20 file 問題例 2009;
  - 2 file ZIP cho giáo viên;
  - 16 `audioUrl`.
- **jlpt.jp không có gì mới:**
  - không có 第三集;
  - chính sách `policy.html` sửa lần cuối 02/02/2026, mục 1(4) giữ nguyên;
  - trang JLPT Practice Test (24/11) chỉ thông báo sau kỳ thi cho N1–N3.
- **Audio 問題2 tập 2012.** Trang ja và en đều đặt link 問題2 của mọi cấp tới `samples/sample2017/mp3/N?Q2.mp3` (10/05/2017):
  - N5 nặng 8,5 MB, N4 nặng 12,9 MB.
  - Reng vẫn trỏ file 2012 (N5 6 câu, N4 7 câu); file này còn mở được.
  - Trang vẫn ghi cỡ file 2012, script PDF vẫn bản 2012, không có thông báo giải thích.
  - Cần một người nghe so sánh trước khi đổi link.
- **Đổi đánh giá trong `external-source-catalog.json`.** Bộ nhãn mới có 4 mức, ghi ở trường `verdicts`: `official-usable-with-credit`, `link-only`, `ask-permission`, `do-not-use`.
  - jpnotes.dev: trang `/terms/` mới (24/11) ghi rõ câu hỏi và audio theo CC BY-NC 4.0. Nhãn chuyển sang `ask-permission`: còn phải quyết Reng có tính là phi thương mại không.
  - jlptsensei: vẫn bị chặn bằng trang chống bot, không đọc được điều khoản, nên `do-not-use`.
  - safa-lang, kanji.vn: `link-only`.
  - Sách luyện thi trả phí và trang ghi "all rights reserved": `do-not-use` cho việc dùng lại.
  - Link Bonjinsha và catalogue ASK đã chuyển địa chỉ; đã sửa.
- **Nguồn mới:**
  - JLPTSuccess (GitHub): 28 đề N5 tự soạn, giấy phép CC BY-SA 4.0 nhưng file N4 ghi CC BY 4.0, mâu thuẫn. Không có đề nghe N5. Nhãn `ask-permission`.
  - Quiz nghe TMU mic-J (N4, dạng cũ): dùng miễn phí cho giáo dục phi lợi nhuận nhưng yêu cầu email báo trường. Nhãn `ask-permission`.
  - OpenExamPrep, Coto Academy, Nihongo-Pro: `link-only`.
  - Migii: `do-not-use`.
- **Đơn vị tổ chức thi ở Việt Nam** không công bố đề mẫu: JF Hà Nội, ĐH Ngoại ngữ Đà Nẵng, Huế, ULIS, HANU.

## Đề thi thật từ trước đến nay

Người dùng muốn có đề JLPT thật N5, N4 qua các năm. Một agent tìm các đường hợp pháp, chỉ đọc metadata, không mở đề hay đáp án. Kết quả ở `content/jlpt/real-past-papers-2026-11-25.json`.

- **Chính sách:** FAQ của jlpt.jp ghi rằng đề mỗi kỳ không được in nguyên bộ thành sách.
  - Hai tập 公式問題集 (2012, 2018) gồm các câu đã thật sự ra thi sau năm 2010, mỗi tập đủ một đề. Reng đã có cả hai.
  - FAQ hứa sẽ phát hành tập mới theo định kỳ nhưng chưa có ngày.
  - Quyền tác giả câu hỏi thi thuộc Quỹ Giao lưu Quốc tế Nhật Bản (JF) và JEES; cấm chép lại khi chưa được phép.
- **Đề thật dạng cũ (trước 2010; 4級 ≈ N5, 3級 ≈ N4):**
  - Có sách 『日本語能力試験 3・4級試験問題と正解』 của 凡人社, mỗi kỳ một cuốn, từ 平成2年度 (1990) đến 平成21年度第2回 (12/2009); từ 平成13年度 có CD.
  - Còn đặt mua mới được 平成19 và 平成20年度 (Kinokuniya, khoảng 1.466 yên); các năm khác phải tìm sách cũ hoặc thư viện. Thư viện VJCC TP.HCM có 平成5–20年度.
  - Không có bản miễn phí chính thức trên mạng.
- **Xin phép dùng lại:** mục 1(5) chính sách jlpt.jp. Gửi email trước tới `jlptinfo@jpf.go.jp`, ghi 10 thông tin: mục đích, cách dùng, phương tiện, người làm, giá, số lượng, phạm vi, thời hạn… Mục 1(4) chỉ cho phép sẵn với nội dung đăng trên jlpt.jp, nên sách cũ in giấy phải xin riêng. Bản nháp thư tiếng Nhật nằm trong file JSON (`answers.q3_permissionProcess.draftRequest`).
- **Báo cáo phân tích đề của JEES (平成2–21年度):** bản số hóa chỉ đọc được trong Thư viện Quốc hội Nhật (NDL), không công khai trên mạng.
- **"Đề thi tháng 7/12 năm X" lưu hành ở Việt Nam:**
  - Quy định thi coi việc mang đề ra khỏi phòng, chép đề hay ghi âm phần nghe là vi phạm bị hủy kết quả. Ban tổ chức báo công an khi đề bị lấy cắp hay lộ.
  - JF Hà Nội cấm thu thập, mua bán đề cũ.
  - Reng không dùng loại này.

Đường đi tiếp, theo thứ tự:
1. Giữ hai tập đề chính thức, chờ tập mới.
2. Mua sách 3・4級 試験問題と正解 để dùng nguyên bản trong lớp (không photo phát, không số hóa).
3. Gửi thư xin phép theo mục 1(5) nếu muốn đưa câu cũ vào Reng; chỉ nhập khi có trả lời đồng ý bằng văn bản.
4. Giáo viên đọc tham khảo ở thư viện.

## Còn mở

- Nghe so sánh audio 問題2 tập 2012 với file 2017 để quyết có đổi 13 link không.
- Quyết về jpnotes.dev (CC BY-NC) và JLPTSuccess (CC BY-SA, giấy phép mâu thuẫn): chỉ đặt link, xin phép, hay bỏ qua.
- Quyết có mua sách đề cũ và gửi thư xin phép JF không; cần người ký, email liên hệ, năm muốn dùng, số học viên, và Reng có thu phí không.
- Hai bước nạp ngân hàng N5 và N4 lên production ở [báo cáo 23/11](jlpt-exam-sets-2026-11-23.md#còn-mở) vẫn chờ người dùng chạy.

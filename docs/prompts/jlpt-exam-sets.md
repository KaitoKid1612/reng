# Prompt: bộ đề JLPT N5 và N4 có bản in

Prompt giao cho agent (Claude Code hoặc Codex) làm việc trong repo Reng. Sửa các biến ở đầu trước khi giao.

```text
# Bộ đề JLPT N5 và N4 cho Reng, có bản in

CAP_DO = N5, N4
SO_DE_MOI_CAP = 3
CHO_PHEP_PUSH = true
NGUONG_DUNG_USAGE_TUAN = 10%

## 1. Mục tiêu

Mỗi cấp trong CAP_DO có đủ SO_DE_MOI_CAP đề hoàn chỉnh, làm được trên Reng và in ra giấy được. Ưu tiên đề đã từng thi có nguồn hợp pháp. Phần còn thiếu thì soạn đề thi thử mới của Reng. Bàn giao đề, đáp án có giải thích tiếng Việt, phiếu trả lời, lời thoại phần nghe, cách in, bảng nguồn và kết quả kiểm thử. Xong thì tự kiểm tra và push theo mục 8.

## 2. Đọc repo trước khi sửa

- Đọc AGENTS.md, docs/coding-standards.md và docs/content-authoring.md (mục "Nguồn đề JLPT và câu tự biên soạn"). Dùng tiền tố `rtk` cho lệnh shell theo quy định repo.
- Kiểm tra nhánh, git status, remote và commit local chưa push. Giữ nguyên thay đổi của người dùng.
- Đọc docs/basic-design/exam-center.md, docs/detail-design/phase-3.md (Thi thử JLPT), lib/jlpt.ts, lib/jlpt-parts.ts, lib/exam-library.ts, app/exams/page.tsx, scripts/official-test-sql.ts.
- Kiểm kê những gì đã có và không làm lại:
  - Đề chính thức trong content/jlpt/official/: n5-2012, n5-2018, n4-2012, n4-2018, kèm bài nghe ghi âm lại trong content/listening/jlpt-official-*.
  - Ngân hàng đề Reng: content/review-banks/n5-jlpt-mock.json (3 đề N5), n4-jlpt-mock-standard.json, n4-jlpt-mock-advanced.json, n4-reng-exam-*.json.
  - So số câu từng đề chính thức với đề thật (N5 2012 hiện 89 câu, N4 2012 hiện 97 câu). Ghi rõ câu nào thiếu và vì sao.

## 3. Nguồn "đề đã từng thi"

- Nguồn hợp pháp duy nhất cho câu hỏi thật là bộ 公式問題集 miễn phí trên jlpt.jp (bản 2012 và 第二集 2018). Mỗi cấp chỉ có 2 đề như vậy. Dùng được để dạy miễn phí khi ghi 「出典 日本語能力試験公式ウェブサイト（https://www.jlpt.jp/）」 cạnh đề. Audio nghe có tác phẩm của bên thứ ba: chỉ đặt link tới jlpt.jp hoặc dùng bản ghi âm lại đã có trong repo, không nhúng file gốc.
- Các trang tiếng Việt và tiếng Nhật đăng "đề thi tháng 7/20xx" (VNJPClub, testjlpt, trynihongo, jlptzhen, okjlpt, file Drive…) là bản dựng lại, bản scan hoặc bản chép không rõ nguồn. Nhãn tháng năm thường sai, điều khoản của các trang đó cấm thu thập. JLPT đã cảnh báo (19/01/2024) rằng ai tiết lộ, lưu giữ hay sử dụng đề và đáp án bị rò rỉ có thể bị hủy kết quả và cấm thi. Không tải, không chép, không nhập các đề đó vào Reng.
- Được dùng các nguồn trên và tài liệu học (sách luyện thi, bài phân tích đề) chỉ để thống kê dạng câu, chủ điểm và mẹo hay ra. Ghi URL đã mở và điều rút ra được vào bảng nguồn. Không chép câu, đoạn văn hay lời thoại.
- Nếu tìm thấy một nguồn đề thật khác mà giấy phép cho phép dùng, dừng lại, báo URL và điều khoản cho người dùng quyết định trước khi đưa vào.

## 3a. Kiểm tra link trên mạng để tìm đề mẫu

Làm bước này trước mục 4, vì có thể còn đề mẫu hợp pháp chưa dùng.

- Đọc content/jlpt/source-registry.json, content/jlpt/external-source-catalog.json và content/jlpt/source-audit-2026-11-09.json. Kiểm tra lại từng link đã ghi: còn mở được không, nội dung và điều khoản có đổi không.
- Tìm bằng cả tiếng Việt và tiếng Nhật, ví dụ: "日本語能力試験 公式問題集", "JLPT 問題例 N5", "JLPT sample questions N4", "đề thi mẫu JLPT N5 chính thức", "đề thi thử N4 miễn phí có đáp án". Ghi lại từ khóa đã dùng.
- Danh sách tối thiểu phải mở và kiểm tra:
  - jlpt.jp: trang 公式問題集 (https://www.jlpt.jp/samples/sampleindex.html) và bản tiếng Anh. Kiểm tra có tập mới hơn 第二集 2018 không.
  - jlpt.jp: 問題例 2009 (https://www.jlpt.jp/samples/sample09.html), đang ghi "not-imported". Xem có câu N5, N4 dùng được không và số câu bao nhiêu.
  - jlpt.jp: trang mẫu câu hỏi cho người học, nếu có.
  - JEES, đơn vị tổ chức thi ở Nhật (https://info.jees-jlpt.jp/), và các đơn vị tổ chức thi ở Việt Nam (Quỹ Giao lưu Quốc tế Nhật Bản tại Việt Nam, các trường đại học nhận hồ sơ): có đề mẫu hay hướng dẫn công khai không.
  - Nhà xuất bản sách luyện thi (スリーエーネットワーク, アスク出版, アルク, 凡人社, Jリサーチ出版): có đề mẫu hoặc 模試 tải miễn phí không, điều khoản sử dụng ra sao.
  - Các trang tiếng Việt và tiếng Nhật đã có trong external-source-catalog.json cùng các trang mới tìm được.
- Với mỗi link, mở trang thật rồi ghi: URL, chủ sở hữu, loại tài liệu (đề chính thức, đề mẫu nhà xuất bản, đề tự soạn, bản dựng lại đề thật), cấp, số câu, có đáp án và audio không, điều khoản hoặc giấy phép, robots.txt, ngày kiểm tra. Chỉ ghi điều đọc được trên trang, không đoán.
- Kết luận mỗi nguồn theo một trong ba mức:
  - **Dùng được**: đề chính thức hoặc có giấy phép rõ cho phép dạy miễn phí, ghi nguồn cạnh đề.
  - **Chỉ tham khảo**: chỉ dùng để thống kê dạng câu, chủ điểm, không chép câu.
  - **Không dùng**: bản dựng lại đề thật, đề rò rỉ, nguồn không rõ, hoặc điều khoản cấm.
- Nguồn có nhãn "đề thi tháng X năm Y" nhưng không có xuất xứ chính thức thì xếp "Không dùng", dù nội dung trông giống đề thật.
- Không vượt qua trang xác minh trình duyệt, đăng nhập, paywall hay chặn bot. Không tải hàng loạt. Tôn trọng robots.txt. Trang chặn thì ghi lại là chặn rồi chuyển nguồn khác.
- Nguồn đề mẫu nhà xuất bản hay trang khác có vẻ dùng được: dừng lại, gửi người dùng URL, đoạn điều khoản liên quan và đề xuất (xin phép, chỉ đặt link, hay bỏ qua). Chỉ đưa vào Reng sau khi người dùng đồng ý.
- Lưu kết quả: cập nhật source-registry.json (nguồn chính thức) và external-source-catalog.json (nguồn khác), thêm content/jlpt/source-audit-<ngày>.json cho lượt kiểm tra này. Tóm tắt trong báo cáo kiểm thử.
- Trên trang Luyện đề, thêm mục "Đề mẫu chính thức trên mạng": link thường tới các trang jlpt.jp và nguồn xếp "Dùng được". Không nhúng file của họ.
- Nếu tìm được thêm đề hợp pháp, dùng chúng trước rồi mới soạn đề thi thử ở mục 4, và giảm số đề thi thử tương ứng.

## 4. Thành phần mỗi cấp

- Đề 1, Đề 2: hai đề chính thức (2018 và 2012), cộng thêm đề hợp pháp tìm được ở mục 3a nếu có. Hoàn thiện câu còn thiếu nếu đọc được từ PDF gốc. Kiểm tra đáp án với 正解 của sách.
- Từ Đề 3 trở đi (SO_DE_MOI_CAP trừ số đề chính thức): đề thi thử Reng **cố định**, đặt tên "Đề thi thử Reng N5 số k" / "N4 số k". Không bao giờ ghi tháng năm thi hay gọi là "đề thi cũ".
  - Đúng cấu trúc và số câu theo `jlptTestParts` (N5 67 câu, N4 85 câu theo thiết kế hiện tại; nếu muốn bám số câu của đề thật thì nêu chênh lệch và hỏi người dùng).
  - Ưu tiên ghép từ ngân hàng đề Reng đã có. Chỉ soạn câu mới cho dạng còn thiếu. Không trùng câu giữa các đề và hạn chế trùng với ngân hàng ôn hằng ngày của lớp.
  - Từ vựng, kanji, ngữ pháp trong phạm vi cấp. Độ khó tương đương đề chính thức cùng cấp.
  - Mỗi câu một đáp án đúng. Kiểm tra mọi phương án nhiễu, tránh phương án người bản ngữ vẫn chấp nhận. Có lời giải tiếng Việt.
  - Phần nghe: lời thoại tự viết, audio tạo theo docs/06-audio.md. Ghi rõ dịch vụ giọng đọc.
- Mỗi đề có: đề cho học viên, phiếu trả lời, đáp án kèm giải thích, lời thoại phần nghe cho giáo viên, thời gian từng phần như đề thật.

## 5. In ra giấy

- Thêm bản in cho từng đề, chỉ giáo viên và chủ lớp mở được. Học viên không thấy đáp án trước khi được công bố. Giữ đúng lịch đóng hoặc mở đề hiện có.
- In A4 dọc, đen trắng vẫn đọc được. Bố cục theo các phần như đề thật: 言語知識（文字・語彙）, 言語知識（文法）・読解, 聴解. Mỗi phần bắt đầu trang mới. Không cắt một câu hay một đoạn đọc qua hai trang.
- Đầu đề ghi cấp, tên đề, thời gian, và một trong hai dòng nguồn:
  - Đề chính thức: dòng 出典 jlpt.jp như mục 3.
  - Đề thi thử: "Đề thi thử do Reng biên soạn, không phải đề thi thật".
- In riêng được từng tập: đề, phiếu trả lời (dạng tô ô số 1–4), đáp án và giải thích, lời thoại nghe. Phần nghe in kèm link hoặc mã QR tới audio.
- Giữ furigana như đề thật. Không in ghi chú giáo viên vào tập của học viên.
- Có nút "In / Lưu PDF" như chế độ `print-pdf` của slide. Dùng CSS `@media print` riêng cho trang đề, tách khỏi CSS màn hình.
- Kiểm tra bằng Playwright: xuất PDF (`page.pdf`, A4) cho mỗi tập của mỗi đề, đếm trang, chụp ảnh vài trang. Đối chiếu số câu trên PDF với dữ liệu. Ghi kết quả vào báo cáo kiểm thử.
- Viết hướng dẫn in ngắn bằng tiếng Việt trong trang Hướng dẫn (/guide): mở đề nào, bấm gì, chọn khổ giấy và lề trong hộp thoại in.

## 6. Kiểm thử và tài liệu

- Cập nhật docs/basic-design/exam-center.md, docs/detail-design, docs/content-authoring.md, docs/README.md. Viết docs/testing/jlpt-exam-sets-<ngày>.md: danh sách đề, nguồn, số câu từng phần, kết quả rà câu hỏi, kết quả in, các mục còn mở.
- Rà câu hỏi đề thi thử bằng một agent riêng không viết đề, theo từng cấp. Sửa mọi lỗi được báo và ghi vào báo cáo.
- Thêm hoặc cập nhật test: cấu trúc đề, không trùng câu, mỗi câu một đáp án, phân bố vị trí đáp án, bản in không lộ đáp án ở tập học viên, quyền mở bản in.
- Chạy `npm run check`, `npm run test:e2e`, `npm run test:e2e:supabase` trên Supabase local (không dùng Supabase cloud để thử). Ca lỗi thì chẩn đoán, chạy lại khi phù hợp, báo cả lượt đầu và lượt chạy lại. Build nếu đổi tích hợp framework.
- Không đọc hay ghi dữ liệu production khi chưa được người dùng cho phép.

## 7. Chia đợt và usage

- Làm N5 trước, xong và kiểm tra hết rồi mới sang N4. Mỗi đề một commit, tính năng in một commit riêng.
- Nếu đọc được usage tuần, ghi trước và sau mỗi đề. Còn khoảng NGUONG_DUNG_USAGE_TUAN thì dừng mở đề mới, hoàn tất kiểm tra phần đang làm và báo phần đã xong, phần còn lại. Không đọc được usage thì nói rõ và dùng phạm vi đợt làm điểm dừng.

## 8. Commit và push

- Commit tập trung trên `main`, thông điệp tiếng Anh ngắn, không thêm chữ ký AI. Chỉ stage file thuộc nhiệm vụ.
- Nếu cần migration: dừng trước khi push, đưa lệnh `npx supabase db push --linked` cho người dùng chạy và chỉ push code phụ thuộc sau khi họ báo kết quả.
- Nếu CHO_PHEP_PUSH = true: chỉ push một lần lên origin/main sau khi mọi đề và bản in đã qua kiểm thử. Trước khi push: fetch, đối chiếu commit mới trên remote, xem lại toàn bộ commit sẽ đẩy, xác minh remote và tài khoản GitHub theo AGENTS.md. Không force-push. Push sẽ deploy production: sau khi push, kiểm tra trạng thái Vercel của commit và trang chủ production.
- Nếu dừng sớm vì usage, chỉ push phần đã hoàn thành khi người dùng cho phép push một phần.
- Báo cáo cuối bằng tiếng Việt: số đề mỗi cấp và loại đề, link file, cách in, kết quả test, commit, trạng thái push và deploy, những gì chưa xác minh.
```

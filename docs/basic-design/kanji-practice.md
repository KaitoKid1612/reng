# Basic Design — Luyện kanji theo bài

Ngày 30/10/2026. Yêu cầu nguồn: KANJI-01/02 trong [yêu cầu](../01-requirements.md), giai đoạn 5 trong [lộ trình](../09-roadmap.md). Bối cảnh: pilot dạy tiếng Nhật theo trình tự Minna no Nihongo; học viên luyện JLPT N5/N4.

## Mục tiêu và nguyên tắc

Học viên luyện chữ Hán của chính các từ đã học trong bài, giáo viên đưa được câu kanji vào bài giao và luyện hằng ngày mà không cần nguồn dữ liệu ngoài.

- Dữ liệu là từ vựng giáo viên soạn trong bài: cột kanji là mặt chữ, cột kana là cách đọc duy nhất được chấp nhận. Không tự suy cách đọc (theo [luật chấm](../07-exercises-and-grading.md)), không nhập KANJIDIC2/KanjiVG ở bước này.
- Từ được luyện khi cột kanji có ít nhất một chữ Hán; mục chỉ có kana (こんにちは, ノート) bị bỏ qua. Bài 11 mẫu có 37 từ như vậy.
- Câu kanji trong ngân hàng câu là câu chọn/điền thường, nên giao bài, luyện hằng ngày, sổ lỗi, ôn tập và báo cáo "câu cả lớp sai nhiều" dùng lại nguyên cơ chế hiện có.

## Ba bước triển khai

| Bước | Nội dung | Trạng thái |
|---|---|---|
| K1 | Luyện kanji theo bài cho học viên; giáo viên sinh câu kanji vào ngân hàng câu | **Đã triển khai 30/10/2026** |
| K2 | Thẻ chữ Hán: âm Hán Việt, nghĩa, âm on/kun, từ ví dụ lấy từ các bài đã học; trang kanji theo bài Minna hoặc cấp N5/N4; ôn bằng thẻ SRS loại `kanji` | Chờ chốt nguồn dữ liệu |
| K3 | Thứ tự nét và tập viết tự đối chiếu | Chờ quyết định giấy phép |

## Màn hình K1

| URL | Người dùng | Hành vi |
|---|---|---|
| /kanji/[lessonId]?version= | Khách (bài công khai), học viên (bài của lớp) | Chọn dạng câu và số câu → làm từng câu → biết đúng/sai ngay kèm mặt chữ, cách đọc, nghĩa → kết quả, danh sách câu sai → luyện lại câu sai. Không lưu điểm |
| /lessons/[id] | Mọi người đọc được bài | Nút "Luyện kanji (N từ)" khi bài có từ viết bằng chữ Hán |
| /classes/[id] | Học viên lớp tiếng Nhật | Mỗi bài đã mở có link "Luyện kanji" theo đúng phiên bản lớp dùng |
| /teach/lessons/[id]/edit | Giáo viên | Mục Câu luyện có nút "Tạo câu kanji cho N từ" |

Ba dạng câu (học viên chọn một hoặc nhiều; mỗi từ xuất hiện một lần trong phiên, các dạng luân phiên):

1. **Đọc chữ:** hiện 留学生, học viên gõ romaji ra hiragana りゅうがくせい.
2. **Nhận mặt chữ:** hiện "りょうしん — bố mẹ", chọn 1 trong 4 mặt chữ lấy từ cùng bài.
3. **Hiểu nghĩa:** hiện 封筒, chọn nghĩa tiếng Việt.

Bài chỉ có một từ kanji thì câu chọn chuyển thành câu đọc vì không có gì để so.

## Chấm cách đọc

Bỏ qua khoảng trắng, dấu 〜 của trợ số/hậu tố và dấu 。 cuối; katakana tính như hiragana. Ví dụ đáp án "〜にん" nhận "にん", "いい てんきですね" nhận "いいてんきですね". Cách đọc khác với cột kana (じん cho 〜人) là sai, kể cả khi đúng ở từ khác.

## Câu kanji trong ngân hàng câu

Nút của giáo viên tạo cho mỗi từ chưa có câu kanji: một câu điền (Hiragana, đáp án là cột kana đã bỏ 〜) và một câu chọn mặt chữ (4 lựa chọn từ các từ kanji khác trong bài). Câu được gắn thẻ `kanji` và `kanji:<mã từ>` để không tạo lại cho cùng từ; giáo viên xem, sửa hoặc xóa như câu thường rồi lưu nháp và xuất bản. Không vượt giới hạn 200 câu của bài.

## Ngoại lệ

| Tình huống | Kết quả |
|---|---|
| Bài tiếng Trung hoặc bài chưa có từ viết bằng chữ Hán | Trang luyện báo chưa có từ để luyện; reader và trang lớp tiếng Trung không hiện link |
| Học viên không thuộc lớp, bài/phiên bản không đọc được | 404 như các trang bài học khác |
| Bấm Kiểm tra khi chưa nhập/chọn | Nhắc nhập cách đọc hoặc chọn đáp án, không chấm |
| Bài đã đủ 200 câu luyện | Không thêm câu, báo cho giáo viên |

## Ngoài K1

- Lưu kết quả phiên tự luyện, thẻ SRS loại `kanji` (bảng `srs_cards` đã cho phép loại này; RPC ôn tập cần cho tạo thẻ kanji lần đầu và đưa vào hàng ôn) và hiển thị trong lịch sử học tập.
- Dữ liệu chữ (K2): khuyến nghị giáo viên tự biên soạn âm Hán Việt và nghĩa tiếng Việt (KANJIDIC2 chủ yếu có nghĩa tiếng Anh); nếu dùng KANJIDIC2 cho âm on/kun thì phải duyệt giấy phép CC BY-SA, ghi công trên /sources theo [quy định dữ liệu mở](../10-risks-costs-and-licenses.md).
- Thứ tự nét (K3): KanjiVG theo CC BY-SA 3.0, cần duyệt giấy phép; tập viết không chấm nét tự động.

Kiểm chứng: `tests/kanji-practice.test.ts`, `e2e/kanji.spec.ts`; kết quả ở [rà soát 30/10](../testing/code-review-2026-10-30.md).

# Basic Design — Từ vựng N4 theo chủ đề

Ngày 19/11/2026. Bối cảnh: kỳ JLPT 06/12/2026. Từ vựng N5 đã có trong bài Minna 1–25 (flashcard theo bài), còn từ vựng N4 (tương ứng Minna 26–50) chưa có nơi học trên Reng. Trang công khai, không cần tài khoản, thuộc Tự học › Tiếng Nhật.

## Căn cứ từ đề mẫu chính thức

Phần Từ vựng của hai đề mẫu N4 (`content/jlpt/official/n4-2012.json`, `n4-2018.json`):

- **もんだい3** điền từ vào câu. Phương án sai cùng loại từ và cùng cách chia, ví dụ ひえて / なおって / ぬれて / かわいて. Câu viết chủ yếu bằng kana, có dấu cách giữa các cụm.
- **もんだい4** chọn câu gần nghĩa: しゅっぱつしました ≈ でました; có khi thay bằng cả một cụm (ねぼう ≈ おきるのが おそく なる).
- **もんだい5** chọn câu dùng từ đúng. Chưa làm: mỗi từ phải viết thêm 3 câu dùng sai.

## Màn hình

| URL | Hành vi |
|---|---|
| `/jlpt-vocab/n4` | Hàng nút chủ đề → mỗi lần hiện **một** chủ đề (mặc định chủ đề đầu, nút **Tất cả** hiện hết, địa chỉ giữ `#<chủ đề>`, link `#vocab-…` mở chủ đề chứa từ đó, cuối chủ đề có link **Chủ đề tiếp theo**; từ 26/11/2026, trước đó cả 388 từ trên một trang cao khoảng 50.000px). Mỗi chủ đề là danh sách kẻ dòng, 2 cột trên màn hình rộng. Mỗi từ có cách viết, cách đọc, nghĩa, loại từ, âm Hán Việt (từ gốc Hán), câu ví dụ có gạch chân từ và bản dịch, từ gần nghĩa, mẹo, thẻ **Đã ra đề** kèm năm. Mỗi chủ đề có link **Luyện chủ đề này** |
| `/jlpt-vocab/n4/practice?group=` | Chọn chủ đề hoặc Tất cả. Ba dạng câu chọn bốn: **Điền từ vào câu** (câu có （　　）, phương án là đáp án và 3 từ sai tác giả viết sẵn), **Chọn từ gần nghĩa**, **Chọn nghĩa tiếng Việt**. Mặc định chọn hai dạng đầu. Sau khi bấm Kiểm tra, đáp án đúng có ✓, lựa chọn sai có ✗, kèm câu đầy đủ, bản dịch và nghĩa. Có kết quả, danh sách câu sai, luyện lại câu sai. Không lưu điểm |

Bố cục danh sách không dùng lưới card giống thẻ kanji, mà kẻ dòng như trang từ vựng trong sách ([thiết kế UI](../12-ui-design.md#ô-tập-viết--nét-nhận-diện-18112026)).

## Dữ liệu và luật

`content/vocab/n4.json`, kiểm tra bằng Zod ở `lib/jlpt-vocab.ts` khi build:

- Mỗi từ có `word`, `reading` (kana), `group`, `pos` (danh từ, danh từ + する, động từ, tính từ い/な, phó từ, từ ngoại lai, cụm từ), `meaning`, `hanViet` (chỉ từ gốc Hán), `example` `{ja, vi, choices}`, `similar`, `tip`, `paper`.
- Câu ví dụ có đúng một `[[...]]`, là từ ở dạng câu cần. `choices` gồm 3 từ sai, khác đáp án và khác nhau. Kanji trong câu và phương án chỉ được lấy từ danh sách kanji N5/N4 của Reng.
- `paper` khớp danh sách `N4_PAPER_WORDS` (từ đề mẫu, dạng từ điển); test chặn nếu thiếu hoặc thừa.
- Toàn bộ do Reng viết, không chép câu sách hay đề. Mỗi phần dữ liệu được một agent khác soát độc lập: cách đọc, nghĩa, âm Hán Việt, và chỉ một phương án đúng.
- Dạng gần nghĩa lấy phương án sai từ từ cùng loại trước. Từ không có `similar` được hỏi dạng kế tiếp, nên mỗi từ vẫn xuất hiện một lần trong phiên.

| Tình huống | Kết quả |
|---|---|
| Cấp khác `n4` | 404 |
| `group` không có | Luyện tất cả chủ đề |
| Chỉ chọn dạng gần nghĩa | Chỉ hỏi các từ có từ gần nghĩa |

Kiểm chứng: `tests/jlpt-vocab.test.ts`, `e2e/jlpt-vocab.spec.ts`; kết quả ở [báo cáo](../testing/jlpt-vocab-2026-11-19.md).

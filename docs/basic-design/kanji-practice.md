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
| K2 | Thẻ chữ Hán: âm Hán Việt, nghĩa, âm on/kun, từ ví dụ lấy từ các bài đã học; trang kanji theo bài Minna hoặc cấp N5/N4; ôn bằng thẻ SRS loại `kanji` | **Trang cấp N5/N4 đã triển khai 18/11/2026** ([mục dưới](#kanji-n5n4-theo-cấp--18112026)), dữ liệu Reng tự biên soạn; còn trang theo bài Minna và thẻ SRS `kanji` |
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

## Luyện chữ Hán cho lớp tiếng Trung — 03/11/2026

Cùng màn hình và ba dạng câu phục vụ bài tiếng Trung. Từ vựng bài soạn bằng trình soạn tiếng Trung có chữ Hán và pinyin, nên mọi từ có cả hai đều được luyện:

- Đọc chữ: gõ pinyin có dấu thanh. Ô nhập nhận số thanh (`lao3shi1` → `lǎoshī`). Phiên luyện không chấm điểm nên bỏ qua hoa/thường, khoảng trắng giữa âm tiết và dấu chấm cuối, nhưng vẫn tính dấu thanh.
- Nhận mặt chữ và hiểu nghĩa như tiếng Nhật; chữ hiện theo giản thể hoặc phồn thể của bài.
- Trang bài tiếng Trung có "Luyện chữ Hán (n từ)", trang lớp tiếng Trung có "Luyện chữ Hán" cạnh Đọc bài và Flashcard. Đường dẫn vẫn là `/kanji/[lessonId]`; lớp tiếng Nhật giữ nguyên chữ "Luyện kanji".

## Ngoài K1

- Lưu kết quả phiên tự luyện, thẻ SRS loại `kanji` (bảng `srs_cards` đã cho phép loại này; RPC ôn tập cần cho tạo thẻ kanji lần đầu và đưa vào hàng ôn) và hiển thị trong lịch sử học tập.
- Dữ liệu chữ (K2): khuyến nghị giáo viên tự biên soạn âm Hán Việt và nghĩa tiếng Việt (KANJIDIC2 chủ yếu có nghĩa tiếng Anh); nếu dùng KANJIDIC2 cho âm on/kun thì phải duyệt giấy phép CC BY-SA, ghi công trên /sources theo [quy định dữ liệu mở](../10-risks-costs-and-licenses.md).
- Thứ tự nét (K3): KanjiVG theo CC BY-SA 3.0, cần duyệt giấy phép; tập viết không chấm nét tự động.

## Kanji N5/N4 theo cấp — 18/11/2026

Phục vụ kỳ JLPT 06/12/2026: học viên N5 (Nguyên) và N4 (Việt) học kanji theo cấp, không phụ thuộc bài đã mở. Trang công khai, không cần tài khoản, nằm trong Tự học › Tiếng Nhật.

| URL | Hành vi |
|---|---|
| `/jlpt-kanji/n5`, `/jlpt-kanji/n4` | Chuyển cấp N5/N4 → link tới từng nhóm → mỗi nhóm một lưới thẻ chữ: chữ to, âm Hán Việt, nghĩa, âm On, âm Kun, 1–4 từ ví dụ (cách đọc, nghĩa), mẹo nhớ, thẻ **Đã ra đề** kèm từ và năm đề mẫu đã hỏi. Mỗi nhóm có link **Luyện nhóm này** |
| `/jlpt-kanji/[level]/practice?group=` | Chọn nhóm (hoặc Tất cả) → dùng lại màn hình luyện K1 trên từ ví dụ của nhóm: đọc chữ (giống もんだい1), nhận mặt chữ (giống もんだい2), hiểu nghĩa. Mỗi từ một lần (学校 có ở cả 学 và 校). Không lưu điểm |

Dữ liệu và luật:

- `content/kanji/n5.json` (105 chữ, 11 nhóm) và `content/kanji/n4.json`, kiểm tra bằng Zod ở `lib/jlpt-kanji.ts` khi build. JLPT không công bố danh sách kanji từ năm 2010, nên danh sách là các chữ thường dạy cho mỗi cấp, và phải chứa mọi chữ mà phần chữ Hán của đề mẫu chính thức cấp đó đã hỏi.
- Từ ví dụ chỉ được dùng kanji cùng cấp hoặc cấp dưới (từ N4 dùng được chữ N5), phải chứa chính chữ đó; N4 không lặp chữ N5. Cách đọc từ bằng kana. Âm On viết katakana, âm Kun viết hiragana, okurigana trong ngoặc (`たか(い)`).
- Âm Hán Việt, nghĩa, từ ví dụ và mẹo nhớ do Reng tự viết. Không chép mẹo từ sách hoặc trang khác; không dùng KANJIDIC2. Mẹo chỉ gọi tên những bộ phận có thật trong chữ.
- `paper` (thẻ Đã ra đề) không sửa tay. `npm run kanji:paper` tính lại từ もんだい1 (từ được đánh dấu để đọc) và もんだい2 (đáp án đúng) phần 文字・語彙 của `content/jlpt/official`. Test so sánh với đề, sai một chữ là lỗi. Trang không tải đề mẫu.

| Tình huống | Kết quả |
|---|---|
| Cấp khác n5/n4 | 404 (`dynamicParams = false`) |
| `group` không có | Luyện tất cả các nhóm của cấp |
| Nhóm chỉ có một từ | Câu chọn chuyển thành câu đọc như K1 |

## Học kanji dễ hơn: quy luật Hán Việt, chữ dễ nhầm, bẫy cách đọc — 18/11/2026

Nguồn ý tưởng:
- Các chương trình học kanji phổ biến (WaniKani, Remembering the Kanji) học theo bộ phận chữ kèm mẹo nhớ. Reng đã có mẹo nhớ theo bộ phận chữ.
- Phân tích phần chữ Hán của 4 đề mẫu chính thức trong `content/jlpt/official`:
  - もんだい2 lấy chữ trông giống làm phương án sai (来/采/木/未, 学校/宇校/学枚, 貸/貨/資/質) hoặc chữ cùng chủ đề (青/黒/赤/白).
  - もんだい1 lấy cách đọc biến âm (ふべん/ぶべん/ふへん/ぶへん, ちいさい/ちさい).
- Lợi thế riêng của người Việt: âm Hán Việt.

| Phần | Hành vi |
|---|---|
| `/jlpt-kanji/han-viet` | Bảng quy luật âm cuối Hán Việt → đuôi âm On (-c → く/き, -t → つ/ち, -p → trường âm, -ng/-nh → trường âm, -n/-m → ん, nguyên âm + u/o → trường âm, nguyên âm + i/y → い, một nguyên âm → không có đuôi ん/く/つ). Bảng phụ âm đầu → hàng kana (c/k/qu/kh/gi và h → か/が, ng → が, nh → に/じ, đ → た/だ, t → さ/ざ, th, ch/tr, s/x, b/ph, m, l). Mỗi quy luật có tới 4 ví dụ, tỉ lệ đúng và toàn bộ ngoại lệ, đếm khi build trên dữ liệu N5+N4 (`lib/han-viet-rules.ts`). Có thêm mục âm biến khi ghép chữ (っ, ん + h → b/p) |
| Thẻ chữ | Mục **Dễ nhầm với**: 1–3 chữ trông giống, mỗi chữ kèm âm Hán Việt, nghĩa và nét phân biệt (`lookalikes`, Reng tự viết) |
| Trang luyện | Mặc định chọn hai dạng giống đề: **Chọn cách đọc** (phương án sai sinh bằng `lib/reading-traps.ts`: đục/trong, bỏ hoặc thêm trường âm, っ, ゅ/ゆ, ち/し; ưu tiên ghép hai lỗi thành lưới 2×2 như đề) và **Nhận mặt chữ** (phương án sai thay một rồi hai chữ của từ bằng chữ dễ nhầm, thiếu thì lấy từ khác cùng nhóm, giống phương án cùng chủ đề của đề) |

Luật:

- Quy luật chỉ được đưa lên trang khi đúng ít nhất 3/4 số chữ có âm On; test chặn nếu dữ liệu đổi làm tỉ lệ tụt. Phụ âm d, v, g, n, r không theo một hàng ổn định nên không có trong bảng. Trang nói rõ đục/trong (か hay が) không đoán được.
- Bẫy cách đọc chỉ sinh từ hiragana. Âm p chỉ sinh sau っ hoặc ん; không thêm trường âm trước ん. Từ tiếng Trung (pinyin) và từ katakana không có bẫy: dạng Chọn cách đọc không hiện ở lớp tiếng Trung, và từ katakana lấy cách đọc của từ khác làm phương án.
- Dạng Chọn cách đọc cũng có ở trang luyện kanji theo bài (K1), nhưng ở đó không được chọn sẵn.

Kiểm chứng: `tests/kanji-practice.test.ts`, `e2e/kanji.spec.ts`; kết quả ở [rà soát 30/10](../testing/code-review-2026-10-30.md).

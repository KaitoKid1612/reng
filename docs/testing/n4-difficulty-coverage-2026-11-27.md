# Độ khó, độ lặp và phạm vi N4 — 27/11/2026

Người dùng hỏi đề N4 giao cho lớp "Ôn JLPT N4 – Việt" có đúng trình độ thi không, có lặp nhiều không, ngân hàng có đủ không. Kỳ thi: 06/12/2026.

## Độ khó so với đề thật

Ba agent độc lập chấm từng câu của `content/review-banks/n4-daily-with-listening.json` (bài hằng ngày, 479 câu), lấy hai đề chính thức `content/jlpt/official/n4-2012.json` và `n4-2018.json` làm mốc.

| Phần | Dễ hơn N4 | Đúng N4 | Khó hơn N4 |
|---|---|---|---|
| Từ vựng (203) | 9 | 190 | 4 |
| Ngữ pháp và đọc hiểu (216) | 74 | 141 | 1 |
| Nghe (60) | 21 | 39 | 0 |
| Tổng (479) | 104 (22%) | 370 (77%) | 5 (1%) |

- **Từ vựng sát đề thật.** Có vài câu 表記 khó hơn đề thật: phương án đọc giống nhau (機会/機械, 人口/人工) và chữ 輸. Khoảng 11 câu 言い換え đang hỏi ngữ pháp, không phải từ.
- **Ngữ pháp dễ hơn đề thật.**
  - grammar-form 053–068 là trợ từ N5.
  - Nhiều phương án sai là dạng không tồn tại, nên loại trừ được.
  - 17/28 câu ★ dễ: mảnh ghép ngắn, ★ rơi vào mảnh chỉ đứng đầu hoặc cuối được.
  - composition-24 tách までに thành まで | に.
  - Chỉ 12% câu là hội thoại A/B, trong khi đề thật có 5–7/15 câu.
- **Đọc hiểu:** khoảng 1/4 số câu chỉ cần dò chữ trong bài là ra đáp án. 情報検索 sát đề thật.
- **Nghe:**
  - Câu 21–60 gần đề thật, hơi ngắn hơn.
  - Câu 01–20 có lời thoại chỉ dài khoảng 1/3 đề thật, không có người dẫn, phần 3–4 in sẵn phương án.
  - Đo trung vị: 課題理解 179 chữ và 3 lượt lời ở ngân hàng, so với 231 chữ và 7 lượt ở đề thật.
- **Không câu nào sai đáp án hay có hai đáp án đúng.** Phân bố vị trí đáp án đều.

## Độ lặp

**Mô phỏng.** Chạy `selectJlptDailyQuestions` từng ngày từ 13/11 đến 06/12 với 67 câu/ngày, 10 câu nghe. Từ ngày thứ 8 (20/11), 100% câu là câu đã giao. Mỗi câu quay lại sau 7 ngày (nghe 5–6 ngày), tới ngày thi mỗi câu đã ra 3–5 lần.

**Production.** Người dùng chạy SELECT chỉ đọc:
- **Đã nộp:** 15/11 39/70, 17/11 41/67, 20/11 38/67. Từ 21/11 không nộp bài nào. Từ 22/11 mỗi ngày giao 67/67 câu "đã dùng".
- **Điểm cũ không phản ánh sức thật.** Trước 13/11 ngân hàng có 40 câu và lặp lại nguyên bộ mỗi ngày, nên điểm 54–66/70 là điểm ảo.
- **Tỷ lệ đúng lần đầu gặp theo phần:**
  - 漢字読み 91%.
  - 用法 75%, 短文 78%, 表記 73%.
  - 文脈規定 67%, ★ 67%.
  - 中文 56%, nghe 51%, 言い換え 50%, 情報検索 50%.
  - 文法形式 46%, 文章の文法 42%.

**Nguyên nhân lặp:** mọi câu đã giao trong 14 ngày đều tính là "đã dùng", kể cả bài không ai mở.

**Đã sửa** ở `lib/server/daily-practice.ts`: chỉ tính bài đã có dòng `submissions`. Ngày bỏ qua không làm câu bị xếp xuống cuối.

## Phạm vi N4 và câu bổ sung

Đo theo "từ được đem ra hỏi": phần gạch chân, đáp án đúng, hoặc từ của câu 用法. Tính trên ba ngân hàng N4 (hằng ngày, chuẩn, nâng cao):
- 166/388 từ trong `content/vocab/n4.json` chưa được hỏi.
- 42/187 kanji N4 chưa có trong câu 漢字読み/表記.
- 25/111 mẫu `n4g-*` không có câu gắn nhãn.

`content/review-banks/n4-coverage.json` thêm 283 câu:

| Dạng | Số câu |
|---|---|
| 漢字読み / 表記 | 25 / 17 (42 kanji) |
| 文脈規定 / 言い換え / 用法 | 86 / 38 / 42 (166 từ) |
| 文法形式 / ★ | 50 / 25 (mỗi mẫu 2 + 1) |

Vị trí đáp án đúng: 73/70/71/69. ★ nằm ở ô 1/2/3/4 với số câu 6/7/6/6.

**Rà soát:** bốn agent soạn, rồi ba agent khác rà từng câu theo cùng tiêu chí với phần chấm độ khó.
- **Từ vựng B: sửa 6 câu.**
  - 2 câu có hai đáp án đúng: おとした/みつけた, はんたい.
  - 用法 見つかる sai chỉ vì trợ từ.
  - 3 câu phương án nhiễu yếu.
- **Từ vựng A và kanji: sửa 8 câu.**
  - 2 bộ phương án trùng đề chính thức: 雪/雷/雲/電 và くさ/いし/すな.
  - 1 câu khung giống đề 2018 (ゆにゅう).
  - 2 câu kanji trùng ngữ cảnh với câu từ vựng.
  - 2 phương án đọc không phát âm được.
- **Ngữ pháp: sửa 12 câu chọn và 25 câu ★.**
  - Câu 07, 10, 20, 44 có hai đáp án đúng.
  - 8 câu có phương án là dạng không tồn tại.
  - 5 câu ★ có hai thứ tự đúng.
  - Ô ★ lúc đầu luôn ở vị trí 3, đã chia lại cho đều.
- **Sau rà soát:**
  - Câu 09 đổi sang dùng を, để 見えます không còn đúng.
  - Câu 言い換え 気がつく viết bằng kana.

`npm run audit:jlpt-bank` không báo lỗi. `tests/n4-coverage-bank.test.ts` kiểm tra hai điều:
- Bốn ngân hàng không trùng mã câu.
- Bốn ngân hàng cùng nhau hỏi đủ 388 từ, 187 kanji và 111 mẫu.

## Đưa lên production

SQL do `npm run bank:sql … --class <lớp N4>` tạo. Mặc định là chạy thử (ROLLBACK). Người dùng chạy bản `--commit`, sau đó đọc lại để xác nhận:
- `n4-jlpt-mock-standard` và `n4-jlpt-mock-advanced`: 4 đề Reng N4 ở trang Luyện đề. Lớp trước đó chỉ có 2 đề chính thức và đề cũ ngày 10/11.
- `n4-coverage`: bài để giao thêm, ngoài bài hằng ngày.

E2E chưa chạy cho đợt này. Hiện không có spec nào kiểm tra việc xoay vòng câu hằng ngày.

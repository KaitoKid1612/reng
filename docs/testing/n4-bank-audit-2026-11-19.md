# Kiểm tra ngân hàng đề N4 — 19/11/2026

Phạm vi:
- `content/review-banks/n4-daily-with-listening.json`: nguồn bài hằng ngày 67 câu của lớp Ôn JLPT N4 – Việt; trên production là `n4-viet-review-bank`.
- Hai đề chính thức `content/jlpt/official/n4-2012.json`, `n4-2018.json`, dùng thi thử.

Lệnh kiểm tra mới, chỉ đọc: `npm run audit:jlpt-bank -- <bank.json>` (`scripts/audit-jlpt-bank.ts`).

## Cấu trúc so với đề N4

Chuẩn là cấu trúc đề N4 trong `lib/jlpt-parts.ts`:
- Từ vựng 28 câu: 7/5/8/4/4.
- Ngữ pháp và đọc hiểu 29 câu: 13/4/4/3/3/2.
- Nghe 8/7/5/8.
- Bài hằng ngày lấy đủ 57 câu chữ và 10 câu nghe = 67 câu.

| Dạng | Trong ngân hàng | Mỗi bài 67 câu | Số bài trước khi lặp |
|---|---|---|---|
| 漢字読み | 56 | 7 | 8 |
| 表記 | 35 | 5 | 7 |
| 文脈規定 | 56 | 8 | 7 |
| 言い換え類義 | 28 | 4 | 7 |
| 用法 | 28 | 4 | 7 |
| 文法形式の判断 | 104 | 13 | 8 |
| 文の組み立て | 28 | 4 | 7 |
| 文章の文法 | 28 | 4 | 7 |
| 内容理解（短文） | 21 | 3 | 7 |
| 内容理解（中文） | 21 | 3 | 7 |
| 情報検索 | 14 | 2 | 7 |
| 課題理解 / ポイント理解 / 発話表現 / 即時応答 | 16 / 15 / 12 / 17 | 3 / 2 / 2 / 3 | 5,3 / 7,5 / 6 / 5,7 |

Đoạn văn, tính số chữ không kể dấu cách và furigana:

| Dạng | Số đoạn | Số chữ (nhỏ nhất / giữa / lớn nhất) | Số câu mỗi đoạn |
|---|---|---|---|
| 文章の文法 | 7 | 291 / 322 / 349 | 4 |
| 短文 | 21 | 101 / 116 / 133 | 1 |
| 中文 | 7 | 473 / 477 / 499 | 3 |
| 情報検索 | 7 | 382 / 392 / 412 | 2 |

Độ dài khớp đề N4: ngắn khoảng 100–200 chữ, trung bình khoảng 450, tìm thông tin khoảng 400.

## Định dạng từng câu

419 câu chữ không có lỗi:
- 漢字読み: một từ gạch chân có kanji, phương án là kana.
- 表記: từ gạch chân bằng kana, phương án có kanji.
- 文脈規定 và 文法形式: có （　　）.
- 言い換え: một câu gạch chân.
- 用法: từ được đánh dấu trong cả 4 câu.
- ★: đúng 4 chỗ trống, 1 dấu ★.
- 文章の文法: ô ［n］ có trong đoạn văn.
- Mọi câu có 4 phương án, đúng một đáp án, đúng số もんだい trong lời dẫn, có giải thích tiếng Việt, furigana đúng cú pháp, không câu trùng.

Đã sửa:

- **Câu nghe 1–20** (đợt cũ, cũng sửa trong `content/listening/n4-viet-listening-mock-20.json`):
  - Đề và phương án viết tiếng Việt, 17 câu chỉ có giải thích tiếng Nhật, câu もんだい3 và 4 có 4 phương án in sẵn.
  - Nay đề và phương án theo kiểu đề thật bằng tiếng Nhật (二人は 何時に 会いますか…), phương án dịch giữ thứ tự và đáp án, giải thích tiếng Việt có trích lời nghe. もんだい3 và 4 bỏ phương án nhiễu yếu nhất cho còn 3 như đề N4.
  - Audio giữ nguyên (người dùng đã nghe duyệt 10/11/2026). Vì vậy 20 câu này vẫn in phương án; đề thật chỉ đọc phương án trong audio, như câu 21–60.
  - Câu 14 (đề có sẵn cụm của đáp án) và câu 15 (furigana ở đáp án lộ cách đọc trong đề): viết lại.
- **Furigana cho kanji vượt N4:**
  - Đề chính thức chỉ để kanji vượt phạm vi không furigana ở 5–10 chữ, phần lớn là chữ nhiễu cố ý của もんだい2; các từ 文章, 会議, 本当, 部屋, 留学生, 会議室 đều có furigana.
  - Ngân hàng có 257 lần thiếu furigana ở 51 cụm (文章 34, 会議 30, 佐藤 30, 留学生 25, 部屋 18…). Đã thêm 261 furigana; cách đọc theo ngữ cảnh (3階 がい, 変える か, 降って ふ, お寺 てら).
  - Không thêm furigana ở từ gạch chân của 漢字読み và phương án của 表記 (phần đang hỏi).
  - Theo luật xuất bản, câu 漢字読み không có furigana ở đâu: 7 câu đổi từ vượt phạm vi sang kana (へや). Phương án có furigana đổi sang kana (おねがいします).
  - Chuẩn "trong phạm vi" là danh sách kanji N5/N4 của Reng cộng các chữ đề chính thức in không furigana (便利, 泳ぐ, 生活…). Danh sách kanji N4 của Reng hẹp hơn phạm vi thật của đề ở vài chữ (利, 泳, 活, 部, 晩…), cần xem lại khi mở rộng trang Kanji.

## Hai đề chính thức

| Đề | Từ vựng | Ngữ pháp | Đọc hiểu | Nghe | Tổng |
|---|---|---|---|---|---|
| 2012 | 9 / 6 / 9 / 5 / 5 | 15 / 5 / 5 | 4 / 4 / 2 | 8 / 7 / 5 / 8 | 97 |
| 2018 | 9 / 6 / 10 / 5 / 5 | 15 / 5 / 5 | 4 / 4 / 2 | 8 / 7 / 5 / 8 | 98 |

- もんだい3 của đề 2012 có 9 câu (16–24): đã đối chiếu bản PDF chính thức `https://www.jlpt.jp/samples/sample2012/pdf/N4V.pdf`, bản gốc đúng 9 câu, nên dữ liệu khớp.
- Mọi câu có giải thích, ghi nguồn và phương án. もんだい3 và 4 phần nghe có 3 phương án như đề.

## Kết quả

- `npm run audit:jlpt-bank`: không còn lỗi.
- `npm run bank:sql` (chạy thử, ROLLBACK): 479 câu, 60 audio, qua kiểm tra xuất bản.
- `npm run check`: 443/443.
- Production chưa có bản sửa cho tới khi người dùng chạy SQL nạp ngân hàng (`n4-viet-review-bank`).

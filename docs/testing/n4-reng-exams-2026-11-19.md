# Kiểm chứng 4 đề Reng N4 mới (chuẩn và nâng cao) — 19/11/2026

Kế hoạch người dùng duyệt ngày 19/11/2026:
- 4 đề N4 mới đúng cấu trúc đề thật (85 câu, 115 phút): 2 đề chuẩn (độ khó như đề chính thức 2012/2018), 2 đề nâng cao (vẫn trong N4).
- Nội dung khác hẳn đề cũ.
- Đặt ở ngân hàng riêng, tách khỏi ngân hàng bài hằng ngày.

## Dữ liệu

| Ngân hàng | Câu | Chữ và từ vựng | Ngữ pháp | Đọc hiểu | Nghe (MP3) |
|---|---|---|---|---|---|
| `content/review-banks/n4-jlpt-mock-standard.json` | 170 | 56 | 42 | 16 | 56 (`listening/n4-reng-exam-standard.json`) |
| `content/review-banks/n4-jlpt-mock-advanced.json` | 170 | 56 | 42 | 16 | 56 (`listening/n4-reng-exam-advanced.json`) |

- Mỗi ngân hàng ghép đúng 2 đề, mỗi đề 7/5/8/4/4, 13/4/4/3/3/2, 8/7/5/8. Hai đề không trùng câu. Câu có nhãn `reng-exam:standard` hoặc `reng-exam:advanced`, nên thư viện đặt tên "Đề Reng N4 chuẩn số k" và "Đề Reng N4 nâng cao số k".
- Đề nâng cao:
  - Từ vựng N4 ít gặp hơn; phương án nhiễu cùng chữ Hán, gần nghĩa, cùng cách chia.
  - Ngữ pháp hay nhầm: ように/ために, そうだ hai nghĩa, ようだ/らしい, ばかり, ところ, bị sai khiến, kính ngữ, と/ば/たら/なら.
  - Đọc hiểu suy luận; tìm thông tin 2–3 điều kiện.
  - Nghe: đổi ý giữa chừng, kính ngữ, câu đáp gián tiếp.
  - Một số từ sát N3 được giữ ở mức nâng cao vì ghép từ chữ N4 có cách đọc đều (始発, 体重, 集合, 医学).
- Độ dài đoạn văn, tính số chữ:

| Dạng | Chuẩn | Nâng cao |
|---|---|---|
| Đọc ngắn | 163–191 | 168–200 |
| Đọc trung bình | 450, 466 | 497, 498 |
| Tìm thông tin | 384, 395 | 408, 417 |
| Ngữ pháp đoạn văn | 312, 345 | 326, 342 |

## Không trùng nội dung cũ

- Trước khi soạn: bảng đối chiếu từ ngân hàng N4 và hai đề chính thức (171 từ gạch chân, 167 đáp án điền từ, 74 mẫu ngữ pháp, 54 mở đầu đoạn văn, 116 mở đầu tình huống nghe). Agent từ vựng còn chặn thêm từ đã hỏi ở mọi ngân hàng N4.
- Sau khi soạn: script so độ giống chữ (3 ký tự liền nhau) với 1.138 câu, đoạn văn và lời thoại cũ, và giữa các câu mới với nhau. Chỉ còn trùng câu dẫn cố định của đề (即時応答, "この お知らせから わかる ことは…").
- Từ thay thế cũng phải qua kiểm tra: 急行 (agent soát đề xuất) đã ra trong đề N4 2018 nên đổi thành 遠足. 遠足 lại làm lộ đáp án 遠く của câu 表記 cùng đề, nên câu đó đổi thành 小鳥.

## Soát độc lập

**Phần chữ, 228 câu.** Không câu nào sai đáp án. Đã thử mọi cách xếp của 16 câu ★; đã tính lại phép tính và thứ trong tuần của câu tìm thông tin. Đã sửa:
- 1 đáp án dễ hiểu sai (adv mid-reading-03).
- 2 câu gần trùng trong một đề (かならず + 〜てください).
- Từ vượt N4 trong đề chuẩn (学会, 電動, 日帰り, 市場), あてはまる trong câu quyết định đáp án.
- Đáp án dài gấp đôi phương án khác.
- Đáp án 表記 bị in sẵn ở câu khác cùng đề (写真, 思い出, 社員).
- Phương án nhiễu bị loại chỉ nhờ ngữ pháp. Agent soạn giữ lại khi phương án đề xuất tạo hai đáp án đúng: 上がって いる thay 上がらない; お書きいたした và ために thay お書きした và ので.
- Đoạn nhà tắm công cộng trùng mạch truyện với đoạn suối nước nóng, thay bằng đoạn leo núi Phú Sĩ (mình tự soát).

**Phần nghe, 112 câu.** Không câu nào có hai đáp án. Đã sửa:
- std-32: lời thoại tự mâu thuẫn về giờ bay.
- Từ vượt N4 trong đề chuẩn (席を外す, 忘れずに, 拭く, ゆずる).
- Các chỗ máy đọc dễ sai: gắn furigana nguyên từ (十日 とおか, きょう中 じゅう, 分 ぶん, 一階, 何人, 空いて, 四時十分…).

## Kiểm tra

- `npm run audit:jlpt-bank` trên hai ngân hàng: không lỗi, 0 kanji vượt phạm vi thiếu furigana.
- `npm run bank:sql` chạy thử: mỗi ngân hàng 170 câu, 56 audio.
- `tests/n4-jlpt-mock-banks.test.ts`:
  - Mỗi ngân hàng 2 đề 28/29/28, không trùng câu.
  - Tên đề đúng loại; mọi câu nghe có MP3.
  - Mã câu không trùng giữa hai ngân hàng và ngân hàng hằng ngày.
- `npm run check`: 456/456.
- E2E `exam-center` và `jlpt-mock-exam`: 2/2.
- Audio 112 câu tạo bằng Unreal Speech, cùng giọng với bộ nghe N4 hiện có. Cần người dùng nghe duyệt.

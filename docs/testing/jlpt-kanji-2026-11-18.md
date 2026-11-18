# Kiểm chứng Kanji N5/N4 theo cấp — 18/11/2026

Phạm vi: trang `/jlpt-kanji/n5`, `/jlpt-kanji/n4`, trang luyện `/jlpt-kanji/[level]/practice?group=`, dữ liệu `content/kanji/*.json`. Thiết kế ở [BD luyện kanji](../basic-design/kanji-practice.md#kanji-n5n4-theo-cấp--18112026).

## Dữ liệu

| Cấp | Số chữ | Nhóm | Chữ đề mẫu đã hỏi (thẻ Đã ra đề) |
|---|---|---|---|
| N5 | 105 | 11 | 38, đủ mọi chữ もんだい1–2 của đề 2012 và 2018 |
| N4 | 187 | 16 | 34 (5 chữ còn lại của đề N4 là chữ N5: 小, 日, 食, 外, 行) |

- N4 có các chữ thường xếp N3 nhưng đã ra trong đề mẫu N4: 経, 港, 雪, 雲, 反, 対, 記, 便, 石.
- Mỗi cấp được một agent riêng soát độc lập toàn bộ: âm Hán Việt, âm On/Kun, nghĩa, cách đọc từ (gồm âm biến っ, ぴゃく, rendaku) và bộ phận chữ trong mẹo. Không có lỗi âm Hán Việt hay cách đọc.
- Đã sửa sau khi soát:
  - N5: mẹo 毎 (phần dưới không phải 母 nguyên vẹn), bộ thị 礻 gõ nhầm thành katakana ネ, nghĩa 元日 (Tết dương lịch).
  - N4: mẹo 歩 (chữ Nhật có nét chấm, khác chữ Trung 步), mẹo 鳥 (nét mắt, không phải chấm), nghĩa 産業, 悪い, 東京都, 正月, 早い, 大学院.
- Giới hạn có chủ ý: từ ví dụ chỉ dùng chữ cùng cấp hoặc thấp hơn, nên 35 chữ N4 chỉ có một từ, và 便利 chỉ được nhắc bằng kana trong mẹo, vì 利 không thuộc danh sách.

## Tự động

- `tests/jlpt-kanji.test.ts` (6 test):
  - Chữ đề mẫu nằm trong danh sách.
  - `paper` khớp đề.
  - Từ không vượt cấp, item theo thứ tự nhóm.
  - Schema chặn chữ cấp cao, chữ trùng cấp dưới, từ không chứa chữ, okurigana sai.
  - Bộ thu thập đề.
  - Danh sách từ luyện không trùng.
- `npm run check`: 434/434.
- `e2e/jlpt-kanji.spec.ts` 2/2:
  - Từ Tự học vào được Kanji N5; thẻ 週 có Đã ra đề 先週 (2012).
  - Chuyển được N4/N5; luyện nhóm Cơ thể đúng hết.
  - Trang vừa màn hình 360px; `/jlpt-kanji/n3` trả 404.
- Chạy kèm, đều đạt: `e2e/kanji.spec.ts`, `seo.spec.ts`, `kana.spec.ts`, `navigation.spec.ts`.
- `npm run build`: `/jlpt-kanji/n5` và `/jlpt-kanji/n4` sinh tĩnh; trang luyện render theo yêu cầu.

## Trình duyệt

Dùng Playwright trên dev server local, khổ 1280, 1440, 1920 và 390 px, cả nền tối:
- Đủ 105/187 thẻ chữ, 38/34 thẻ Đã ra đề.
- Không tràn ngang.
- axe 0 lỗi trên trang danh sách và trang luyện.
- Không lỗi console.
- Menu Tự học đánh dấu Kanji N5–N4.

Chữ Nhật trong mẹo nhớ được đánh dấu `lang="ja"` và không bị ngắt giữa từ.

## Quy luật Hán Việt, chữ dễ nhầm, bẫy cách đọc — 18/11/2026

Thiết kế ở [BD luyện kanji](../basic-design/kanji-practice.md#học-kanji-dễ-hơn-quy-luật-hán-việt-chữ-dễ-nhầm-bẫy-cách-đọc--18112026).

Căn cứ:
- Tham khảo cách học của các chương trình kanji phổ biến: bộ phận chữ, mẹo nhớ, ôn lặp lại.
- Đọc phần chữ Hán của 4 đề mẫu chính thức:
  - もんだい2 dùng chữ trông giống hoặc chữ cùng chủ đề làm phương án sai.
  - もんだい1 dùng cách đọc biến âm, hay xếp thành lưới 2×2 (ふべん/ぶべん/ふへん/ぶへん).

Dữ liệu:

| Quy luật (đếm trên 292 chữ) | Đúng |
|---|---|
| Âm cuối -c → く/き | 29/29 |
| -t → つ/ち | 14/15 (不) |
| -p → trường âm | 8/9 (立) |
| -ng/-nh → trường âm | 39/39 |
| -n/-m → ん | 68/68 |
| nguyên âm + u/o → trường âm | 24/25 (母) |
| nguyên âm + i/y → い | 21/27 |
| một nguyên âm → không có đuôi ん/く/つ | 78/79 (借) |
| Phụ âm đầu c/k/qu/kh/gi → hàng か/が | 37/38 |
| h → hàng か/が | 20/23 |
| ng → が | 11/13 |
| nh → に/じ | 7/9 |
| đ → た/だ | 30/30 |
| t → さ/ざ | 30/31 |
| th | 33/34 |
| ch/tr | 21/22 |
| s/x | 15/15 |
| b/ph | 19/19 |
| m | 10/10 |
| l | 9/9 |

- Chữ dễ nhầm: N5 có 88 chữ (156 cặp), N4 có 148 chữ (231 cặp). Có đủ mọi cặp phương án sai của đề mẫu, như 来/未/采, 学/宇, 校/枚, 見/貝, 貸/貨/資/質, 医/匠, 計/訂, 試/誡.
- Một agent riêng soát toàn bộ 389 cặp, đối chiếu mặt chữ bằng font Noto Sans JP của trang.
  - Không có lỗi âm Hán Việt.
  - Đã sửa 11 ghi chú tả nét chưa đúng hoặc chưa đủ (魚/黒, 川/州, 今/令, 書/画, 社/仕, 声/売, 発/登, 漢/難) và 7 nghĩa chỉ lặp âm.
  - Đã bỏ 3 cặp chỉ giống nhau ở bộ (物/特, 話/読).
  - Đã thêm 式 cho 試. Vẫn giữ 誡 vì đề mẫu 2018 dùng nó làm phương án sai.

Tự động:
- `tests/han-viet-rules.test.ts`:
  - Chuẩn hóa âm Hán Việt, giữ đ riêng.
  - Mọi chữ có âm On đều có quy luật âm cuối.
  - Mỗi quy luật đúng ít nhất 3/4.
- `tests/reading-traps.test.ts`:
  - Sinh lại đúng 4 phương án ふべん của đề N4 2018.
  - Không sinh âm p sai chỗ, không thêm trường âm trước ん.
  - Pinyin và katakana không có bẫy.
  - Câu chọn mặt chữ ưu tiên dạng dễ nhầm.
- `tests/jlpt-kanji.test.ts` thêm `lookalikeForms` (学校 → 宇校, 学枚, 宇枚).
- `npm run check`: 440/440.
- `e2e/jlpt-kanji.spec.ts` 3/3:
  - Dạng chọn cách đọc chỉ có phương án hiragana.
  - Trang quy luật có dòng -c, -ch kèm tỉ lệ.
- Chạy kèm, đều đạt: `kanji`, `seo`, `navigation`, `kana`, tổng 22/22.
- `npm run build`: `/jlpt-kanji/han-viet` là trang tĩnh.

Trình duyệt (1280, 1440, 1920, 390 px):
- Trang quy luật có 20 dòng, trên điện thoại mỗi quy luật thành một khối. Không tràn ngang; axe 0 lỗi; không lỗi console.
- Ví dụ câu hỏi:
  - 電気 → てんき / でんぎ / でんき / てんぎ.
  - 日本語 → 目本語 / 日木語 / 白本語.
  - 一本 → いっほん / いぽん / いほん.

Giới hạn: một bẫy có thể trùng một từ có thật (てんき là 天気). Đề thật cũng dùng kiểu phương án này, nên chấp nhận.

## Kiểm tra giao diện kỹ — 18/11/2026

Playwright chạy thao tác thật, desktop trước rồi điện thoại. Có 6 cấu hình: 1280, 1440, 1920, 1280 nền tối, 390 (cảm ứng), 360 nền tối.

Các bước:
- Vào từ Tự học, bấm nhóm Cơ thể (tiêu đề nhóm không bị thanh đầu trang che), chuyển sang N4.
- Mở trang quy luật, bấm một ví dụ để về đúng thẻ chữ.
- Luyện trọn phiên 40 câu nhóm Số đếm bằng hai dạng đề, xem kết quả, luyện lại câu sai.
- Ở 1280: luyện trọn dạng gõ cách đọc (N4 Học tập) và dạng hiểu nghĩa (toàn bộ N4); bắt đầu phiên bằng bàn phím.

Mỗi màn hình được kiểm: tràn ngang, nội dung tràn khỏi khung, vùng bấm dưới 24px, axe trên toàn trang, lỗi console.

Sửa sau khi kiểm tra:
- Logo đầu trang: nhãn cho trình đọc màn hình ("Reng, trang chủ") không chứa chữ đang hiện. Lỗi này có ở mọi trang (axe `label-content-name-mismatch`, WCAG 2.5.3). Nay nhãn là "Reng Dạy và học online, về trang chủ", chữ hiển thị có dấu cách giữa hai dòng.
- Câu chọn trong trang luyện kanji (cả kanji theo bài): sau khi bấm Kiểm tra, đáp án đúng được tô xanh có ✓, lựa chọn sai tô đỏ có ✗, kèm chữ ẩn cho trình đọc màn hình, giống câu hỏi trong lớp. Nhờ vậy so được các phương án gần giống nhau ngay trên danh sách.

Kết quả sau khi sửa:
- 0 vấn đề ở cả 6 cấu hình.
- E2E `jlpt-kanji`, `kanji`, `navigation`, `seo`, `kana` đạt 22/22.
- `npm run check` đạt 440/440.

Vệt "Đến nội dung chính" thấy trong ảnh chụp cả trang là do cách chụp. Khi kiểm ở trạng thái thật, link nằm ở `top: -100px` và chỉ hiện khi focus bằng bàn phím.

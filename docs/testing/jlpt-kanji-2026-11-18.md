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

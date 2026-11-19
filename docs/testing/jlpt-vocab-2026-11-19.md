# Kiểm chứng Từ vựng N4 theo chủ đề — 19/11/2026

Phạm vi: `/jlpt-vocab/n4`, `/jlpt-vocab/n4/practice?group=`, dữ liệu `content/vocab/n4.json`. Thiết kế ở [BD từ vựng](../basic-design/jlpt-vocab.md).

## Dữ liệu

- 388 từ, 20 chủ đề (14–20 từ mỗi chủ đề).
- Hai agent soạn song song, mỗi bên 10 chủ đề. Khi ghép, bỏ 12 từ trùng (咳, 連絡, 見物, 景色, 習慣, 選ぶ, 届ける, 調べる, 片付ける, 間に合う, 植える, 包む).
- Có đủ 38 từ mà phần Từ vựng (もんだい3–5) của đề mẫu N4 2012 và 2018 đã hỏi, gắn `paper` theo năm; test so với `N4_PAPER_WORDS`.
- Câu ví dụ viết như もんだい3 (kana, có dấu cách). Kanji trong câu chỉ lấy từ danh sách N5/N4 của Reng.
- Một agent riêng soát cả 388 từ. Không có lỗi cách đọc hay nghĩa. Đã sửa:
  - 6 câu có phương án sai cũng có thể đúng (こうさてん, きめる, てんきよほう, やわらかい, しょくじ, ルール) và 4 câu ít rủi ro hơn (ぬすむ, つとめる, じゅぎょう, ふかい): thay bằng phương án chắc chắn sai.
  - Bỏ âm Hán Việt của từ không phải Hán thuần (寝坊, 両替, 具合, 必ず); thêm cho 7 từ Hán thuần còn thiếu.
  - Từ gần nghĩa của うるさい (không phải にぎやか), của アルバイト (はたらく, như đề 2018).
  - Mẹo của 伺う (khiêm nhường của 来る là まいる), 台所 (đọc どころ), 床屋 (びよういん thường cho nữ).
  - Loại từ của 禁止, 許可, 禁煙 (danh từ + する).
  - Viết bằng kana: うまい, うるさい, たまに, しばらく, ほとんど.

## Tự động

- `tests/jlpt-vocab.test.ts` (3 test):
  - Đủ và chỉ đánh dấu từ đề mẫu.
  - Schema chặn câu không có hoặc có hai chỗ trống, phương án trùng đáp án, kanji ngoài N5/N4.
  - Phiên luyện hỏi mỗi từ một lần, dạng gần nghĩa chuyển sang dạng khác khi từ không có từ gần nghĩa.
- `npm run check`: 443/443.
- `e2e/jlpt-vocab.spec.ts` 2/2:
  - Từ Tự học vào Từ vựng N4, đủ 388 dòng, 寝坊 có Đã ra đề 2012.
  - Luyện điền từ chủ đề đầu đúng hết, mỗi câu có đúng một phương án được đánh ✓.
  - Vừa màn hình 360px; `/jlpt-vocab/n9` trả 404.
- `npm run test:e2e`: 41/41.
- `npm run build`: `/jlpt-vocab/n4` sinh tĩnh.

## Trình duyệt

Kiểm ở 1280, 1440, 1920, 1280 nền tối và 390 px: mở danh sách, luyện trọn một phiên chủ đề Cảm xúc, chọn sai một câu. Không tràn ngang, axe 0 lỗi trên danh sách và trang luyện có phản hồi, không lỗi console.

Ảnh chụp cho thấy danh sách bị vỡ thành nhiều cột hẹp: `.vocab-row` trùng tên với bảng từ vựng của trình soạn bài (`editor.css`, lưới 6 cột). Lỗi này không làm trang tràn ngang và không làm axe báo lỗi. Đã đổi sang `.vocab-entry` và kiểm lại.

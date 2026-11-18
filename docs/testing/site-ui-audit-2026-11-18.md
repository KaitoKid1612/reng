# Kiểm tra giao diện toàn site — 18/11/2026

Phạm vi: mọi trang Reng mở được bằng GET với tài khoản khách, học viên (`hoc.vien@reng.local`, lớp Minna và lớp tiếng Trung) và giáo viên (`teacher@reng.local`). Dữ liệu ở Supabase local (`supabase_*_reng-history-tests`, migration tới `20261118040000`), dev server `127.0.0.1:3017`.

## Bố cục (`npm run audit:layout`, khổ 1280, 1440, 1920, 390)

| Tài khoản | Lượt xem trang | Trước khi sửa | Sau khi sửa |
|---|---|---|---|
| Khách (`--crawl 60`) | 124 | 0 lỗi, 0 cảnh báo | — |
| Học viên (`--login --crawl 80`) | 148 | 188 lỗi, 47 cảnh báo | 0 lỗi; còn 23 cảnh báo đã chấp nhận (dưới đây) |
| Giáo viên (`--login --crawl 80`) | 180 | 9 lỗi, 12 cảnh báo | 0 lỗi; còn 2 cảnh báo đã chấp nhận |

Đã sửa:
- **Furigana đè dòng trên.**
  - Lỗi: ở Sổ lỗi, Kết quả bài tập và Chi tiết học viên, rule `.result-row p` đặt khoảng cách dòng 1.6 (đề bài là 1.7). Furigana của dòng dưới chạm chữ dòng trên, ví dụ みせ dưới （ケーキ屋で）.
  - Sửa: mọi đề bài, câu hỏi, đoạn văn và dòng kết quả có `<ruby>` nay dùng khoảng cách dòng 2.1 (`app/styles/questions.css`).
- **Nút lọc dính dòng ghi chú.** Ở trang sửa câu bài giao của giáo viên, hàng nút lọc dính sát dòng ghi chú phía trên; nay cách 16px.

Chấp nhận, không sửa:
- Cột biểu đồ điểm ở trang Luyện tập hằng ngày rộng 12px trên điện thoại. Ngay dưới có lưới Chọn ngày với ô lớn mở cùng ngày, và chú thích biểu đồ chỉ tới đó (WCAG 2.5.8 cho phép khi có nút tương đương đủ lớn).
- Danh sách slide trong trình soạn bài trên điện thoại cắt phần tóm tắt bằng dấu "…" có chủ ý. Trình soạn dùng trên desktop.

## Thao tác thật (E2E)

- `npm run test:e2e`: 39/39.
- `npm run test:e2e:supabase`: 47/47 (5,5 phút), gồm đăng ký, vào lớp, giao bài, làm bài, chấm, thi thử JLPT, thi đấu cả lớp, ôn tập, sổ lỗi, nhập từ vựng. Bài nhập từ vựng trước đây hay lỗi chập chờn, lần này đạt.
- Khu kanji đã được kiểm kỹ riêng bằng thao tác ở 6 cấu hình ([báo cáo](jlpt-kanji-2026-11-18.md#kiểm-tra-giao-diện-kỹ--18112026)).

## Áp dụng "ô tập viết" — 18/11/2026

Phương án ở [thiết kế UI](../12-ui-design.md#ô-tập-viết--nét-nhận-diện-18112026).

Thay đổi:
- Thẻ kanji, đề luyện kanji (cả trang luyện kanji theo bài) và biểu tượng card Tự học dùng ô tập viết, chữ Nhật trong ô dùng Klee One.
- `.writing-square` chuyển từ `home.css` sang `components.css`.
- Bỏ dòng eyebrow ở trang chủ và trang giáo viên.
- Bỏ hiệu ứng nảy/xoay ở card Tự học.

Ghi chú "dễ nhầm":
- Một agent vẽ cả 387 cặp bằng Klee One và Noto Sans JP; khoảng 75 chữ đáng ngờ được phóng to.
- Đã sửa 5 ghi chú:
  - 今/令: phần dưới của 令 trong Klee One là マ.
  - 音/言: nét đầu của 言 là chấm hoặc ngang tùy font.
  - 低/紙 cả hai chiều: phần thêm của 氐 là nét ngang, không phải chấm.
  - 帰/掃: nét phẩy của 帰 dài.
- Ba lỗi 低/紙 và 帰 sai cả với Noto Sans JP.

Kiểm tra:
- `audit:layout` trên trang chủ, trang giáo viên, Tự học, kana, luyện kana, kanji N5/N4, quy luật Hán Việt và luyện kanji, ở 1280, 1440, 1920 và 390 px: 36 lượt xem, 0 lỗi.
- axe ở nền sáng và nền tối trên trang chủ, trang giáo viên, kana, kanji N5 và trang luyện đang làm câu hỏi: 0 lỗi.
- Trang Tự học có `label-content-name-mismatch` ở 6 card. Lỗi này có từ trước: card đặt tên bằng tiêu đề, phần mô tả là `aria-describedby`, theo chú thích trong code. Tên vẫn chứa nhãn hiển thị nên đạt WCAG 2.5.3. Giữ nguyên.
- Đề luyện: `kanji-prompt` vẫn là cả từ (勉強, 研究), mỗi chữ một ô, không tràn ở 390 px.
- `npm run check`: 440/440. `npm run test:e2e`: 39/39.

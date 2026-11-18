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

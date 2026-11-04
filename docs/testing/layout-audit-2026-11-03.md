# Kiểm tra bố cục bằng code — 03/11/2026

Yêu cầu của người dùng: kiểm tra giao diện bằng code, xem chữ có dính hoặc chồng nhau không, bố cục có hợp lý không, có chỗ nào lỗi hoặc lệch không.

## Công cụ

`npm run audit:layout` (`scripts/audit-layout.ts`) mở từng trang của một server đang chạy bằng Chromium headless, ở nhiều độ rộng (mặc định 360, 768, 1280px), rồi đo vị trí chữ và phần tử trên trang thật:

| Loại | Mức | Phát hiện |
|---|---|---|
| `page-overflow` | lỗi | Trang rộng hơn màn hình (cuộn ngang); báo phần tử ngoài cùng bị tràn |
| `text-overlap` | lỗi | Hai đoạn chữ vẽ chồng lên nhau |
| `clipped-text` | lỗi | Chữ bị khung `overflow: hidden` cắt mất (dấu "…" chủ động chỉ là cảnh báo) |
| `control-overlap` | lỗi | Hai nút/link/ô nhập che nhau |
| `broken-image` | lỗi | Ảnh không tải được |
| `line-overlap` | cảnh báo | Các dòng của một đoạn chạm nhau (line-height quá nhỏ, dấu tiếng Việt dễ đè dòng trên) |
| `glued-text` | cảnh báo | Hai chữ từ hai phần tử dính liền không có khoảng trắng, ví dụ "Tên lớpĐã lưu"; bỏ qua chữ Hán/kana vì không dùng khoảng trắng |
| `misaligned-row` | cảnh báo | Trong một hàng nút/link một dòng, tâm chữ lệch nhau hơn 3px |
| `tight-spacing` | cảnh báo | Nút hoặc ô nhập cách chữ bên cạnh dưới 4px |
| `edge-touch` | cảnh báo | Chữ cách mép màn hình dưới 4px |
| `small-target` | cảnh báo | Nút/link nhỏ hơn 24×24px mà không đủ khoảng trống quanh (WCAG 2.5.8; link nằm trong câu được miễn) |

Kết quả: `report.md`, `report.json` và ảnh chụp toàn trang có khung đỏ (lỗi) hoặc vàng (cảnh báo) quanh chỗ cần xem, trong thư mục `--out` (mặc định `test-results/layout-audit`). Có lỗi thì thoát mã 1; `--strict` coi cả cảnh báo là lỗi.

```sh
npm run audit:layout -- --base-url http://127.0.0.1:3017                 # trang công khai
npm run audit:layout -- --base-url http://127.0.0.1:3017 --crawl 40      # đi theo link, mỗi dạng route một trang
AUDIT_EMAIL=… AUDIT_PASSWORD=… npm run audit:layout -- --login --crawl 40  # sau khi đăng nhập
```

Công cụ chỉ mở trang (GET) và không bấm nút sau khi đăng nhập, nên không đổi dữ liệu. Chỉ dùng tài khoản local hoặc tài khoản thử; mật khẩu chỉ đọc từ biến môi trường. Bỏ qua `/api`, `/auth`, `/unsubscribe`, cửa sổ presenter và tệp tải về.

Ngày 04/11/2026 quy tắc `text-overlap` bỏ qua furigana: `<rt>` nằm trên dòng chữ gốc và khung chữ gốc được nới theo furigana không còn bị báo; furigana chạm vào dòng phía trên vẫn bị báo ([rà soát 04/11](ux-review-2026-11-04.md)).

Đã thử công cụ trên một trang mẫu có sẵn đủ 11 loại lỗi: cả 11 loại đều được báo. Lần chạy đầu trên trang công khai báo nhiều cảnh báo sai, nên đã sửa ba quy tắc: link đứng riêng được miễn nếu đủ khoảng trống theo WCAG; link xuống hai dòng được so theo từng dòng; khung đánh dấu chỉ vẽ quanh dòng chữ quá sát.

## Lần chạy ngày 03/11/2026

Dev server local với Supabase local, 360/768/1280px. Trang công khai: 14 trang. Sau đăng nhập, dùng tài khoản local: giáo viên có nhiều lớp tiếng Nhật (`teacher@reng.local`, dữ liệu do E2E để lại), giáo viên lớp tiếng Trung mẫu (`co.lan@reng.local`) và học viên của lớp đó (`hoc.vien@reng.local`). Mỗi tài khoản đi theo link, mỗi dạng route một trang (32, 30 và 24 trang).

Đã sửa:

| Chỗ | Lỗi | Sửa |
|---|---|---|
| Thẻ bài học, ba cột "Bạn muốn bắt đầu từ đâu", trang Tự học, khối cuối trang giáo viên, Luyện kana, Tạo bài mới, khối Mã lớp, cài đặt lớp | Nút nằm sát dòng chữ ngay trên, vì preflight Tailwind bỏ lề đoạn văn | Nút hoặc hàng nút ngay sau đoạn văn, danh sách, ô chọn hoặc ô trả lời cách 16px |
| Trang chủ, cột Tự học | Link "Bài học công khai" lệch lên trên so với nút bên cạnh | `.button-row` căn giữa theo chiều dọc |
| Thanh nộp bài, thanh trình soạn | Lần sửa đầu đẩy nút lệch 8px so với dòng "Đã lưu lúc…" trong thanh công cụ dạng hàng | Hai thanh này không nhận khoảng cách trên |
| Ô mật khẩu, ô mã lớp, ô trả lời (làm bài, ôn tập) | Dòng gợi ý dính sát ô nhập; nút "Trả lời"/"Kiểm tra câu này" dính sát gợi ý | Gợi ý cách ô 6px; nút sau ô trả lời cách 16px |
| Chấp nhận đáp án (trang học viên của giáo viên) | Dòng giải thích dính sát nút "Chấp nhận câu trả lời này" | Cách 8px |
| Trang đăng nhập/đăng ký | Nút Google sát dòng chữ phía trên | Cách 24px |
| Trình soạn bài | Tiêu đề "Slide (9)" sát slide đầu tiên | Tiêu đề phần cách 16px |
| Flashcard | Link "Đọc lại bài học" sát nút "Thẻ trước" | Hàng nút cách 16px phía dưới |

Chấp nhận, không sửa:

- Cột ngày trên biểu đồ lịch sử học tập rộng 8px. Danh sách "Chọn ngày" ngay dưới có cùng các link với vùng bấm đủ lớn, đúng ngoại lệ "lối bấm tương đương" của WCAG 2.5.8.
- Dòng tóm tắt slide trong danh sách slide của trình soạn được rút gọn bằng "…" có chủ ý.
- Thanh nộp bài dính ở đáy màn hình che nút "Câu sau" khi chưa cuộn trên điện thoại. Cuộn xuống là thấy, vì thanh dính (sticky) luôn nằm trên nội dung. Công cụ đã được sửa để không so phần tử của thanh dính với nội dung bên dưới.

Lần chạy cuối, sau khi sửa: trang công khai, giáo viên lớp tiếng Trung và học viên không còn lỗi hay cảnh báo nào. Giáo viên lớp tiếng Nhật không có lỗi; 79 cảnh báo còn lại đều là hai mục được chấp nhận ở trên (75 cột biểu đồ, 4 dòng tóm tắt slide). Cùng lần chạy đó, học viên mở `/teach` nhận 404, đúng phân quyền. `npm run check` đạt. E2E chưa chạy theo yêu cầu người dùng ngày 03/11/2026.

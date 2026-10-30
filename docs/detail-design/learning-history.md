# Thiết kế nhập lịch sử học tập

## Dữ liệu và truy cập

Migration `202610300001_learning_history.sql` thêm `learning_history_archives`, một snapshot JSONB mỗi nguồn. Khóa nguồn duy nhất; metadata gồm học viên (có thể null), email dự kiến, giáo viên được chỉ định, tên khóa học, số dòng và thời điểm nhập. Email không được xuất ra giao diện.

`lib/learning-history.ts` kiểm tra schema v1 tại biên nhập và đọc; giới hạn 5.000 tổng hợp, 30.000 câu, dòng nguồn duy nhất mỗi nhóm. `lib/history-sheet-import.ts` kiểm tra header đã biết, loại dòng hoàn toàn trống và giữ số dòng gốc. Kết quả được phân loại để lọc; chuỗi gốc, ghi chú, đáp án, tab nguồn và điểm vẫn được giữ. Không loại dòng trùng mã câu. `null` biểu diễn điểm chưa có, `0` biểu diễn điểm thực.

Các trang đọc qua session client và RLS. Chỉ learner_id của người gọi hoặc teacher_id của người gọi có role teacher được SELECT; không cấp quyền ghi trực tiếp cho authenticated/anon. ID không hợp lệ hoặc ngoài quyền cùng trả 404. `/history` là đường dẫn riêng tư, không vào sitemap và bị chặn trong robots.

RPC import/link chỉ service_role được EXECUTE, SECURITY DEFINER với search_path rỗng để kiểm tra tài khoản Auth mà không cấp quyền đọc auth.users rộng hơn. Server Action liên kết xác thực người gọi, kiểm tra role và truyền ID phiên hiện tại; RPC kiểm tra lại giáo viên sở hữu hồ sơ, email khớp và email đã xác nhận. Không gửi thư hoặc tạo tài khoản.

## Nhập và chạy lại

Chuẩn bị JSON bằng bộ chuyển đổi rồi chạy kiểm tra mặc định:

```bash
npm run history:import -- --file /private/archive.json --source-key source-example --learner-email learner@example.test --teacher-email teacher@example.test
```

Dry-run chỉ xác thực file, không đọc tài khoản hoặc ghi DB. Thêm `--apply` để ghi bằng cấu hình Supabase server hiện tại; URL ngoài local bắt buộc thêm `--allow-remote`. Nếu học viên chưa có tài khoản, thêm `--pending-learner`. Migration phải được áp dụng trước. Không đưa file thật, email thật hoặc khóa vào git.

RPC khóa theo nguồn trong transaction; cùng nguồn/nội dung/ánh xạ trả cùng ID. Nội dung hoặc chủ sở hữu khác bị từ chối thay vì ghi đè. Lần nhập lại không bỏ liên kết học viên đã có. Đọc lại metadata để đối chiếu số dòng. Có thể gọi cùng RPC bằng SQL qua Supabase CLI đã liên kết, không cần trích xuất khóa server.

Snapshot đã nhập không tự cập nhật theo Sheet. Muốn sửa dữ liệu cần quyết định nguồn/phiên bản mới rõ ràng. Sheet nguồn chỉ đọc, giữ làm bản lưu; không thay đổi chia sẻ.

## Hiển thị

Page tải dữ liệu ở server; `history-archive-view.tsx` lọc theo query GET (`date`, `outcome`), ngày giảm dần lấy từ cả tổng hợp và chi tiết. Dùng native details/summary, React escape nội dung nguồn, wrap chuỗi dài. Không đưa toàn bộ snapshot vào component client; component client chỉ giữ trạng thái form liên kết.

Số liệu là hàm thuần trong `lib/learning-history-stats.ts`:

- Điểm quy về % bằng `điểm × 100 / thang`. Điểm của một ngày là trung bình các dòng tổng hợp có điểm trong ngày, giữ thang gốc khi các dòng cùng thang. Ngày không có điểm là `null`, không thành 0; trung bình đếm mỗi ngày một lần.
- Điểm gần nhất xét theo ngày rồi theo dòng nguồn, so với trung bình tối đa 5 dòng có điểm trước đó; mức chênh hiển thị theo thang của dòng gần nhất.
- Tỉ lệ đúng chỉ đếm `correct`/`incorrect`. Dạng bài được chuẩn hóa khoảng trắng; chỉ xếp hạng khi có từ 5 câu đã chấm.
- Dải điểm: từ 80% tốt, 60–79% trung bình, dưới 60% thấp.

Component server:

- `history-overview.tsx`: bốn ô thống kê, biểu đồ và bảng dạng bài.
- `history-score-chart.tsx`: dùng `components/charts/score-column-chart.tsx` (biểu đồ cột dùng chung với `/progress`). Mỗi cột là liên kết `?date=…#history-day` và nằm ngoài thứ tự Tab, vì danh sách ngày đã có cùng liên kết với vùng bấm lớn hơn. Cột không có liên kết thì nhận focus. Dòng đọc số liệu đổi khi rê chuột hoặc focus bằng CSS, không cần JS.
- `history-day-nav.tsx`: nút ngày nhóm theo tháng; tên truy cập là ngày đầy đủ và điểm gốc.
- `history-list-stats.tsx`: dòng tóm tắt và sparkline SVG thang cố định 0–100%.

Liên kết ngày và bộ lọc dùng `scroll={false}`, `prefetch={false}`. Phần dùng chung (token màu điểm, biểu đồ, thanh đo, chấm màu, sparkline, ô thống kê) ở `app/charts.css`; bố cục riêng của lịch sử ở `app/learning-history.css`. Cả hai nạp sau `globals.css`.

Danh sách `/history` chỉ chọn thêm `sessions:payload->sessions` (đường dẫn JSON của PostgREST) để tính thống kê, không tải bảng câu. Snapshot không đọc được thì bỏ phần thống kê thay vì làm lỗi trang.

Xem [phạm vi sản phẩm](../basic-design/learning-history.md) và [kiểm chứng](../testing/learning-history.md).

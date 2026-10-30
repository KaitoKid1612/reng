# Lịch sử học tập từ Google Sheets

Ngày thiết kế: 30/10/2026. Phạm vi là chuyển một lần lịch sử bài tập sang Reng, giữ Sheet làm bản lưu. Không nhúng Sheet công khai hoặc đồng bộ hai chiều.

## Người dùng và quyền

Một tài khoản có thể vừa dạy vừa ôn tập. Giáo viên xem lịch sử của mình và học viên được chỉ định; học viên chỉ xem lịch sử của mình. Giáo viên khác, quản trị viên không được chỉ định và khách không có quyền đọc. Khi mất quyền giáo viên, tài khoản vẫn xem lịch sử bản thân nhưng mất quyền xem học viên.

Học viên chưa đăng ký được nhập ở trạng thái chờ. Chỉ giáo viên được chỉ định xem bản chờ. Học viên đăng ký và xác nhận email trước; giáo viên xác nhận đúng người rồi bấm **Xác nhận và liên kết học viên**. Đăng ký trùng email không tự cấp quyền xem lịch sử.

## Màn hình và cách dùng

Menu tài khoản, trang lớp, tiến độ và trang giáo viên dẫn đến `/history`. Danh sách chỉ chứa hồ sơ được phép xem. Mỗi hồ sơ `/history/[id]` có ngày học, bộ lọc kết quả, tổng hợp điểm gốc và các câu có thể mở để đọc đề, câu trả lời, nhận xét. Mặc định chọn ngày gần nhất; màn hình 360px không tràn ngang.

Điểm trống khác điểm 0. Thang 10 và 100 giữ đúng nguồn. Dòng tổng hợp và chi tiết có thể lệch nhau; hiển thị nguyên bản để đối chiếu, không tự tính lại. Câu trùng mã vẫn giữ theo dòng nguồn. Không tạo submission, điểm mới hoặc lịch ôn FSRS từ dữ liệu cũ.

Ngôn ngữ được lưu cùng hồ sơ; giao diện quản lý dùng tiếng Việt, nội dung nguồn giữ nguyên Nhật/Trung. Bộ chuyển đổi hiện có cho hai cấu trúc Sheet Nhật N4/N5 đã xác minh; cấu trúc môn khác cần bộ chuyển đổi tương ứng.

Lịch sử bài tập không chứng minh đã có buổi dạy. Chưa nhập lịch sử buổi dạy khi chưa có nguồn riêng. Bài mới tiếp tục dùng bài học, lớp và bài giao của Reng; bản lịch sử chỉ để xem.

Xem [thiết kế kỹ thuật](../detail-design/learning-history.md) và [kiểm chứng](../testing/learning-history.md).

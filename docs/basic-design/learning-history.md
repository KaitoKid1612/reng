# Lịch sử học tập từ Google Sheets

Ngày thiết kế: 30/10/2026. Phạm vi là chuyển một lần lịch sử bài tập sang Reng, giữ Sheet làm bản lưu. Không nhúng Sheet công khai hoặc đồng bộ hai chiều.

## Người dùng và quyền

Một tài khoản có thể vừa dạy vừa ôn tập. Giáo viên xem lịch sử của mình và học viên được chỉ định; học viên chỉ xem lịch sử của mình. Giáo viên khác, quản trị viên không được chỉ định và khách không có quyền đọc. Khi mất quyền giáo viên, tài khoản vẫn xem lịch sử bản thân nhưng mất quyền xem học viên.

Học viên chưa đăng ký được nhập ở trạng thái chờ. Chỉ giáo viên được chỉ định xem bản chờ. Học viên đăng ký và xác nhận email trước; giáo viên xác nhận đúng người rồi bấm **Xác nhận và liên kết học viên**. Đăng ký trùng email không tự cấp quyền xem lịch sử.

## Màn hình và cách dùng

Menu tài khoản, trang lớp, tiến độ và trang giáo viên dẫn đến `/history`. Danh sách chỉ chứa hồ sơ được phép xem. Mỗi hồ sơ có dòng tóm tắt (số ngày có điểm, điểm trung bình quy về %, điểm gần nhất theo thang gốc) và đường điểm 10 ngày có điểm gần nhất, để giáo viên so sánh nhanh các học viên.

Mỗi hồ sơ `/history/[id]` mở đầu bằng phần Tổng quan cho toàn bộ lịch sử:

- Bốn ô: số ngày học và khoảng ngày; tỉ lệ câu đúng, chỉ tính câu đã chấm Đúng/Sai; điểm gần nhất theo thang gốc, có mũi tên tăng/giảm so với trung bình tối đa 5 lần có điểm trước đó; số câu chưa chấm/chưa làm (câu "Cần đối chiếu" tính là chưa chấm).
- Biểu đồ điểm theo ngày: 30 ngày gần nhất, quy về %, có mốc 80%. Bấm một cột để mở ngày đó. Ngày không có điểm là vòng tròn rỗng, không tính là 0.
- Tỉ lệ đúng theo dạng bài, dạng thấp nhất ở trên. Dạng có dưới 5 câu đã chấm không xếp hạng: chúng được gộp thành một dòng cuối "Các dạng ít câu (N dạng)" có thanh tỉ lệ chung, và danh sách từng dạng chỉ hiện khi bấm "Xem N dạng…". Tên dạng chỉ khác chữ hoa/thường, khoảng trắng hoặc cách mã hóa dấu được tính là một dạng.

Tiếp theo là danh sách ngày theo tháng. Mỗi ngày là một nút có số ngày, điểm và chấm màu: xanh từ 80%, vàng 60–79%, đỏ dưới 60%, vòng rỗng nếu chưa có điểm; màu luôn đi kèm con số. Chọn ngày giữ nguyên vị trí cuộn, phần tổng hợp ngày và câu trả lời bên dưới đổi theo. Nút lọc theo kết quả có số câu của ngày; mỗi câu có nhãn kết quả và mở ra để đọc đề, câu trả lời, nhận xét. Mặc định chọn ngày gần nhất; màn hình 360px không tràn ngang.

Điểm trống khác điểm 0. Thang 10 và 100 giữ đúng nguồn. Dòng tổng hợp và chi tiết có thể lệch nhau; hiển thị nguyên bản để đối chiếu, không tự tính lại. Câu trùng mã vẫn giữ theo dòng nguồn. Không tạo submission, điểm mới hoặc lịch ôn FSRS từ dữ liệu cũ.

Ngôn ngữ được lưu cùng hồ sơ; giao diện quản lý dùng tiếng Việt, nội dung nguồn giữ nguyên Nhật/Trung. Bộ chuyển đổi hiện có cho hai cấu trúc Sheet Nhật N4/N5 đã xác minh; cấu trúc môn khác cần bộ chuyển đổi tương ứng.

Lịch sử bài tập không chứng minh đã có buổi dạy. Chưa nhập lịch sử buổi dạy khi chưa có nguồn riêng. Bài mới tiếp tục dùng bài học, lớp và bài giao của Reng; bản lịch sử chỉ để xem.

Xem [thiết kế kỹ thuật](../detail-design/learning-history.md) và [kiểm chứng](../testing/learning-history.md).

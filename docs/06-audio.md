# Audio

## Phạm vi và trạng thái

Hợp đồng dịch vụ Việt–Trung ngày 29/10/2026. Mã nguồn hiện tại có player/pipeline tiếng Nhật và script Azure/local/R2; audio Trung và tác vụ tạo/duyệt audio trên web chưa triển khai. Kết quả cũ ở [phase-1](testing/phase-1.md) và [phase-5](testing/phase-5.md) không chứng minh audio Trung đã đạt. Không dùng giá/quota cũ để chọn gói.

## Luồng dành cho giáo viên

Giáo viên nhập chữ Hán, pinyin và nghĩa Việt, bấm tạo audio cho mục đã chọn hoặc tải bản thu có quyền sử dụng. Hệ thống xử lý ở nền, cho nghe thử và xác nhận. Không yêu cầu giáo viên chạy CLI. Bản đầu phát tiếng Trung từ câu chữ Hán với locale/voice do giáo viên chọn trong cấu hình khóa; không đọc chuỗi pinyin như văn bản tiếng Việt hoặc dùng giọng Nhật thay thế.

| Trạng thái dự kiến | Hiển thị và hành động |
|---|---|
| Chưa có | Tạo audio hoặc tải bản thu hợp lệ |
| Đang tạo | Theo dõi tiến trình, không gửi job lặp khi bấm lại |
| Cần nghe duyệt | Nghe thử, tạo lại/sửa nội dung hoặc xác nhận |
| Sẵn sàng | Phát trong slide/reader/practice đúng phiên bản |
| Lỗi | Báo lý do dễ hiểu và thử lại; không mất nội dung giáo viên nhập |
| Nội dung đã đổi | Bỏ liên kết audio cũ khỏi draft, yêu cầu tạo/duyệt lại |

Tạo audio và duyệt là hai việc riêng. Câu nghe không được xuất bản khi thiếu audio hợp lệ; slide chỉ có chữ có thể dùng nếu profile xuất bản cho phép, nhưng không được báo là đã có audio. Chính sách audio bắt buộc phải thống nhất với publisher khi triển khai wizard, không tự hạ điều kiện của phiên bản đang chạy.

## Ngôn ngữ, đầu vào và nguồn

`language_tag` của nội dung, locale/voice phát âm và `instruction_language_tag` là các trường riêng. Giáo viên chọn cấu hình phát âm phù hợp bài; không tự suy giọng/giản-phồn từ UI tiếng Việt. Module Nhật hiện có giữ ja-JP; Trung chưa cấu hình thì báo chưa sẵn sàng, không fallback sang Nhật.

Nguồn là TTS hoặc bản thu được phép dùng, có attribution khi cần. Chưa chọn voice Trung và chưa nghe duyệt tài liệu thật. Nhà cung cấp hiện có trong code là Azure; chọn giọng/gói cho Trung sau thử nghiệm và kiểm tra điều khoản, không mặc định mọi locale có cùng khả năng hoặc giá.

## Asset, cache và quyền

Sinh MP3 trước giờ học; không gọi TTS mỗi lần học sinh bấm nghe. Canonical input có text/SSML, locale, voice, rate, pitch, format và pipelineVersion; audio TTS dùng SHA-256 rút 32 ký tự. Bản thu có hash từ bytes và metadata nguồn. Đổi nội dung/cấu hình tạo asset mới, không ghi đè asset đã dùng trong snapshot.

Asset ID/hash không phải quyền truy cập. Tệp công khai được cache immutable theo hash; audio riêng của lớp/test được cấp sau kiểm tra quyền, không dùng cache công khai. Không chia sẻ cùng public URL với test cần kiểm soát. Media private phải được quản lý quyền độc lập với chống trùng nội dung, tránh suy ra quyền chỉ từ hash trùng.

MP3 mono là định dạng nền hiện có; thông số encode lấy từ pipeline config/manifest thực tế. Nguồn giọng và chất lượng phải nghe trên thiết bị thật, không coi fixture MP3 silence hoặc speech stub là kiểm chứng phát âm.

## Pipeline và hợp đồng job dự kiến

1. Server kiểm tra chủ nội dung, quota, ngôn ngữ và revision; tạo job bằng request_id để retry không nhân đôi.
2. Worker lấy lease, kiểm tra asset có thể tái sử dụng và quyền nguồn, gọi adapter TTS/upload khi cần; retry hữu hạn có backoff.
3. Chỉ ghi metadata sau upload thành công. Trả lỗi đã lọc, không log khóa hoặc nguyên đáp án test.
4. So revision/content hash trước cập nhật draft; nếu giáo viên đã đổi câu thì giữ kết quả như asset chưa gắn, không ghi đè câu mới.
5. Giáo viên nghe duyệt đúng asset và revision. Sửa câu/voice sau duyệt làm mất trạng thái duyệt của draft.
6. Xuất bản version mới, không sửa lesson_versions hoặc assignment snapshot cũ. Dọn file chỉ khi không còn quyền/tham chiếu cần giữ.

Cần worker/queue và metadata review mới trước khi có nút tạo audio trên web. Thiết kế bổ sung theo [DD dịch vụ](detail-design/teaching-service.md); chưa có job này trong runtime.

## Player và bài nghe

Phát/dừng, đổi câu/rời trang hủy nguồn cũ; lỗi có thử lại và timeout. Không tự phát khi mở trang. Bài nghe có lùi 5 giây và tốc độ 0.75x với preservesPitch; lỗi phát không tăng listen_count. Chỉ đếm lượt thành công, không coi dữ liệu client là bằng chứng chống gian lận.

Transcript/đáp án theo practice/test và feedback_policy ở [07](07-exercises-and-grading.md). Giới hạn nghe trên file đã tải không ngăn phát ngoài hệ thống; test nghe chưa được hỗ trợ trong bản hiện tại. Không tuyên bố chấm phát âm, waveform hoặc ghi âm đã có; các phần đó ngoài MVP.

Fallback giọng thiết bị chỉ dùng đúng ngôn ngữ khi có voice phù hợp và có thông báo; thiếu voice báo rõ. Bài nghe cần audio chuẩn vẫn bị chặn nếu chưa đủ điều kiện. Giọng thiết bị không thay thế việc nghe duyệt asset.

## Công cụ hiện có và nghiệm thu

`scripts/generate-audio.ts` hỗ trợ dry-run mặc định, kana, `--lessons` và `--db` cho nháp database tiếng Nhật. Dùng theo README; không xem các flag này là pipeline Trung đã hoạt động. Web wizard không được đưa hướng dẫn chạy script vào luồng giáo viên.

Nghiệm thu mới: cùng chữ Hán có locale khác không dùng nhầm giọng; nội dung đổi làm mất duyệt; retry/timeout không nhân asset/điểm/nghe; quyền lớp/test đúng; phát được và nghe rõ trên Chrome/Safari, mobile/Meet/máy chiếu thật. Ghi thời gian khởi phát cold/warm, lỗi và dung lượng; mục tiêu 300 ms là yêu cầu cần đo, không phải kết quả.

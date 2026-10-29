# Truy vết và nghiệm thu giai đoạn 5 (phần A — luyện nghe)

> Phạm vi nền Nhật: tài liệu giai đoạn này giữ thiết kế/bằng chứng triển khai trước dịch vụ Việt–Trung; không chứng minh tính năng mới đã có. Thiết kế hiện hành xem [BD dịch vụ](../basic-design/teaching-service.md), [DD dịch vụ](../detail-design/teaching-service.md) và [checklist dịch vụ](../testing/teaching-service.md). Kết quả PASS/Chưa chạy lịch sử được giữ nguyên.

PASS local không thay thế nghe thử audio Azure thật trên điện thoại. BD/DD tại ../basic-design/phase-5.md và ../detail-design/phase-5.md.

| ID | Yêu cầu | Kiểm tra | Kết quả |
|---|---|---|---|
| G5-01 | Player (06) | Không thanh tua; Lùi 5 giây; Chậm 0.75x giữ cao độ | PASS Chromium — playbackRate 0.75, preservesPitch bật, lùi từ hơn 1 giây về dưới 1 giây; không có thanh tua hay thời lượng |
| G5-02 | Đếm lượt nghe | Phát từ đầu tính một lượt; tạm dừng/tiếp tục không tính; đạt giới hạn khóa nút Nghe | PASS Chromium — 1 lượt, tiếp tục vẫn 1, phát lại sau khi hết thành 2/2, nút Nghe bị khóa và báo hết lượt |
| G5-03 | Audio lỗi | Lỗi tải không tính lượt, bấm lại được | PASS Chromium — 404 báo lỗi với 0 lượt, lần sau phát được và tính 1 lượt. Hết 10 giây chưa phát dùng cùng nhánh lỗi, chưa có E2E riêng |
| G5-04 | Transcript khóa | Transcript/đáp án không có trong trang trước khi trả lời | PASS — unit: QuestionView không có transcript/answer/explain; E2E: HTML S15 không chứa transcript, sau Kiểm tra mới hiện |
| G5-05 | Dictation (07) | Chấm theo phương án khai báo, ô nhập theo chế độ | PASS — S15 trả lời sai báo Chưa đúng kèm đáp án; bài giao trả lời đúng được 100% |
| G5-06 | Soạn câu nghe | Editor thêm listen/dictation; thiếu transcript/đáp án/audio không xuất bản; đổi transcript xóa audio; slide quiz chỉ choice/fill | PASS — unit cho lỗi xuất bản, reducer, bỏ options thừa; E2E báo 2 câu chưa có audio trước khi sinh |
| G5-07 | Audio cho nháp database | Script `--lessons --db --sync-db` đọc nháp, đăng ký audio_assets, ghi hash kèm kiểm tra revision | PASS Supabase local — chạy script thật (`--local`, file có sẵn nên không gọi TTS): 2 hash vào nháp, URL /audio/lessons/{hash}.mp3, sau đó xuất bản được. Nhánh nháp bị sửa giữa chừng mới kiểm tra bằng đọc mã |
| G5-08 | Bài giao practice | Câu nghe giao được; listen_count lưu theo lượt; giá trị sai bị từ chối | PASS — PGlite: listen_count trên 100, số lẻ, chuỗi, số âm hoặc gắn cho câu không nghe → invalid_results; E2E lưu 1 và 6 lượt, kết quả hiện transcript và số lượt |
| G5-09 | CLASS-03 | Điểm nghe, nghe trung bình và nhãn yếu nghe từ lượt mới nhất | PASS — PGlite class_listening_summary chỉ lấy lượt mới nhất; E2E điểm 100% nhưng nghe trung bình 3.5 → "Yếu phần nghe", chi tiết học viên hiện số lượt từng câu |
| G5-10 | Thiết bị | S15 ở 360px | PASS smoke Chromium — không cuộn ngang. Nghe thật trên điện thoại chưa thử |
| G5-11 | Audio thật | Azure TTS cho transcript, nghe duyệt, R2 | Chờ cấu hình |
| G5-12 | Ngoài phần A | Câu nghe trong bài test, kanji, furigana, audio hội thoại | Chưa làm |

## Bằng chứng

- 28/10/2026: npm run check qua (70 test logic/database, gồm PGlite cho migration 0006). npm run test:e2e:supabase 19/19 (thêm 4 test luyện nghe); npm run test:e2e 21/21. Production build thành công, /listening/[lessonId] và API check render theo request. Migration 0006 đã áp dụng lên Supabase local bằng `supabase migration up --local`.
- Audio trong E2E là MP3 im lặng trả qua `page.route` có hỗ trợ Range như máy chủ tĩnh; thiếu Range thì trình duyệt không cho tua nên không kiểm được lùi/hết bài.
- Lỗi tìm thấy khi kiểm chứng và đã sửa: ô nhập tiếng Nhật thiếu `type="text"` nên không nhận viền của input — ô điền từ/chính tả gần như vô hình, ảnh hưởng cả bài giao và ôn tập từ giai đoạn 3.
- Ảnh rà giao diện: test-results/listening-desktop.png, test-results/listening-mobile.png (gitignore).

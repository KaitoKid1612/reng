# Basic Design giai đoạn 5 — Luyện nghe (phần A)

Baseline 28/10/2026. Phần A làm luyện nghe với audio TTS sinh trước. Kanji (KANJIDIC2/KanjiVG), furigana tự động và audio hội thoại thu âm/đa giọng chờ quyết định giấy phép và nguồn audio; không nằm trong phần này. Yêu cầu nguồn: LISTEN-01/02/03/04/05/06, CLASS-03 (yếu phần nghe) trong 01; luật chấm 07; audio 06.

## Phạm vi

Giảng viên thêm câu nghe chọn đáp án, nghe điền và chính tả vào bài học trong editor, kèm transcript tiếng Nhật làm nguồn TTS. Người vận hành chạy script sinh audio cho bản nháp trong database; giảng viên xuất bản khi đã có audio. Học viên luyện nghe theo bài tại S15 và trong bài giao practice; giảng viên thấy điểm nghe và số lần nghe trên bảng theo dõi.

Ngoài phần A: câu nghe trong bài test (cần phân phối audio riêng có thời hạn theo 06 và cách tạo audio từ màn hình giao bài), giới hạn lượt nghe do server cấp, ghi âm/chấm phát âm, sprite audio.

## Màn hình

| ID | URL | Hành vi chính |
|---|---|---|
| S15 | /listening/[lessonId] | Mỗi câu nghe: nút Nghe, Lùi 5 giây, Chậm 0.75x, không có thanh tua; số lần nghe nhỏ dưới player; trả lời rồi bấm Kiểm tra mới thấy đúng/sai, giải thích và transcript. Không cần đăng nhập, không lưu kết quả |
| S11/S12 | /assignments/[id], /assignments/[id]/results | Câu nghe/chính tả trong bài luyện dùng cùng player; số lần nghe được lưu theo lượt; kết quả hiện transcript và số lần đã nghe |
| T03/T04 | /teach/classes/[id], /teach/classes/[id]/students/[uid] | Cột "Nghe lại TB", nhãn "Yếu phần nghe" theo 07; chi tiết học viên có số lần nghe từng câu |
| T05 | /teach/classes/[id]/assign | Danh sách câu luyện giao được có câu nghe/chính tả kèm nhãn loại |
| T06 | /teach/lessons/[id]/edit | Thêm câu nghe chọn đáp án, nghe gõ đáp án, chính tả; giới hạn số lần nghe tùy chọn; trạng thái audio và lệnh cần chạy |

Trang đọc bài có lối vào "Luyện nghe (N câu)" khi bài có câu nghe.

## Luồng

1. Giảng viên soạn câu nghe (đề, transcript, đáp án, giải thích) → lưu nháp. Xuất bản báo "câu nghe cần audio" cho tới khi có audio.
2. Người vận hành chạy `npm run audio:generate -- --lessons --db --local|--r2 --sync-db`: script đọc nháp trong database, sinh audio còn thiếu (từ vựng, câu ví dụ, transcript câu nghe), đăng ký audio_assets và ghi mã audio vào nháp nếu nháp không bị sửa trong lúc chạy.
3. Giảng viên mở lại editor, nghe thử ở S15 sau khi xuất bản.
4. Học viên nghe: lần phát từ đầu (kể cả phát lại sau khi hết) tính một lần nghe; tạm dừng/tiếp tục và lùi 5 giây không tính thêm; audio lỗi không tính. Câu có giới hạn nghe khóa nút Nghe khi đạt giới hạn (chỉ là quy tắc trải nghiệm ở bài luyện).
5. Transcript chỉ trả về sau khi học viên gửi câu trả lời.

## Ngoại lệ

| Tình huống | Kết quả |
|---|---|
| Câu nghe chưa có audio | Không xuất bản được; editor chỉ lệnh sinh audio cần chạy |
| Tải audio lỗi hoặc quá 10 giây | Báo lỗi, bấm Nghe để thử lại, không tính lượt nghe |
| Nháp bị sửa khi script đang chạy | Script bỏ qua bài đó và báo chạy lại; không ghi đè |
| Script vừa ghi audio khi editor đang mở | Lưu nháp báo xung đột revision; tải lại trang để lấy bản có audio |
| Bài không có câu nghe | S15 báo chưa có câu luyện nghe, có nút về bài học |

## Điều kiện nghiệm thu

Truy vết tại [checklist giai đoạn 5](../testing/phase-5.md). Local: audio lỗi không mất lượt nghe, transcript không có trong payload trước khi trả lời, chính tả chấm đúng phương án khai báo, số lần nghe vào báo cáo và nhãn yếu nghe, script ghi audio vào nháp database có kiểm tra revision. Nghe thật trên điện thoại, audio Azure đã duyệt và kanji là điều kiện riêng.

# Bài tập và chấm điểm

Hợp đồng đi cùng schema ở 03. Nền grading/classroom Nhật đã có mã nguồn và bằng chứng local ở testing/phase-3.md và phase-5.md; profile Trung/soạn theo mẫu/scan/chấm tay là thiết kế mới chưa triển khai. Không đánh dấu tiêu chí dịch vụ đạt chỉ vì unit tests nền đã qua.

## Dạng bài và cách nhập

| Dạng | Tương tác | Quy tắc chấm bản đầu |
|---|---|---|
| choice | Chọn một hoặc nhiều lựa chọn | Tập chỉ số trùng hoàn toàn với đáp án; không tính thứ tự chọn |
| fill | Gõ tiếng Nhật | Chuỗi chuẩn hóa trùng một đáp án được khai báo |
| match | Bấm chọn hai bên, có bàn phím | Tất cả cặp đúng, không tính thứ tự ghép |
| order | Bấm chọn hoặc kéo thả bằng dnd-kit | Đúng toàn bộ thứ tự ID token |
| listen | Player và choice/fill | Theo responseType; áp dụng giới hạn nghe nếu có |
| dictation | Player và gõ tiếng Nhật | Như fill |

Mỗi câu đúng nhận đủ `points`, sai hoặc bỏ trống nhận 0; bản đầu không có điểm từng phần. Tổng điểm nguyên, phần trăm tính từ tổng điểm đạt/tổng điểm tối đa, không lấy trung bình tỷ lệ từng câu. Chỉ làm tròn số hiển thị; xét đạt bằng giá trị chưa làm tròn. Tổng điểm tối đa phải lớn hơn 0.

Riêng ô nhập tiếng Nhật hỗ trợ wanakana cho người chưa có IME. `inputMode` hiragana/katakana quyết định chuyển romaji; chế độ japanese phải cho nhập kanji bằng IME hoặc dán văn bản. Khi đang composition không can thiệp chuyển đổi. Bài luyện kana hỏi romaji dùng input Latin, không gắn chuyển kana. Chấp nhận các biến thể romaji được khai báo trong acceptedRomaji; chuẩn hóa chữ thường và khoảng trắng đầu/cuối.

## Chuẩn hóa và đáp án tương đương

```ts
function normalizeAnswer(s: string): string {
  return s.normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[。．.]$/, '');
}
```

- Giữ dấu `、` giữa câu, âm dài, âm ngắt, âm đục và sự khác nhau hiragana/katakana; không tự sửa lỗi ngữ pháp.
- Hàm trên không chuyển kanji sang kana. Giảng viên phải khai báo rõ các đáp án tương đương, ví dụ `["行きます", "いきます"]`. Không dùng đọc âm tự động để kết luận hai câu cùng nghĩa.
- `kanjiStrict = true`: validator yêu cầu đáp án chứa dạng kanji mục tiêu; không tự thêm phương án kana. `kanjiStrict = false` vẫn chỉ chấp nhận các phương án được khai báo, không có phép suy diễn vô hạn.
- Choice từ chối chỉ số ngoài phạm vi hoặc trùng; match từ chối cặp thiếu/trùng; order từ chối token lạ hoặc thiếu. Giới hạn kích thước câu trả lời tại API theo từng dạng, không chuyển kiểu ngầm từ dữ liệu tùy ý.

## Bài luyện và bài kiểm tra

Logic chấm thuần nằm ở `lib/grading/`, không chứa khóa hoặc truy cập database.

| Quy tắc | practice | test |
|---|---|---|
| Nguồn câu hỏi | Câu luyện ở phiên bản bài học đã chọn | Câu hỏi riêng, chưa được công khai qua slide/trang luyện |
| Chấm tức thì | Có, client dùng logic chung | Không |
| Điểm lưu báo cáo | Server chấm lại từ raw, không tin điểm client | Server chấm từ snapshot |
| Payload trước nộp | Có đáp án và giải thích; transcript chỉ trả sau khi trả lời trong luồng luyện | Không có answer/explain/transcript hoặc ghi chú giảng viên |
| Phản hồi | Sau từng câu và khi nộp | `after_submit` hoặc `after_due` |

Transcript khóa trong bài luyện là quy tắc trải nghiệm, không bảo đảm chống xem trước khi đáp án luyện đã công khai. Bài test phải ẩn transcript phía server.

`feedback_policy`: practice chỉ dùng after_submit cho kết quả tổng kết. Test mặc định after_due; bắt buộc due_at và max_attempts = 1. Nếu giáo viên chọn after_submit thì vẫn chỉ một lượt, đáp án xuất hiện sau khi nộp. Khi chưa tới thời điểm phản hồi, API chỉ trả xác nhận đã nộp và thời gian; không trả điểm, passed, đúng/sai từng câu hoặc giải thích. Giáo viên vẫn xem được kết quả lớp mình. Không hứa ngăn học viên chia sẻ câu hỏi ngoài hệ thống.

## Bắt đầu, lưu và nộp bài

1. API xác thực user, thành viên lớp, bài đã xuất bản và còn mở; kiểm tra available_at của bài trong lớp. Quá due_at chỉ cho bắt đầu/nộp nếu allow_late = true. So sánh theo thời gian server; đúng bằng hạn vẫn được nộp, sau hạn là muộn.
2. Khóa cặp assignment/user trong transaction. Nếu có lượt in_progress thì trả lại lượt đó; nếu không, kiểm tra số lượt đã tạo và max_attempts rồi tạo lượt mới. Lượt bỏ dở vẫn chiếm một lượt, có thể tiếp tục cho tới hạn. Không tạo lượt mới chỉ vì tải lại trang.
3. API trả snapshot đã lọc theo mode, không đọc câu hỏi từ bản nháp hiện tại.
4. Lưu draft lên server sau khi câu trả lời thay đổi, debounce và khi chuyển câu. Dùng draft_revision để phát hiện ghi đè giữa hai tab; báo xung đột và yêu cầu tải bản mới. Chỉ hiện “Đã lưu” khi server xác nhận.
5. Mất mạng: giữ bản chưa đồng bộ cục bộ theo user/submission, báo rõ chưa lưu; khi có mạng so revision trước khi gửi tiếp. Bản cục bộ là dự phòng, server là nguồn chính. Xóa bản cục bộ khi đăng xuất hoặc nộp thành công; không cache đáp án test. Không tự ghi đè draft mới hơn.
6. Cho nộp khi có câu trống nhưng phải xác nhận số câu; câu trống tính 0. Bài quá hạn không được nộp nếu allow_late false, giữ draft để giải thích trạng thái.
7. Khi nộp, server khóa submission, kiểm tra lại quyền, trạng thái và hạn, chấm từ snapshot, ghi answers/score/max_score/passed/is_late, cập nhật submitted_at và thẻ lỗi trong cùng transaction. Không nhận điểm từ client. Đã nộp thì không sửa raw hoặc chấm lại tự động.
8. Bấm nộp hai lần hoặc gửi lại vì timeout: submission ID xác định một lần chấm. Nếu đã submitted, trả kết quả cũ theo quyền phản hồi, không cộng lượt hay tạo thêm answers/thẻ lỗi. Lỗi trước commit thì rollback toàn bộ và cho thử lại.

Lượt test đã tạo không đổi đề khi giáo viên xuất bản phiên bản mới. Thay đổi điều kiện bài giao cần tạo bài mới theo `03`.

`listen_count`, `time_ms` là dữ liệu quan sát client, không dùng quyết định đạt/trượt và không coi là bằng chứng chống gian lận. Chỉ tăng listen_count sau khi phát thành công; audio lỗi không tính lượt. Với test có giới hạn nghe, server cấp quyền phát theo lượt; file công khai đã tải vẫn có thể bị phát lại bên ngoài. Nếu cần kiểm soát nghiêm ngặt hơn phải thiết kế phân phối media riêng trước khi cam kết.

## Điểm báo cáo và nhãn học viên

- Nhiều lượt practice: lấy lượt đã nộp mới nhất, không lấy lượt cao nhất. Chưa nộp hiển thị riêng, không biến thành điểm 0 trong trung bình.
- Điểm trung bình lớp/học viên dùng trung bình phần trăm các bài có lượt đã nộp mới nhất; hiển thị kèm số đã nộp/tổng được giao. Không trộn bài có tổng điểm khác nhau bằng điểm thô.
- passed của từng bài dùng pass_score chụp trong assignment. Nhãn chung dùng classes.pass_score.
- Phần nghe chỉ tính các câu listen/dictation; chưa có dữ liệu nghe thì không gắn nhãn yếu nghe. Thời điểm cần chú ý dựa trên số lần nghe chỉ là tín hiệu hỗ trợ giảng viên.

Thứ tự ưu tiên nhãn: bỏ bài → chưa đạt → yếu phần nghe → đạt. Không có bài nộp và chưa đủ điều kiện bỏ bài thì hiển thị “Chưa có dữ liệu”. Bỏ bài nghĩa là hai bài gần nhất đã quá hạn đều chưa có lượt nộp; chỉ xét bài đã giao cho người đó và không tính bài không có hạn. Rời lớp rồi vào lại chỉ xét bài có published_at từ lần joined_at hiện tại.

Nhãn được tính lại khi mở báo cáo và tác vụ hằng ngày, không chỉ khi có bài nộp. Chưa đạt khi trung bình dưới ngưỡng lớp; yếu nghe khi điểm chung đạt nhưng điểm nghe dưới 60% hoặc lần nghe trung bình trên 3. Nhãn là chỉ báo học tập, không phải kết luận năng lực thi thật.

## Thống kê câu sai nhiều nhất

Chỉ dùng lượt nộp mới nhất mỗi học viên để người làm nhiều lượt không có trọng số lớn hơn. Ví dụ SQL cho một bài giao, chạy phía server sau khi kiểm tra giáo viên sở hữu lớp:

```sql
with latest as (
  select distinct on (user_id) id, assignment_id, user_id
  from submissions
  where assignment_id = $1 and status = 'submitted'
  order by user_id, submitted_at desc, attempt_no desc
)
select i.question_id,
       i.question_snapshot ->> 'prompt' as prompt,
       count(*) filter (where not a.is_correct) as so_sai,
       count(*) as tong
from latest s
join answers a on a.submission_id = s.id
join assignment_items i
  on i.assignment_id = s.assignment_id and i.question_id = a.question_id
group by i.question_id, i.question_snapshot ->> 'prompt'
having count(*) filter (where not a.is_correct) >= count(*) * 0.5
order by so_sai desc, i.question_id;
```

Hiển thị mẫu số người đã nộp. Ngưỡng 50% là tín hiệu nên xem lại nội dung/cách giảng, không tự kết luận nguyên nhân.

## Ôn tập và sổ lỗi

Dùng thư viện FSRS với phiên bản được khóa khi triển khai, lưu đầy đủ scheduler_state và review_events như `03`. Bốn mức: quên, khó, được, dễ. API cập nhật lịch và ghi sự kiện cùng transaction, request_id chống ghi trùng khi retry.

Câu sai tạo hoặc mở lại thẻ mistake. Ba lần đúng liên tiếp trong ba lượt ôn thì đánh dấu resolved; sai reset chuỗi. Với lỗi từ test, chỉ mở nội dung ôn khi feedback_policy cho phép xem đáp án, tránh lộ trước hạn. Không xóa lịch sử ôn khi giải quyết lỗi.

## Đề thi thử

Giai đoạn 6 mới làm. Bản đầu dùng điểm luyện tập theo trọng số, không tuyên bố tái tạo điểm chuẩn hóa của kỳ thi JLPT. Trước khi xây đề thi thử, đối chiếu nguồn JLPT chính thức về cấu trúc, thời lượng, điều kiện đạt và công bố rõ phương pháp quy đổi mang tính ước lượng. Chưa chốt bảng điểm thi thật trong hợp đồng chấm hiện tại.

## Xuất CSV

Chỉ giáo viên lớp đó được xuất: họ tên, email, số bài nộp/tổng bài giao, điểm phần trăm trung bình, điểm từng bài, nhãn và ngày học gần nhất. Điểm chưa có để trống, không thay bằng 0. Escape trường CSV, vô hiệu hóa ô có thể bị phần mềm bảng tính hiểu là công thức, giữ đúng dấu tiếng Việt. Bản đầu xuất từng lớp, không xuất dữ liệu ngoài phạm vi lớp.

## Tiêu chí kiểm chứng khi triển khai

- NFKC và đáp án thay thế chấm đúng; không tự đổi kana/kanji hoặc bỏ âm dài.
- Choice nhiều đáp án, match, order không nhận dữ liệu trùng/ngoài phạm vi; bỏ trống tính 0.
- Học viên không tự sửa điểm, không xem bài nộp người khác; lớp khác không truy cập được.
- Test không lộ đáp án, transcript, ghi chú hoặc kết quả trước thời điểm phản hồi qua bất kỳ API/payload nào.
- Hai tab bắt đầu đồng thời chỉ tạo một lượt; nộp trùng và timeout không nhân kết quả/thẻ lỗi.
- Mất mạng và xung đột draft không làm mất bản mới hơn; quá hạn xử lý theo giờ server.
- Sửa bài học không đổi snapshot/điểm cũ; thống kê chỉ lấy lượt mới nhất.
- Nhãn bỏ bài cập nhật dù học viên không nộp; câu sai từ test chưa được xem không lộ qua sổ lỗi.

## Bài từ ảnh scan và ngôn ngữ mới — chưa triển khai

Theo [BD dịch vụ](basic-design/teaching-service.md), ảnh/PDF chỉ là nguồn nhập. OCR tạo draft choice/fill; giáo viên đối chiếu câu, lựa chọn và đáp án trước khi xuất bản thành snapshot. Không tự giải bài rồi coi kết quả AI là đáp án chuẩn. Nếu ảnh có lời giải phải loại/crop khỏi media học sinh; test không lộ đáp án qua ảnh, preview, PDF hoặc tài nguyên chia sẻ.

Nhật giữ quy tắc ở trên. Tiếng Trung cần language profile và input IME/Unicode, không chuyển bằng wanakana; giữ thanh điệu và giản/phồn trừ các phương án tương đương giáo viên khai báo. Không thay normalize toàn cục làm đổi điểm snapshot Nhật cũ.

Tự luận/ảnh bài làm chưa có chấm tay trong code; ngoài MVP scan. Chỉ bật sau thiết kế pending_review/graded và audit người chấm; chờ chấm không coi là sai hoặc 0, báo cáo không coi là chưa nộp.

## Profile Trung và xác nhận đáp án — dự kiến

Bài tập từ wizard hoặc scan đi qua cùng validator/review phía server. Mặc định so sánh Unicode NFC và khoảng trắng đầu/cuối cho profile Trung; giữ dấu thanh, khoảng trắng bên trong pinyin, dấu câu, giản/phồn và chữ hoa/thường nếu chưa có quy tắc khác được chụp vào snapshot. Không áp tự động quy tắc xóa mọi khoảng trắng/dấu chấm của normalizeAnswer Nhật cho pinyin. Giáo viên khai báo phương án tương đương; không tự dịch hoặc chuyển pinyin sang chữ Hán để chấm.

MVP hỗ trợ yêu cầu điền chữ Hán hoặc pinyin bằng loại câu/input profile rõ; không suy ra từ câu học sinh nhập. Câu thiếu đáp án, choice có lựa chọn trùng hoặc câu chưa được xác nhận ở revision hiện tại bị chặn xuất bản. Sửa nội dung chấm làm mất review cũ. Điểm/đạt/trượt do server tính từ snapshot, feedback_policy không đổi.

Nhãn yếu nghe chỉ có khi có câu nghe; lớp mới hoặc chưa nộp hiển thị chưa có dữ liệu. Không dùng nhãn đạt để chứng nhận trình độ HSK/JLPT; thi chuẩn hóa ngoài MVP. Chấm tay là Service D, chưa có cơ chế sửa điểm thủ công trong bản hiện tại.

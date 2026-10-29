# Detail Design giai đoạn 5 (phần A)

> Phạm vi nền Nhật: tài liệu giai đoạn này giữ thiết kế/bằng chứng triển khai trước dịch vụ Việt–Trung; không chứng minh tính năng mới đã có. Thiết kế hiện hành xem [BD dịch vụ](../basic-design/teaching-service.md), [DD dịch vụ](../detail-design/teaching-service.md) và [checklist dịch vụ](../testing/teaching-service.md). Kết quả PASS/Chưa chạy lịch sử được giữ nguyên.

Theo [BD](../basic-design/phase-5.md), schema câu listen/dictation trong 03 (đã có từ giai đoạn 2), luật chấm 07, audio 06.

## Audio cho câu nghe

- Câu `listen` và `dictation` có `audio` (hash), `transcript`, `maxListens`. TTS dùng transcript với cấu hình canonical như từ vựng (ja-JP, giọng mặc định, MP3 mono); hash đổi khi transcript đổi, reducer editor xóa hash cũ khi transcript thay đổi.
- `planContentAudio`/`applyContentAudio` (lib/lesson-audio.ts) thêm mục `lesson:question:id` cho câu nghe, bỏ qua chuỗi rỗng; `planLessonAudio` dùng lại cho draft JSON trong repo.
- `scripts/generate-audio.ts --lessons --db [--lesson id]` đọc `draft_content` chưa lưu trữ từ Supabase bằng schema nháp nới lỏng (bài không khớp schema bị bỏ qua có cảnh báo). Sau khi asset có trong storage và metadata, ghi hash vào nháp bằng `UPDATE … WHERE draft_revision = expected` và tăng revision; revision đổi thì bỏ qua bài đó và báo chạy lại. Không tự xuất bản, không đụng manifest file.
- `--sync-db` vẫn yêu cầu `--r2` (URL công khai) với database cloud; với Supabase local (127.0.0.1/localhost) cho phép `--local` để đăng ký `/audio/lessons/{hash}.mp3`. File đã có trong storage thì không gọi TTS.

## Editor

- Schema nháp có `draftListenSchema`/`draftDictationSchema` nới lỏng (chuỗi rỗng, `answer` rỗng, `maxListens` 1..100 hoặc null) đứng trước schema xuất bản trong union, nên câu nghe cũ vẫn đọc được.
- `components/editor/listening-question-editor.tsx`: đề bài, transcript, trạng thái audio (`data-testid="question-audio-status"`), cách trả lời (chọn một / gõ) cho `listen`, lựa chọn + đáp án đúng (radio), đáp án chấp nhận mỗi dòng một phương án, ô nhập và kanji bắt buộc cho `dictation`, giới hạn lượt nghe, điểm, giải thích. Đổi sang "gõ đáp án" bỏ options; `toPublishableContent` cũng bỏ options thừa và dòng đáp án trống.
- Lỗi xuất bản theo thứ tự: đề, giải thích, điểm, transcript, đáp án, rồi "chưa có audio. Lưu nháp rồi chạy `npm run audio:generate -- --lessons --db --sync-db`". `listAudioHashes` gồm hash câu nghe nên xuất bản kiểm tra đăng ký trong audio_assets. Editor đếm câu nghe thiếu audio riêng với từ/câu ví dụ (vốn có giọng thiết bị dự phòng).
- Slide quiz chỉ tham chiếu câu choice/fill (`isQuizQuestion`), vì slide không phát audio.

## Chấm và payload

- `isAssignableQuestion` nhận thêm listen/dictation; câu kiểm tra riêng (test) vẫn chỉ choice/fill. QuestionView: listen có `audio`, `maxListens`, `responseType`, `options` (khi choice, luôn một đáp án); dictation có `audio`, `maxListens`, `inputMode`. Không có transcript/answer/explain trước phản hồi. Câu listen dạng gõ dùng ô tiếng Nhật chế độ japanese.
- Draft lượt làm thêm `listens: {questionId: 0..100}` (số nguyên, chỉ cho câu nghe; bản sao localStorage cũng mang trường này). `updateDraft` nhận hàm cập nhật để lượt nghe bất đồng bộ không ghi đè câu vừa gõ. Khi nộp, server gửi `listen_count` từ draft cho mỗi câu.
- Migration 0006 thay `submit_attempt` (giữ chữ ký và quyền): `listen_count` vắng → 0; có thì phải là số JSON nguyên 0..100 và chỉ > 0 với câu listen/dictation, sai → `invalid_results`. Đây là dữ liệu quan sát phía client, không quyết định đạt/trượt (07).
- POST `/api/lessons/[id]/questions/[questionId]/check` nhận `{answer, version?}` (tối đa 64 KB): chỉ câu luyện công khai giao được của phiên bản; parse đáp án theo QuestionView, chấm bằng lib/grading và trả `{isCorrect, correctText, explain, transcript}` (transcript null với câu không nghe). Câu không tồn tại/không hỗ trợ → 404, đáp án sai dạng → 400. Không lưu gì. GET hiện có cho slide giữ nguyên.
- Kết quả học viên (sau mốc phản hồi) và chi tiết học viên của giảng viên hiện transcript và số lần nghe từng câu nghe.

## Player

`components/listening/listening-player.tsx` dùng HTMLAudioElement riêng cho từng câu: Nghe/Tạm dừng, Lùi 5 giây (`currentTime - 5`, không âm, chỉ bật khi đang phát/tạm dừng), Chậm 0.75x (`playbackRate`, `preservesPitch`, `aria-pressed`). Không render thanh tua hay thời lượng. Lượt nghe tăng ở sự kiện `playing` khi bắt đầu từ đầu hoặc sau `ended`; tạm dừng/tiếp tục không tăng; lỗi tải hoặc quá 10 giây chưa phát thì hủy element, báo lỗi, không tăng. Đạt maxListens thì vô hiệu nút Nghe và báo hết lượt. Hủy nguồn khi unmount. URL từ `NEXT_PUBLIC_LESSON_AUDIO_BASE_URL` hoặc `/audio/lessons`.

## S15

`app/listening/[lessonId]/page.tsx` đọc phiên bản công khai (`?version=` tùy chọn), chỉ gửi QuestionView của câu nghe xuống client. `ListeningPractice` giữ đáp án, lượt nghe, kết quả trong trang (không cần đăng nhập, không lưu), gọi API check rồi hiện AnswerFeedback kèm transcript; "Làm lại câu này" xóa đáp án và kết quả, giữ lượt nghe. Trang đọc bài hiện nút "Luyện nghe (N câu)" khi bài có câu nghe.

## Báo cáo

RPC `class_listening_summary(class)` (service_role) lấy lượt nộp mới nhất của mỗi học viên cho từng bài giao của lớp, cộng điểm đạt, điểm tối đa, tổng listen_count và số câu của các câu listen/dictation. `summarizeListening` tính điểm nghe = đạt/tối đa và nghe trung bình = tổng lượt/số câu; không có câu nghe thì cả hai null và không gắn nhãn yếu nghe (07). Bảng lớp, CSV, chi tiết học viên và tóm tắt email giảng viên dùng chung kết quả này.

## Kiểm chứng

Unit: kế hoạch audio có transcript, lỗi xuất bản câu nghe, reducer xóa audio khi đổi transcript, payload không lộ transcript, draft listens, tổng hợp nghe; PGlite cho migration 0006. E2E Supabase với MP3 im lặng qua `page.route` (trả Range như máy chủ tĩnh): soạn câu nghe, chạy script thật với `--db --local --sync-db` trên file có sẵn, xuất bản; S15 đếm lượt, lùi/chậm/tạm dừng, hết lượt, audio 404 không tính lượt, transcript sau khi trả lời; bài giao practice lưu listen_count, kết quả hiện transcript, báo cáo hiện nghe TB và nhãn yếu nghe.

# Bộ đề nghe Minna 1–15 — 04/11/2026

Người dùng yêu cầu làm tiếp các đề cho bài nghe và cách làm.

## Đã làm

- **Bộ đề** [content/listening/minna-1-15.json](../../content/listening/minna-1-15.json): 90 câu tự biên soạn cho Minna no Nihongo Sơ cấp I, bài 1–15. Mỗi bài 6 câu: 3 câu nghe rồi chọn đáp án, 2 câu nghe rồi gõ một từ, 1 câu chép chính tả bằng hiragana. Lời nghe chỉ dùng từ và mẫu câu của bài đó và các bài trước, một giọng đọc, viết bằng kana có cách. Mỗi câu có giải thích nghĩa tiếng Việt và điểm ngữ pháp.
- **Nạp thành bài nháp:** `npm run listening:sql` viết SQL tạo bài nháp "Luyện nghe Minna 1–15" cho một giáo viên (theo email), không đụng bài đang dạy. Chạy lại không tạo bài trùng.
- **Trình soạn:** các câu chỉ thiếu audio được gộp thành một dòng ("Câu luyện 1–90: 90 câu nghe chưa có audio…") thay vì lặp lại 90 lần.
- **Ô gõ hiragana** nhắc trợ từ は, へ, を gõ ha, he, wo. Gõ theo âm nghe được ("wa") sẽ ra わ và bị chấm sai.
- **Hướng dẫn** từng bước và cách viết câu nghe mới: [soạn bài › Làm bài nghe](../content-authoring.md#làm-bài-nghe).

## Kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| `tests/listening-bank.test.ts` | 15 bài × 6 câu. Đáp án chép chính tả là lời nghe bằng kana. Khi có audio, mọi câu qua schema xuất bản, giao được và chấm đúng theo đáp án của chính câu. Khi chưa có audio, trình soạn chặn xuất bản bằng một dòng |
| SQL trên Supabase local, chạy hai lần cho `ui-teacher@reng.local` | Một bài nháp, 90 câu. Lần hai trả về đúng bài đó |
| `npm run audio:plan -- --lessons --db --lesson <mã bài>` | 90 file, giọng `ja-JP-NanamiNeural`, không gọi mạng |
| Trình soạn với bài nháp | Mở được, 90 câu báo chưa có audio, Xuất bản bị chặn bằng một dòng |
| Giả lập audio trên DB local (hash và `audio_assets` như `--sync-db`, MP3 im lặng thay file) | Giáo viên xuất bản, đưa vào lớp, chọn 6 câu "(Bài 3)" ở Giao bài và giao. Học viên ở 360px: Nghe, chọn hoặc gõ ("sangai" → さんがい, "denwahadokodesuka." → でんわはどこですか。), xem giải thích và lời nghe, nộp: 100% (6/6) |
| `npm run check` | Đạt |

Chưa sinh audio thật và chưa nghe giọng đọc thật: máy này và production chưa có khóa Azure Speech và R2. Chưa chạy E2E, theo yêu cầu tạm hoãn.

## Còn lại

- Chọn cách làm audio (cần người dùng quyết định): Azure Speech theo thiết kế ([06](../06-audio.md)), hoặc đổi chính sách để tạm dùng giọng đọc của thiết bị.
- Sau khi có audio: chạy SQL trên production cho tài khoản giáo viên, sinh audio cho bài đó, giáo viên nghe duyệt rồi xuất bản.

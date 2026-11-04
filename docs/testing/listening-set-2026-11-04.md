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

## Cách làm audio (người dùng chọn)

Azure Speech, file đi kèm bản web, không dùng R2. Đã làm:

- `npm run audio:generate -- --local --listening <file>`: sinh 90 file vào `public/audio/lessons`, ghi mã audio vào bộ đề (đã qua Prettier) và manifest. Chạy thử (`audio:plan`) báo 90 file, không gọi Azure.
- `.gitignore` cho phép commit `public/audio/lessons`.
- `listening:sql` từ chối câu đã sửa lời nghe sau khi sinh audio hoặc thiếu file, đăng ký `audio_assets`, rồi tạo bài nháp kèm audio. Bài nháp tạo trước khi có audio mà giáo viên chưa lưu lần nào sẽ được cập nhật.
- Test mới: ghi mã audio rồi đọc lại khớp lời nghe; sửa lời nghe thì bị báo audio cũ; mã audio trong bộ đề đã commit phải có file đi kèm.

## Audio tạm bằng Unreal Speech

Người dùng chưa đăng ký được Azure (thẻ chưa đủ số dư để xác minh) nên chọn tạm Unreal Speech.

- Gọi thử: Unreal Speech nhận các giọng Nhật Haruto, Rina, Yuki, Hana, Sakura (tên trong danh sách giọng hợp lệ API trả về). Đã lưu file mẫu cho người dùng nghe.
- Sinh 90 file bằng `unreal:Sakura`: 90/90, tổng 2,6 MB (18–67 KB mỗi file). Bộ đề ghi 90 mã audio và `audioVoice: unreal:Sakura`, vẫn đúng định dạng Prettier.
- Test mới (`tests/unreal-speech.test.ts`): hash giọng Unreal tách khỏi Azure, hash Azure giữ nguyên; client gửi đúng chữ và giọng, thử lại khi bận, lỗi không lộ key. Bộ đề kiểm tra theo đúng giọng đã ghi.
- Ghi nguồn theo điều kiện gói miễn phí: trang Nguồn dữ liệu và slide hướng dẫn.
- Chưa có ai nghe duyệt phát âm; giáo viên nghe trong trình soạn trước khi xuất bản.

## Còn lại

- Người dùng tạo khóa Azure (gói Free F0) và thêm vào `.env.local`. Sau đó sinh audio, nghe thử, commit file và push.
- Chạy `listening:sql` trên production cho tài khoản giáo viên; giáo viên nghe duyệt, xuất bản, đưa vào lớp và giao theo bài.

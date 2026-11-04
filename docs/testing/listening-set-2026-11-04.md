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

## Câu nghe thuộc từng bài và vào bài hằng ngày

- Trình soạn có khung "Câu nghe Minna có sẵn"; mỗi câu nghe có trình phát để nghe duyệt.
- Supabase local, giáo viên local, Bài 11: khung tự chọn Bài 11; Thêm 6 câu nghe → 6 trình phát; Lưu nháp, Xuất bản → phiên bản 2 có 56 câu.
- Lớp mới, ghim Bài 11, 10 câu mỗi ngày, Giao bài hôm nay ngay: 4 trắc nghiệm, 5 điền, 1 câu nghe.
- Xóa 6 dòng `audio_assets` của các câu đó rồi xuất bản lại: thành công, 6 dòng được đăng ký lại.
- Test: `tests/minna-listening.test.ts` (6 câu mỗi bài, bỏ nhãn trong bài, đoán bài theo tiêu đề, bài mẫu + câu nghe không có lỗi xuất bản, danh sách audio đủ 90 với url đúng), `tests/daily-practice.test.ts` (câu nghe là dạng của bài hằng ngày).

## Giao bài nghe riêng khi bài hằng ngày đã giao

Bài đã giao không sửa được (snapshot cố định để điểm công bằng), nên câu nghe được giao thành bài tập riêng.

- Lớp demo đang dùng Bài 11 phiên bản 1; trang Giao bài hiện "đã có phiên bản 3, lớp chưa dùng" và nút Cập nhật lớp lên phiên bản 3. Form giao bài cũng nhắc lớp đang dùng phiên bản cũ.
- Bấm cập nhật: lớp lên phiên bản 3; form hiện "Chỉ chọn câu nghe (6)"; bấm thì chọn 6/56 câu, tên bài giao tự điền "Luyện nghe – Bài 11 – …"; xuất bản thành công.

## Còn lại

- Người dùng tạo khóa Azure (gói Free F0) và thêm vào `.env.local`. Sau đó sinh audio, nghe thử, commit file và push.
- Chạy `listening:sql` trên production cho tài khoản giáo viên; giáo viên nghe duyệt, xuất bản, đưa vào lớp và giao theo bài.

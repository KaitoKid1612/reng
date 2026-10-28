# Audio

## Nguyên tắc: sinh sẵn, không gọi API lúc chạy

Đừng gọi TTS khi học viên bấm nút. Chậm, tốn tiền theo lượt, và phụ thuộc mạng.

Thay vào đó chạy script một lần: quét toàn bộ từ vựng và câu ví dụ trong database, gọi TTS sinh mp3, upload lên storage, lưu đường dẫn vào bảng `audio_assets`. Thêm nội dung mới thì chạy lại, script chỉ sinh những file còn thiếu.

## Đặt tên file theo hash nội dung

```
audio/vocab/{sha256(canonicalInput)[:32]}.mp3
audio/listening/{lesson_id}/{item_id}.mp3
```

canonicalInput là JSON có thứ tự trường ổn định gồm text/SSML, locale, voice, rate, pitch, format và pipelineVersion. Thay cấu hình phải đổi hash; không chỉ hash text + voice.

Hai lợi ích:

- Nội dung không đổi thì không sinh lại file
- Đặt được `Cache-Control: public, max-age=31536000, immutable` — trình duyệt học viên cache vĩnh viễn, lần sau mở không tốn băng thông

Sửa câu thì hash đổi, ra file mới, cache cũ tự hết tác dụng. Không cần cơ chế invalidate.

## Chọn giọng

**Azure Speech, locale `ja-JP`.** Giọng `ja-JP-NanamiNeural` (nữ) và `ja-JP-KeitaNeural` (nam). Tự nhiên nhất cho tiếng Nhật trong các dịch vụ phổ thông.

Free tier 500.000 ký tự mỗi tháng và không hết hạn. Toàn bộ nội dung N5 khoảng 30.000 ký tự, nên gần như không chạm trần. Vượt thì khoảng 16 USD cho mỗi triệu ký tự.

Phương án miễn phí hoàn toàn: **VOICEVOX**, engine TTS tiếng Nhật mã nguồn mở, chạy bằng Docker trên máy. Giọng hơi anime nhưng trọng âm cao thấp khá chuẩn. Bắt buộc ghi credit, chi tiết ở `10-risks-costs-and-licenses.md`.

**Web Speech API của trình duyệt chỉ dùng làm dự phòng.** Máy Windows và Android nhiều khi không cài giọng Nhật, học viên bấm nút không ra tiếng mà bạn không biết.

## Định dạng

| Loại | Bitrate | Kênh | Kích thước điển hình |
|---|---|---|---|
| Từ vựng, câu mẫu | 64 kbps | mono | 20–40 KB |
| Hội thoại luyện nghe | 96 kbps | mono | ~1 MB cho 1–2 phút |

Giọng nói không cần stereo và không cần bitrate cao. Opus nhẹ hơn mp3 khoảng 30% nhưng Safari cũ không hỗ trợ — dùng mp3 cho chắc.

Ước tính dung lượng toàn bộ N5: khoảng 1.500 từ vựng cộng 800 câu ví dụ, tổng chừng 100 MB. Thêm 100 bài nghe là khoảng 200 MB.

## Lưu ở đâu

**Cloudflare R2 cho audio.** R2 không tính phí băng thông đi ra. Audio là thứ học viên tải liên tục, và đây là khoản duy nhất có thể đội giá khi lớp đông.

Supabase Storage dùng được ở giai đoạn đầu nhưng free tier chỉ 5 GB băng thông mỗi tháng. Một lớp 20 người luyện nghe chăm là chạm trần.

## Tốc độ chậm

**Không sinh hai file cho hai tốc độ.** Dùng:

```js
audio.playbackRate = 0.75;
audio.preservesPitch = true;
```

Trình duyệt chậm lại mà không làm giọng trầm xuống. Tiết kiệm một nửa dung lượng.

Ngoại lệ: bài nghe quan trọng nên sinh bản chậm riêng bằng SSML, vì SSML chèn thêm khoảng nghỉ giữa các từ chứ không chỉ kéo dài âm.

```xml
<prosody rate="-25%">きのう がっこうへ いきました。</prosody>
```

## Audio sprite cho danh sách dài

Với flashcard 50 từ, thay vì 50 request thì gộp thành một file mp3 duy nhất cộng một JSON mốc thời gian. Dùng `Howler.js` phát từng đoạn.

```json
{
  "src": "audio/sprite/lesson-05.mp3",
  "sprite": {
    "v0501": [0, 1200],
    "v0502": [1500, 980]
  }
}
```

Mở trang nhanh hơn thấy rõ.

## Script sinh audio

Bản hiện có xử lý kana mặc định, hoặc draft bài học với --lessons; dry-run không gọi dịch vụ. Luồng lesson audio dùng manifest riêng, cập nhật draft và yêu cầu xuất bản version mới sau khi nghe duyệt. Chi tiết tại [hướng dẫn biên soạn](content-authoring.md). MP3 thật/Azure/R2 chưa được kiểm chứng khi chưa cấu hình credentials.

```
scripts/generate-audio.ts

1. Đọc draft_content và dữ liệu kana; khi cần sửa bản xuất bản, tạo draft từ phiên bản đó
2. Trích mọi chuỗi tiếng Nhật cần audio (vocab.jp, examples.jp)
3. Tính hash từ canonicalInput gồm nội dung và toàn bộ cấu hình sinh
4. Đối chiếu bảng audio_assets, lọc ra chuỗi chưa có file
5. Gọi Azure TTS theo lô, giới hạn tốc độ gọi
6. Upload lên R2
7. Ghi vào audio_assets
8. Cập nhật audio trong draft; tạo phiên bản xuất bản mới theo 03, không sửa lesson_versions cũ
```

Chạy thủ công sau mỗi lần thêm bài. Không cần tự động vì tần suất thấp.

## Player luyện nghe

Mấy quy tắc nhỏ nhưng ảnh hưởng chất lượng dạy:

| Quy tắc | Lý do |
|---|---|
| Transcript khóa cho tới khi trả lời xong | Hiện sớm thì học viên đọc thay vì nghe |
| Đếm và lưu số lần nghe | Đúng sau 1 lần khác hẳn đúng sau 6 lần |
| Nút lùi 5 giây, không có thanh tua | Thanh tua khiến học viên mò đáp án |
| Chế độ kiểm tra giới hạn 1 lần nghe | Giống thi thật |

## Học viên luyện nói

**Ghi âm.** `MediaRecorder` của trình duyệt, không cần thư viện. Phát lại cạnh file mẫu để tự so sánh.

**So dạng sóng.** Vẽ waveform giọng mẫu và giọng học viên chồng lên nhau bằng Web Audio API. Học viên thấy ngay chỗ mình kéo dài sai hoặc ngắt sai nhịp — cái mà điểm số không nói được.

**Chấm điểm phát âm.** Azure Pronunciation Assessment hỗ trợ `ja-JP`, chấm từng âm tiết, trả về điểm độ chính xác và độ trôi chảy. Free tier 5 giờ audio mỗi tháng, tương đương khoảng 3.600 clip 5 giây — thừa cho một lớp. Vượt thì khoảng 1 USD mỗi giờ audio.

## Bảo mật nhẹ

Tên file hash tránh lộ trực tiếp transcript trong URL, không phải cơ chế phân quyền. Audio công khai vẫn tải và phát lại được. Không đưa text, transcript hoặc đáp án vào metadata công khai. Với file cần giữ riêng cho test, API kiểm tra quyền và cấp URL có thời hạn; không dùng cùng public URL của bài luyện. Thiết kế này không ngăn ghi lại audio phía học viên.

## Chạy lại và xử lý lỗi

Script có dry-run liệt kê số asset thiếu; chạy lại bỏ qua asset đã upload và xác minh tồn tại. Chỉ ghi metadata thành công sau upload; lỗi giữa chừng được retry theo hash, giới hạn tốc độ và số lần thử. Ghi log ID/hash và trạng thái, không ghi khóa dịch vụ. Không ghi đè draft nếu revision đã đổi trong lúc script chạy.

Asset dùng chung bởi nhiều phiên bản; không xóa vì một bài đã bỏ tham chiếu. Công việc dọn file phải kiểm tra cả phiên bản cũ và snapshot bài giao. Trước xuất bản kiểm tra audio phát được và có nút thử lại khi tải lỗi; audio lỗi không tính một lần nghe. Giá/quota TTS nêu trên là thông tin tài liệu cũ, cần xác minh trước khi cấu hình dịch vụ.

## Trạng thái kiểm chứng local

Đã tách player browser và điều phối pipeline theo DD phase-1. Chromium đã kiểm tra decode MP3 fixture, retry 404, timeout tải, đổi chữ và hủy playback; giọng thiết bị được kiểm tra bằng stub. Các test fake xác minh retry TTS và phục hồi sau lỗi storage/metadata/manifest mà không sinh asset trùng. Đây chưa phải bằng chứng Azure/R2/Supabase hoạt động thật hoặc chất lượng phát âm đã được giảng viên duyệt.

# Rủi ro, chi phí và giấy phép

Các số liệu và nhận định giấy phép dưới đây đến từ bản thiết kế ban đầu, chưa được xác minh lại trong đợt rà soát 28/10/2026. Đây không phải căn cứ đã kiểm chứng để chọn gói hoặc nhập dữ liệu. Trước khi dùng thật phải ghi nguồn chính thức, ngày kiểm tra, phiên bản dữ liệu, điều kiện sử dụng thương mại và nghĩa vụ ghi công/chia sẻ tương ứng.

## Giấy phép dữ liệu mở

Phần này quan trọng nếu bạn có thu học phí.

### JMdict và KANJIDIC2

Giấy phép **CC BY-SA 4.0**, thuộc EDRDG. Không hạn chế sử dụng thương mại, nhưng bắt buộc ghi công.

**Bẫy nằm ở chữ ShareAlike.** Dữ liệu bạn tạo ra từ đó cũng phải chia sẻ dưới cùng giấy phép.

Thiết kế lưu riêng dữ liệu từ điển và nội dung tự biên soạn để truy xuất nguồn gốc. Việc tách bảng không tự bảo đảm nội dung độc lập hoặc miễn nghĩa vụ ShareAlike; cần kiểm tra điều khoản của đúng bộ dữ liệu và cách sử dụng trước khi nhập/phân phối.

### Mã SKIP trong KANJIDIC

Nằm dưới giấy phép **Attribution-Noncommercial-ShareAlike**, tức là **cấm sử dụng thương mại**.

Nếu có thu học phí thì loại cột này ra khi import. Đây là chi tiết dễ bỏ sót nhất trong cả bộ tài liệu.

### KanjiVG

**CC BY-SA 3.0**, bản quyền Ulrich Apel. Ghi công là dùng được.

### Ghi công thế nào

Tạo một trang `/sources` liệt kê:

```
Dữ liệu từ điển: JMdict và KANJIDIC2, bản quyền Electronic Dictionary
Research and Development Group, sử dụng theo giấy phép CC BY-SA 4.0.
https://www.edrdg.org/

Thứ tự nét viết: KanjiVG, bản quyền Ulrich Apel,
giấy phép CC BY-SA 3.0. https://kanjivg.tagaini.net/
```

Link tới trang này từ footer.

### VOICEVOX

Dùng được cả thương mại lẫn phi thương mại, nhưng **bắt buộc ghi credit** theo dạng `VOICEVOX:tên nhân vật`. Mỗi nhân vật có điều khoản riêng, và có điều cấm chung về nội dung chính trị, tôn giáo, người lớn.

Nếu muốn bỏ credit khi dùng thương mại thì phải trả 400.000 yên mỗi nhân vật.

Với lớp học thì để một dòng credit ở footer là xong. Nhưng nếu định làm sản phẩm bán thì **Azure gọn hơn về mặt pháp lý** — trả tiền theo lượng dùng, không ràng buộc credit.

### Tatoeba

Câu ví dụ dưới **CC BY 2.0 FR**. Ghi công là dùng được, không có ShareAlike. Dễ chịu hơn JMdict.

---

## Chi phí

### Free tier các dịch vụ

| Dịch vụ | Free tier | Đủ cho |
|---|---|---|
| Supabase | 500 MB DB, 1 GB storage, 5 GB băng thông/tháng, 200 kết nối realtime, 2 triệu tin nhắn realtime/tháng | 2–3 lớp |
| Vercel | Hobby plan | Thoải mái |
| Cloudflare R2 | 10 GB lưu trữ, băng thông đi ra miễn phí | Toàn bộ audio N5 |
| Azure TTS | 500.000 ký tự/tháng, không hết hạn | Nội dung N5 chỉ ~30.000 ký tự |
| Azure Pronunciation | 5 giờ audio/tháng | ~3.600 clip 5 giây |
| Resend | 3.000 email/tháng, 100/ngày | 1–2 lớp |

Giai đoạn 1 đến 4 gần như **0 đồng**, chỉ trả tiền tên miền khoảng 300.000đ/năm.

### Khi nào bắt đầu tốn tiền

| Ngưỡng | Chuyển sang | Chi phí |
|---|---|---|
| Trên 100 email/ngày | Brevo (300/ngày free) hoặc Resend Pro | 0đ hoặc 20 USD/tháng |
| Trên ~3 lớp cùng lúc | Supabase Pro | 25 USD/tháng |
| Dùng chấm phát âm nhiều | Azure trả theo lượng | ~1 USD mỗi giờ audio |
| Ghi âm buổi dạy | Whisper API | ~0,006 USD/phút, buổi 2 tiếng ≈ 18.000đ |

### Khoản dễ đội giá nhất

Băng thông audio. Đây là lý do để audio trên **Cloudflare R2** ngay từ đầu — R2 không tính phí băng thông đi ra, nên dù lớp đông cỡ nào khoản này cũng bằng 0.

---

## Rủi ro vận hành

### Supabase free bị tạm dừng

Project free **tự động tạm dừng sau 7 ngày không hoạt động**. Dạy theo kỳ, nghỉ hè hai tuần là website đứng, học viên vào thấy lỗi.

Trước vận hành phải xác minh chính sách tạm dừng hiện hành và có hướng khôi phục. Không coi cron ping là bảo đảm tránh tạm dừng; chọn gói phù hợp mức sẵn sàng cần thiết của lớp.

### Băng thông Supabase

Free tier 5 GB mỗi tháng. Audio ăn băng thông nhất. Đã xử lý bằng R2.

### Giới hạn realtime

200 kết nối đồng thời, 100 tin nhắn mỗi giây. Lớp 30 người chơi quiz trực tiếp không thành vấn đề. Vượt thì lên Pro.

### Email vào spam

Không cấu hình SPF, DKIM, DMARC thì email vào thẳng spam và **bạn không bao giờ biết**. Phải làm ngay từ email đầu tiên, không để sau.

### Font tiếng Nhật trên máy phòng học

Máy Windows phòng học hay thiếu font Nhật. Chữ ra ô vuông, hoặc tệ hơn là bị thay bằng font Trung Quốc có nét khác — học viên tập viết theo là sai.

Khắc phục: nhúng Noto Sans JP, không phụ thuộc font hệ thống.

### Nhập nội dung chậm hơn code

Đây là rủi ro bị đánh giá thấp nhất. Code 5 bài mất 2 ngày, nhập nội dung 25 bài mất vài tuần.

Khắc phục: nhập 5 bài trước, dạy thử, chốt schema, rồi mới nhập phần còn lại. Và làm màn hình soạn bài sớm (giai đoạn 4) để không phụ thuộc vào ai.

---

## Những lựa chọn đã loại và lý do

### Zalo OA để nhắc bài

Gửi tin chủ động chỉ miễn phí trong cửa sổ 48 giờ kể từ lần học viên nhắn tới OA. Ngoài khung đó phải dùng tin trả phí. Từ 01/01/2026 Zalo đã hợp nhất ZNS cùng tin UID thành ZBS Template Message, gửi theo template phải được duyệt trước.

Chi phí: khoảng 220đ mỗi tin, cộng phí đăng ký OA 200.000đ và phí duy trì 47.000–59.000đ mỗi tháng.

Lớp 20 người nhắc 2 lần/tuần là khoảng 40.000đ/tháng tiền tin. Không lớn, nhưng phải đăng ký doanh nghiệp và chờ duyệt template.

**Thay bằng:** email cộng Web Push, miễn phí và không cần thủ tục.

### Nhúng iframe Google Slides lâu dài

Khác domain nên JavaScript không đọc được trạng thái slide. Hệ quả: không gắn được nút phát âm vào từ vựng, không bật tắt furigana, không chèn quiz giữa bài, không ghi được học viên xem tới slide nào. Bắt buộc publish công khai.

**Thay bằng:** render slide từ JSON. Dùng iframe chỉ ở giai đoạn chuyển tiếp.

### Hotlink ảnh từ Google Drive

Bị giới hạn lượt tải, định dạng URL thay đổi không báo trước, không có CDN.

**Thay bằng:** tải về rồi upload sang storage.

---

## Checklist trước khi dùng thật

- [ ] Trang `/sources` đã liệt kê đủ giấy phép
- [ ] Đã loại cột SKIP codes nếu có thu phí
- [ ] SPF, DKIM, DMARC đã cấu hình và test gửi vào Gmail thật
- [ ] Header one-click unsubscribe đã có
- [ ] RLS đã bật trên mọi bảng, đã test bằng tài khoản học viên thật
- [ ] API học viên không lộ answer/explain/transcript/teacherNotes trước thời điểm được phép; không đọc trực tiếp bảng gốc
- [ ] Đã xác minh chính sách tạm dừng, cron và điều khoản gói hosting; có hướng khôi phục
- [ ] Có backup và khôi phục thử trên môi trường riêng
- [ ] Có danh sách nguồn, phiên bản, ngày kiểm tra giấy phép và quyền dùng nội dung giáo trình
- [ ] Font Noto Sans JP đã nhúng, test trên máy Windows không cài font Nhật
- [ ] Audio đã nằm trên R2, không phải Supabase Storage
- [ ] Đã thử chiếu lên máy chiếu thật của phòng học

## Rủi ro mới của dịch vụ nhiều giáo viên

Phần này là yêu cầu thiết kế/vận hành dự kiến, không phải kết luận pháp lý hoặc bảng giá đã xác minh.

- Nhiều giáo viên cần cách ly dữ liệu cả trong API dùng service role, database và storage; cấp quyền slide không cấp quyền xem học sinh/điểm/notes.
- Giáo viên phải có quyền sử dụng và chia sẻ tài liệu/media. Quyền dùng trong một lớp không tự suy ra quyền cho đồng nghiệp sao chép/phát hành. Lưu nguồn/phạm vi cấp phép và có cơ chế báo cáo/gỡ nội dung.
- Ảnh scan có thể chứa tên, số điện thoại, bài làm hoặc đáp án. Mặc định riêng tư, yêu cầu loại thông tin không cần thiết, giới hạn truy cập và thời gian lưu; xác minh điều khoản xử lý dữ liệu OCR trước gửi ra ngoài.
- OCR có thể sai ký tự, bố cục hoặc đáp án. Bắt buộc giáo viên duyệt, hiển thị nguồn cạnh draft; tự luận/viết tay không được hứa chấm tự động.
- Tính chi phí theo trang OCR, dung lượng/tải ảnh, lượt job và email/audio mỗi giáo viên; đặt quota thử nghiệm. Không tiếp tục giả định free tier đủ cho mọi lớp hoặc gọi OCR không giới hạn.
- Meet phụ thuộc quyền/tài khoản/thiết bị bên ngoài; link không đảm bảo người cầm link là thành viên Masu. Bản đầu chỉ lưu link/share tab, chưa cam kết quota họp, ghi hình hoặc điểm danh từ Meet.

Chốt nhà cung cấp, gói giá và chính sách dữ liệu trước mở dịch vụ; không mua gói hoặc bật tính phí chỉ vì bản thiết kế đã được ghi. Quy tắc cụ thể ở [DD dịch vụ](detail-design/teaching-service.md).

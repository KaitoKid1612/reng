# Lộ trình

Định hướng mới ngày 29/10/2026 được ghi ở [điều chỉnh ưu tiên dịch vụ](#điều-chỉnh-ưu-tiên-dịch-vụ--29102026): nhiều giáo viên, ưu tiên Việt–Trung, lớp riêng, chia sẻ và scan. Các giai đoạn dưới đây mô tả kế hoạch nền N5; mốc Service A–D là thứ tự công việc tiếp theo.

## Trạng thái và quyết định bản đầu

Ngày rà soát: 28/10/2026, cập nhật 29/10/2026. Nền giai đoạn 1–4 và phần A giai đoạn 5 đã có bản local; dịch vụ Việt–Trung đã có bản local Service A và B1 (xem bảng bên dưới), chưa giai đoạn nào được nghiệm thu cloud/lớp thật hoàn chỉnh. Thời lượng bên dưới là ước lượng lập kế hoạch, không phải cam kết tiến độ.

- Chọn Next.js + Supabase từ đầu; không triển khai song song bản Astro.
- P0/P1/P2 trong `01` là mức quan trọng trong phạm vi sản phẩm. Mốc giao tính năng theo file này; P0 không đồng nghĩa tất cả phải có trong giai đoạn 1.
- Giai đoạn 1 chỉ gồm trang chủ tối thiểu, kana, luyện romaji, audio và nền kỹ thuật. Không có đăng ký học viên, lớp học, flashcard hay bài kiểm tra trong mốc đó.
- Giai đoạn 2 có presenter và PDF. Giai đoạn 3 có flashcard/SRS, bài tập/lớp, tiến độ; giai đoạn 4 editor/email; giai đoạn 5 nghe/kanji/furigana; giai đoạn 6 QR/thi thử/realtime/push.
- Nội dung 5 bài đầu do giảng viên cung cấp hoặc tự biên soạn; trước khi nhập hàng loạt phải kiểm tra quyền sử dụng. Không mặc định được sao chép nội dung giáo trình.

## Nguyên tắc chia giai đoạn

Mỗi giai đoạn phải kết thúc bằng một thứ **dùng được thật trong lớp**, không phải một nửa tính năng.

Thứ tự được sắp để rủi ro lớn nhất gặp sớm nhất. Giai đoạn 1 làm phần kana vì nó độc lập với nội dung bài giảng nhưng chạy qua được toàn bộ đường ống audio — nếu pipeline audio có vấn đề, bạn biết ngay tuần đầu thay vì tuần thứ sáu.

---

## Giai đoạn 1 — Nền và bảng chữ cái (2 tuần)

**Kết quả:** học viên luyện Hiragana và Katakana trên web, có audio.

| Việc | Ghi chú |
|---|---|
| Dựng Next.js, Tailwind, Supabase | Thiết lập dự án |
| Chạy migration đợt 1 và RLS | `profiles`, `lessons`, `lesson_versions`, `audio_assets`; chưa mở đăng ký công khai |
| Seed dữ liệu kana | Theo content/kana.json ở 03, có acceptedRomaji và audio |
| Cấu hình môi trường | .env.example, local/staging/production tách biệt |
| Màn hình bảng chữ cái (S02) | Hiragana, Katakana, âm đục, âm ghép |
| Script sinh audio | Azure TTS, upload R2 |
| Màn hình luyện chữ cái (S03) | Gõ romaji, chấm ngay |
| Nhúng font Noto Sans JP | Không bỏ qua |
| Deploy lên Vercel | |

**Vì sao làm trước:** độc lập, không phụ thuộc nội dung bài giảng, nhưng chạy qua đủ pipeline audio từ đầu tới cuối.

**Coi là xong khi:** có đủ 46 chữ cơ bản của mỗi hệ cùng âm đục, nửa đục, âm ghép; học viên chọn phạm vi luyện, nhập romaji được chấm đúng theo acceptedRomaji. Bấm phát có tiếng trên Chrome/Safari, lỗi audio có cách thử lại, màn hình 360px không cuộn ngang. Chạy lại script không sinh lại asset không đổi. Chưa yêu cầu thứ tự nét ở mốc này.

---

## Giai đoạn 2 — Bài giảng và slide (2 tuần)

**Kết quả:** dạy trọn một buổi bằng website, không cần mở PowerPoint.

| Việc | Ghi chú |
|---|---|
| Chốt schema JSON nội dung | Theo `03-data-design.md` |
| SlideRenderer và các component slide | title, vocab, grammar, example, quiz luyện, note, image |
| Tích hợp reveal.js | Fragment, toàn màn hình, overview, presenter và PDF |
| Nhập bài bằng script có validator | Tạo draft, kiểm tra refs và xuất bản phiên bản; tài khoản giảng viên chuẩn bị thủ công |
| Màn hình bài học chế độ đọc (S05) | |
| Màn hình trình chiếu (S06) | |
| Nhập nội dung bài 1–5 | Phần tốn thời gian nhất |
| Sinh audio cho nội dung mới | Chạy lại script |
| Trang tra cứu ngữ pháp (S09) | |

**Rủi ro lớn nhất:** nhập nội dung tốn thời gian hơn code. Nhập 5 bài trước, đừng nhập 25 bài rồi mới phát hiện schema cần sửa.

**Coi là xong khi:** dạy thật một buổi bằng website; bàn phím, hash và tải lại giữ đúng slide; máy chiếu 1280×720 đọc rõ, laptop có ghi chú nhưng máy chiếu/payload học viên/PDF không chứa ghi chú. Trang đọc và slide dùng cùng phiên bản; cập nhật draft chưa xuất bản không đổi bài đang dạy. PDF hiện đủ fragment, không cắt chữ Nhật. Sau buổi dạy mới điều chỉnh phạm vi tiếp theo.

---

## Giai đoạn 3 — Bài tập và lớp học (3 tuần)

**Kết quả:** giao bài, học viên làm ở nhà, bạn nhìn ra ai đuối.

| Việc | Ghi chú |
|---|---|
| Migration giai đoạn 3 | Theo danh sách đầy đủ ở 03, gồm class_lessons, assignment_items, review_events, lesson_progress |
| Đăng nhập và vào lớp | Đăng ký, xác nhận email, reset mật khẩu, mã lớp, cấp role phía server |
| Chọn bài cho lớp và giao bài | Ghim phiên bản, lịch mở, snapshot; form nhập câu test riêng tối thiểu |
| Kiểm chứng RLS và API | Quyền lớp, snapshot, role, ghi điểm và thời điểm phản hồi; không phụ thuộc view chưa triển khai |
| Logic chấm dùng chung | `lib/grading/` |
| Dạng bài trắc nghiệm và điền từ | Gắn `wanakana` |
| Màn hình làm bài và kết quả (S11, S12) | |
| Flashcard với FSRS (S07, S08) | `ts-fsrs` |
| Sổ lỗi (S13) | Gần như miễn phí, chạy trên dữ liệu đã có |
| Tạo lớp, mã lớp (CLASS-01) | |
| Bảng theo dõi lớp (T03) | Kèm gắn nhãn tự động |
| Thống kê câu sai nhiều nhất | |
| Xuất CSV | |

**Coi là xong khi:** giao/làm/nộp bài trọn luồng bằng tài khoản giảng viên và hai học viên thuộc hai lớp khác nhau. Vượt quyền bị từ chối, không tự sửa role/điểm; test không lộ đáp án hoặc kết quả trước thời điểm cho phép. Nộp trùng chỉ chấm một lần; mất mạng và hai tab xử lý đúng draft. Sửa bài không đổi snapshot cũ. Sổ lỗi, FSRS, thống kê lượt mới nhất và nhãn bỏ bài được kiểm chứng theo 07; xuất CSV đúng dấu và an toàn công thức. Có backup và khôi phục thử trước khi nhận lớp thật.

---

## Giai đoạn 4 — Tự chủ nội dung (2 tuần)

**Kết quả:** bạn thêm bài mới mà không cần đụng code hay nhờ ai.

| Việc | Ghi chú |
|---|---|
| Màn hình soạn bài (T06) | Form bên trái, xem trước bên phải |
| Kéo thả sắp xếp slide | |
| Nhập từ vựng CSV (T07) | Giảng viên quen Excel |
| Lưu nháp và xuất bản tách riêng | |
| Email nhắc bài | Theo `08-notifications.md` |
| Cấu hình SPF, DKIM, DMARC | |
| Job thông báo và theo dõi lỗi | Tùy chọn nhận tin, retry, idempotency, webhook và link hủy |

**Coi là xong khi:** giảng viên thêm bài mới dưới 30 phút không mở editor code; lưu nháp/xuất bản, CSV lỗi từng dòng, refs thiếu và xung đột revision xử lý rõ ràng. Email chỉ gửi khi đồng ý và có việc, hủy có hiệu lực ngay; cron trùng/timeout không làm mất job hoặc gửi lại thiếu kiểm soát. Kiểm tra gửi thật tới hộp thư thử, không gửi staging tới học viên thật.

---

## Giai đoạn 5 — Luyện nghe và kanji (3 tuần)

| Việc | Ghi chú |
|---|---|
| Player luyện nghe (S15) | Khóa transcript, đếm lần nghe |
| Dạng bài nghe chọn đáp án và dictation | |
| Nhập audio hội thoại | Thu âm hoặc TTS đa giọng |
| Import KANJIDIC2 và KanjiVG | Lọc SKIP codes, xem `10-...md` |
| Màn hình kanji (S10) | |
| Xem thứ tự nét | `stroke-dasharray` |
| Furigana bật tắt | Thẻ `<ruby>` |

**Coi là xong khi:** audio lỗi không mất lượt nghe, transcript chỉ mở đúng lúc, dictation chấm đúng phương án khai báo; kanji và thứ tự nét hiển thị rõ trên điện thoại, dữ liệu có nguồn và credit. Không cache transcript/đáp án test vào payload công khai.

---

## Giai đoạn 6 — Nâng cao (làm dần)

Không có thứ tự bắt buộc, làm theo nhu cầu thực tế.

| Việc | Giá trị | Công sức |
|---|---|---|
| Thi đấu trực tiếp trong lớp | Rất cao, đổi hẳn không khí buổi học | Thấp, Supabase Realtime |
| Bổ sung sâu nội dung "người Việt hay nhầm" | Có trường từ giai đoạn 2; tiếp tục biên soạn theo lỗi thực tế | Nội dung |
| Ghép đôi và sắp xếp câu | Schema/chấm đã định nghĩa; thêm UI và kiểm chứng cả bàn phím/điện thoại | Trung bình |
| Mã QR trên slide | Cao | Rất thấp |
| Đếm ngược ngày thi JLPT | Trung bình | Rất thấp |
| Đề thi thử có đếm giờ | Cao | Trung bình |
| Web Push | Trung bình | Thấp |
| PWA chạy offline | Cao với học viên đi xe bus | Trung bình |
| Từ điển bật lên khi bôi đen | Cao | Trung bình, `kuromoji` phải chạy server |
| Luyện hội thoại với AI | Cao | Trung bình, phải chốt phạm vi từ vựng |
| Bản đồ chữ cái tô màu | Trung bình | Thấp |
| Ghi âm buổi dạy, tự tóm tắt | Cân nhắc khi có nhu cầu/quyền ghi âm | Cần thiết kế/chi phí riêng, ngoài MVP |
| So dạng sóng phát âm | Trung bình | Trung bình |
| Chấm điểm phát âm | Cao | Trung bình |
| Chấm thứ tự nét kanji | Trung bình | Cao, phải tự viết thuật toán |

## Ba thứ nên ưu tiên trong giai đoạn 6

1. **Thi đấu trực tiếp trong lớp** — công sức thấp, thay đổi hẳn không khí buổi học, và cho bạn biết ngay ai chưa hiểu.
2. **Làm sâu mục "người Việt hay nhầm"** — dùng dữ liệu lỗi của lớp để bổ sung nội dung đã có từ giai đoạn 2, không trì hoãn phần giải thích cơ bản tới giai đoạn 6.
3. **QR cho bài giao** — nối slide với assignment đã xuất bản, có kiểm tra quyền lớp. Sổ lỗi đã thuộc giai đoạn 3, không chờ tới đây.

## Mốc kiểm tra lại kế hoạch

Sau giai đoạn 2, dạy thật một buổi rồi ngồi lại. Nhiều khả năng bạn sẽ muốn đổi thứ tự của giai đoạn 3 trở đi. Đó là chuyện bình thường, đừng bám kế hoạch cũ chỉ vì đã viết ra.

## Các điều kiện chưa được kiểm chứng

- Dependency thực tế lấy package.json/lockfile: nền/classroom/editor/email/listening đã có; OCR/queue/font Trung/TTS web chưa tích hợp. Không xem mọi thư viện được nhắc trong tài liệu là đã cài.
- Đã có 5 bài mẫu tự biên soạn, chưa giảng viên duyệt; chưa có audio sinh thật hoặc đo hiệu năng 4G/máy chiếu. Mục tiêu thời gian trong 01 là yêu cầu, chưa phải kết quả đo.
- Chưa xác minh lại giá, free tier, điều khoản hosting/TTS và giấy phép dữ liệu từ nguồn chính thức. Chốt trước khi mở dịch vụ hoặc nhập nguồn bên ngoài.
- PWA offline, thi thử, chấm phát âm và realtime phải có thiết kế riêng theo nhu cầu thực tế trước khi triển khai giai đoạn 6.

Không đánh dấu hoàn thành chỉ vì tài liệu mô tả đã có; mỗi mốc cần bằng chứng từ ứng dụng chạy thật.

## Tiến độ local giai đoạn 1 — 28/10/2026

- Có BD/DD riêng và bảng truy vết tại basic-design/, detail-design/, testing/.
- Có Next.js, UI và font self-host; trang chủ, bảng 208 mục kana, luyện romaji, tổng kết/luyện lại lỗi, nguồn dữ liệu.
- Có script audio dry-run và chế độ Azure/local/R2/metadata; chưa có MP3 chuẩn hoặc kiểm chứng dịch vụ thật.
- Có migration nền đã kiểm tra grants/RLS và bất biến phiên bản trên PostgreSQL nhúng với auth stub; chưa áp dụng Supabase cloud.
- Kết quả kiểm chứng cập nhật tại [checklist giai đoạn 1](testing/phase-1.md). Còn chờ cloud, giảng viên nghe duyệt, Safari/máy chiếu/4G và deploy trước nghiệm thu.

## Quy ước mã nguồn

Áp dụng [coding standards](coding-standards.md) và AGENTS.md của repo. Docs/source/route dùng tên tiếng Anh; phần UI và tài liệu nghiệp vụ vẫn dùng tiếng Việt/Nhật. Các component kana đã tách theo trách nhiệm và kiểm chứng bằng bộ kiểm tra mới. Quyền chủ động trong phạm vi đã giao được ghi trong AGENTS.md, chỉ hỏi lại khi có quyết định kỹ thuật/sản phẩm chưa chốt được từ tài liệu.

## Hoàn thiện audio local

Player browser đã tách khỏi React context, dừng nguồn cũ khi đổi chữ/rời trang và reset thông báo khi quay lại. Pipeline đã tách adapter TTS khỏi điều phối asset/metadata/manifest, dừng khi asset hiện hữu không đầy đủ và hỗ trợ retry sau lỗi. Kiểm chứng local gồm 18 test logic/database/pipeline và 13 browser test; chi tiết ở [checklist giai đoạn 1](testing/phase-1.md). Các dịch vụ cloud, audio phát âm thật và thiết bị thật vẫn chưa nghiệm thu.

## Tiến độ local giai đoạn 2

Đã có BD/DD, 5 bài mẫu/30 từ/10 mẫu câu, reader/search, reveal.js, fragment/hash, presenter theo scope lesson-version, PDF và API đáp án luyện riêng. Notes không vào payload công khai; API cookie-auth kiểm tra user/teacher/owner trước khi đọc qua RLS. Local catalog giữ snapshot cũ; RPC publish đã kiểm chứng transaction/revision trên database nhúng. Pipeline --lessons lập kế hoạch 40 audio, chỉ cập nhật draft khi generate thật.

Chưa nghiệm thu Supabase/Auth/Azure/R2 thật, chưa apply migrations hoặc deploy, chưa giảng viên duyệt 5 bài/audio hoặc dạy thử. Xem [checklist phase-2](testing/phase-2.md) và [staging setup](staging-setup.md).

## Tiến độ local giai đoạn 3

Đã có BD/DD, migration 0003–0004 (bảng lớp/bài giao/lượt/ôn tập, trigger bất biến, RLS chỉ đọc, RPC transaction), chấm điểm dùng chung ở lib/grading, tài khoản học viên với xác nhận email/đặt lại mật khẩu, vào lớp bằng mã, giao practice/test, làm bài có autosave/xung đột/mất mạng, kết quả theo chính sách phản hồi, sổ lỗi, flashcard/ôn tập FSRS, tiến độ, bảng theo dõi lớp, câu sai nhiều và CSV. Trước khi viết mã đã chạy Supabase local bằng Supabase CLI để kiểm chứng Auth và migration thật thay cho phiên giả.

Đã kiểm chứng trên Supabase local với một giảng viên và hai học viên ở hai lớp (xem [checklist phase-3](testing/phase-3.md)). Chưa áp dụng cloud, chưa cấu hình SMTP/template email trên dashboard, chưa backup/khôi phục thử và chưa dùng với lớp thật. Dạng bài ghép đôi/sắp xếp/nghe vẫn chờ UI ở giai đoạn sau; nhãn yếu nghe chỉ có ý nghĩa khi có câu nghe.

## Tiến độ local giai đoạn 4

Phần soạn nội dung đã có: tạo bài, editor form + xem trước slide, kéo thả/nút sắp xếp slide, lưu nháp compare-and-swap và xuất bản qua RPC, lỗi xuất bản theo mục, nhập từ vựng CSV/TSV có lỗi từng dòng. Đã kiểm chứng trên Supabase local ([checklist phase-4](testing/phase-4.md)). Phần email đã có: tùy chọn opt-in, nhắc tối (daily/due_only), tổng kết tuần, tóm tắt giảng viên, job email_log có lease/backoff/idempotency key, Resend/Mailpit, webhook có chữ ký, hủy một chạm, lịch cron trong vercel.json. Đã kiểm chứng gửi vào Mailpit trên Supabase local. Chưa gửi thật qua Resend, chưa cấu hình DNS (SPF/DKIM/DMARC) hoặc cron trên hosting.

## Tiến độ local giai đoạn 5 (phần A — luyện nghe)

Đã có câu nghe chọn đáp án, nghe gõ đáp án và chính tả trong editor; script sinh audio đọc/ghi nháp database (`--db`) có kiểm tra revision; player không thanh tua (lùi 5 giây, chậm 0.75x, đếm lượt, giới hạn lượt, lỗi không tính lượt); trang S15 chấm qua API và chỉ hiện transcript sau khi trả lời; câu nghe trong bài giao practice lưu listen_count; báo cáo có điểm nghe, nghe trung bình và nhãn yếu nghe. Đã kiểm chứng trên Supabase local ([checklist phase-5](testing/phase-5.md)). Chưa có: câu nghe trong bài test (cần phân phối audio riêng), audio Azure thật đã nghe duyệt, kanji (KANJIDIC2/KanjiVG chờ quyết định giấy phép), furigana và audio hội thoại nhiều giọng.

## Điều chỉnh ưu tiên dịch vụ — 29/10/2026

Yêu cầu mới mở Masu thành dịch vụ cho nhiều giáo viên, hướng tới nhiều môn/ngôn ngữ nhưng ưu tiên dạy tiếng Trung cho người Việt, lớp riêng và dạy qua Google Meet bên ngoài. Đây là hướng tiếp theo trước tiện ích giai đoạn 6; không phủ nhận các phần local đã có và không đánh dấu nghiệm thu cloud. Tài liệu N5 giai đoạn 1–5 giữ vai trò lịch sử triển khai; ngoài các thay đổi rõ dưới đây, tính năng cũ vẫn là nền tái sử dụng.

| Mốc mới | Nội dung | Điều kiện hoàn tất |
|---|---|---|
| Service A | Tự đăng ký giáo viên, quyền vừa dạy/vừa học, cách ly dữ liệu, capacity và link Meet | Hai giáo viên không vượt quyền; lớp 10 chỗ không vượt chỗ khi join đồng thời; dạy thử bằng share tab. **Bản local đã có**, chưa dạy thử Meet thật |
| Service B1 | Soạn Việt–Trung theo mẫu: mục tiêu nhỏ, bảng nội dung, dựng slide, choice/fill, preview/xuất bản/giao lớp | Giáo viên soạn và dạy một bài nhập môn; đo mục tiêu dưới 30 phút khi đã có nội dung; giữ tương thích dữ liệu Nhật. **Bản local đã có**; còn TTS web và đo với giáo viên thật |
| Service B2 | Thư viện chia sẻ version, view/copy/thu hồi, dùng lại bài | Copy độc lập đủ nguồn/media, không lộ notes/test/dữ liệu lớp; không làm thay đổi bản đã giao. **Bản local đã có** (chưa có media riêng tư) |
| Service C1 | Upload ảnh/PDF riêng tư, hiển thị nguồn, crop/nhập câu thủ công | Có bài tương tác được duyệt từ scan và giao/làm/chấm trọn luồng |
| Service C2 | OCR/job nền, gợi ý cấu trúc choice/fill, review bắt buộc, quota | Benchmark giúp giảm công nhập; mọi câu xuất bản đã duyệt, retry không mất sửa tay, chi phí đo được |
| Service D | Chấm tay và thêm dạng scan theo nhu cầu thật | Có workflow chờ chấm/điểm/audit, không trộn điểm chờ với 0 |

Chưa ước lượng lịch trước khi chốt lát kỹ thuật. OCR provider, hosting worker và ngân sách theo trang cần thử dữ liệu thực; không trì hoãn A/B vì C2. Thu phí, marketplace, tự tạo Meet bằng OAuth và đồng bộ slide từ xa chưa thuộc mốc đầu. Xem [BD](basic-design/teaching-service.md), [DD dự kiến](detail-design/teaching-service.md), [checklist NOT RUN](testing/teaching-service.md).

Ưu tiên trong Service B là B1 trước B2: hoàn thiện luồng giáo viên tự soạn theo [hướng dẫn sản phẩm](content-authoring.md), dùng một bài dễ và một lớp để đo tính thực tế. Masu chuẩn bị mẫu và một bộ minh họa nhỏ có giáo viên duyệt, không nhập cả giáo trình trước khi thử. Scan/OCR vẫn sau luồng nhập bảng thủ công; không phụ thuộc AI để dựng slide hoặc giao practice.

# Nghiệm thu dự kiến — Dịch vụ hỗ trợ giảng dạy

Ngày: 29/10/2026. Ca không có trong bảng kết quả bên dưới vẫn là **NOT RUN**. Không thay thế kết quả local ở phase-1 đến phase-5.

## Kết quả cục bộ đã chạy

Môi trường: máy dev, Supabase local (Podman), Chromium qua Playwright; test migration trên PostgreSQL nhúng (PGlite). Không dùng cloud hoặc tài khoản thật. Ngày chạy 29/10/2026.

| Ca | Kết quả | Bằng chứng |
|---|---|---|
| SV-01 | PASS (local) | Kích hoạt qua `/teach/start` với email đã xác minh; email chưa xác minh bị `email_unverified` ở RPC. `e2e-supabase/teaching-service.spec.ts`, `tests/teaching-service-migration.test.ts` |
| SV-02 | Một phần | Vai `authenticated` không sửa được `profiles.role`/`teacher_accounts` và không gọi được RPC service; đình chỉ đưa role về student, kích hoạt lại bị chặn. Chưa thử giả `user_metadata` qua UI |
| SV-03 | PASS (local) | Giáo viên đã kích hoạt vào lớp của giáo viên khác bằng mã và đọc bài được ghim |
| SV-04 | Một phần | Khách/người ngoài không đọc bài class, ghi chú hoặc API câu hỏi của version riêng; kiểm tra hai giáo viên trên mọi màn hình chưa chạy |
| SV-05 | PASS (local) | Lớp sức chứa 1: người thứ hai nhận `class_full`; vào lại khi đã là thành viên trả `already_member`, không chiếm thêm chỗ |
| SV-06 | PASS (local) | Hai người bấm vào lớp cùng lúc, đúng một người vào; rời lớp giải phóng chỗ và giữ lịch sử; giảm sức chứa dưới số đang học bị `capacity_below_members` |
| SV-07 | Một phần | Thành viên thấy link Meet; URL `javascript:`, sai host, có credentials hoặc HTTP bị từ chối ở form và ràng buộc DB. Trường hợp học sinh đã rời đọc link chưa có test riêng (trang lớp đã yêu cầu thành viên đang học) |
| SV-09 | Một phần | Bài v2: hướng dẫn/nghĩa tiếng Việt, chữ Hán gắn `lang=zh-Hans/zh-Hant` với font Trung của thiết bị, ô nhập chữ Hán/pinyin không chạy wanakana, nút Nghe chỉ dùng giọng Trung của thiết bị; flashcard bài Trung hiển thị chữ Hán `lang=zh-Hans`, pinyin, nghĩa và tạo lịch ôn SRS. Chưa có TTS web và kiểm tra font/audio trên thiết bị thật; bài Nhật cũ vẫn qua toàn bộ E2E |
| SV-10 | PASS (local) | `zh-exact-v1`: NFC và bỏ khoảng trắng đầu/cuối, giữ thanh điệu, khoảng trắng trong pinyin, giản/phồn thể (`謝謝` sai khi đáp án là `谢谢`); profile Nhật giữ quy tắc cũ. `tests/teaching-content.test.ts`, `e2e-supabase/teaching-authoring.spec.ts` |
| SV-11 | PASS (local) | Quyền view chỉ đọc đúng phiên bản được chia sẻ (không đọc bản mới nhất), không có nút sao chép; giáo viên khác/học viên không dùng được quyền; trang giao bài chỉ liệt kê bài mình sở hữu. `tests/lesson-sharing-migration.test.ts`, `e2e-supabase/lesson-sharing.spec.ts` |
| SV-12 | PASS (local) | Bản sao là nháp mới của người nhận, có nguồn và tên tác giả, không có ghi chú riêng; không mang câu test, lớp hay kết quả học viên (những dữ liệu này không nằm trong phiên bản) |
| SV-13 | Một phần | Gửi lại cùng requestId trả về đúng một bản sao, kể cả sau khi bị thu hồi. Bản sao độc lập theo cấu trúc dữ liệu; chưa có test riêng cho việc xuất bản lại bài nguồn |
| SV-14 | Một phần | Thu hồi chặn xem và sao chép mới, bản sao đã tạo vẫn mở được. Chưa có media riêng tư nên chưa kiểm tra TTL của signed URL |
| SV-26 | PASS (local) | Lớp lưu `subject`, `language_tag`, `instruction_language_tag` riêng; bài v2 lưu context (subject, languageTag, locale, instructionLanguageTag); không tự đổi giản/phồn |

Kết quả pilot tiếng Nhật theo Minna (29/10/2026):

| Ca | Kết quả | Bằng chứng |
|---|---|---|
| MJ-01 | PASS (local) | Bài mẫu 11 hợp lệ, xuất bản được nguyên trạng, đáp án trắc nghiệm phân bố nhiều vị trí, không lộ ghi chú/đáp án ở DTO học viên. `tests/japanese-lessons.test.ts` |
| MJ-02 | PASS (local) | Furigana, giọng đọc (đọc furigana, bỏ 〜), hash audio cũ không đổi, bảng dán Tab/gõ `|` và giới hạn, kiểm tra thiếu nội dung slide hội thoại/bảng, schema từ chối hàng lệch cột. `tests/japanese-lessons.test.ts` |
| MJ-03 | PASS (local) | Rời ô hoàn tất romaji còn dở (`yonin` → よにん) mà không đổi katakana/kanji đã nhập. `tests/romaji-input.test.ts`, `e2e-supabase/minna-teaching.spec.ts` |
| MJ-04 | PASS (local) | Trọn luồng trên trình duyệt: giáo viên kích hoạt, tạo bài 11 từ mẫu, xuất bản, chiếu bảng đếm/luyện thay thế/hội thoại; lớp tiếng Nhật mặc định có sức chứa và Meet; học viên tự đăng ký, xác minh email qua Mailpit, vào lớp, đọc bài (vừa 360px), làm bài 100%; giáo viên thấy kết quả. `e2e-supabase/minna-teaching.spec.ts` (3 lần liên tiếp đạt) |
| MJ-05 | PASS (local, thủ công) | Chrome trên dev server cổng 3017: link xác nhận trỏ đúng cổng 3017 sau khi sửa allowlist; học viên thử làm 14 câu được 92,9% (13/14), câu sai hiện đáp án và giải thích; 38 slide cao tối đa 676/720px. Phát hiện và sửa: n cuối chưa thành ん, chữ số toàn góc bị giãn, câu tóm tắt dành cho giáo viên hiện cho học viên |
| MJ-06 | NOT RUN | Giáo viên thật duyệt nội dung bài 11 và dạy thử một buổi Meet; đo thời gian chuẩn bị |
| MJ-07 | PASS (local) | Bài luyện hằng ngày: tắt mặc định; người không phải chủ lớp và số câu ngoài 3–20 bị từ chối; mỗi lớp/ngày đúng một bài (chạy lại trả bài cũ), câu không thuộc phiên bản bị `invalid_items`, vai `authenticated` không đọc bảng run hay gọi RPC; chọn câu chưa dùng trước, dùng lâu nhất sau, ổn định theo ngày; ngày tính theo giờ Việt Nam. Giáo viên bật 7 câu, bấm giao hôm nay, cron chạy lại không tạo trùng, học viên thấy bài. `tests/daily-practice.test.ts`, `tests/daily-practice-migration.test.ts`, `e2e-supabase/minna-teaching.spec.ts` |

Toàn bộ `e2e-supabase` (29 ca) và `e2e` (25 ca) đạt trên bản sao cô lập. `e2e/seo.spec.ts` (mô tả trang `/for-teachers`) từng lỗi một lần khi 25 ca dev chạy song song (hai thẻ meta trong lúc stream metadata), chạy lại riêng và trên HEAD đều đạt; chưa sửa vì ngoài phạm vi.

Kết quả soạn bài theo mẫu (lát B1 bản đầu):

| Ca | Kết quả | Bằng chứng |
|---|---|---|
| AU-01 | Một phần | Chọn một trong 4 mẫu và nhập mục tiêu nhỏ khi tạo bài; đối tượng, kiến thức đầu vào, độ khó, thứ tự sửa được; không cần scan/AI. Mẫu chưa có phần "ôn bài cũ" tự lấy từ bài trước |
| AU-02 | PASS (local) | Dán bảng từ Sheets/Excel: dòng tiêu đề bỏ qua, lỗi từng dòng (thiếu chữ Hán, cột đảo), trùng từ, thiếu pinyin chỉ cảnh báo; chỉ thêm sau khi bấm xác nhận |
| AU-03 | PASS (local) | Dựng slide xác định, xem số thay đổi trước khi áp dụng; dựng lại không nhân slide, giữ thứ tự, slide sửa tay, slide đã xóa và ghi chú giáo viên. Diff cũ không được kiểm theo revision; ghi đè giữa hai tab bị chặn ở bước lưu CAS |
| AU-04 | PASS (local) | Tạo khung câu chọn nghĩa/viết chữ Hán/viết pinyin từ từ vựng; câu thiếu đáp án không xác nhận được; sửa câu làm mất xác nhận; xuất bản bị chặn tới khi xác nhận lại |
| AU-05 | Một phần | Lưu nháp thiếu nội dung, tải lại đúng bản server, bước wizard lưu cùng nháp; CAS chặn tab cũ ở database. Chưa có E2E hai tab cho wizard và kiểm tra đổi tab preview trên mobile |
| AU-06 | PASS (local) | Xem trước slide/trang học viên không có ghi chú; xuất bản giữ bài riêng tư; giao lớp là bước riêng; học viên chỉ đọc version được ghim |
| AU-07 | PASS (local) | Tạo bản sao bài của mình và sao chép bài được chia sẻ đúng quyền thành nháp độc lập có nguồn; quyền view không sao chép được; bản sao không chia sẻ tiếp |
| AU-09 | NOT RUN | Chưa có TTS web/nghe duyệt audio cho bài Trung |
| CT-02 | PASS (local) | Như SV-10 |
| AD-01 | PASS (local) | ADMIN-01: khi bật duyệt, yêu cầu giảng dạy ở trạng thái chờ và chưa vào được `/teach`; quản trị viên duyệt thì dạy được, tạm dừng thì mất quyền và không tự kích hoạt lại. `tests/platform-admin-migration.test.ts`, `e2e-supabase/platform-admin.spec.ts` |
| AD-02 | PASS (local) | Người không phải quản trị viên nhận 404 ở `/admin`, vai `authenticated` không đọc/ghi được `platform_admins` và không gọi được RPC quản trị; mỗi thao tác quản trị có dòng nhật ký |
| AD-03 | PASS (local) | Hạn thuê đã qua hiện nhãn "Quá hạn thuê"; tắt duyệt thì giáo viên mới tự kích hoạt; trang quản trị không tràn ngang ở 360px |
| SEO-01 | PASS (local) | `robots.txt` chặn khu vực riêng tư và trỏ sitemap; `sitemap.xml` có trang công khai và bài công khai, không có `?version=`. `tests/site-seo.test.ts`, `e2e/seo.spec.ts` |
| SEO-02 | PASS (local) | `/for-teachers` có H1, tiêu đề, mô tả, canonical và JSON-LD FAQPage; trang bài có canonical không kèm phiên bản và JSON-LD LearningResource; slide có `noindex` |
| SEO-03 | NOT RUN | Xác minh Search Console, nộp sitemap và đo Core Web Vitals trên domain thật |
| CT-03 | Một phần | Ở 360px các trang `/teach`, tạo bài, thư viện, chia sẻ, trang đọc bài Trung và cả 5 bước wizard không tràn ngang (E2E); chữ Hán/pinyin có `lang` đúng. Chưa đo trên thiết bị thật, chưa kiểm tra bàn phím/tương phản thủ công |

Hồi quy đi kèm (lần chạy cuối ngày 29/10/2026): `npm run check` (87 test), `npm run test:e2e` 25/25 (gồm 4 ca SEO), `npm run test:e2e:supabase` 25/25 (gồm luồng Nhật cũ, 3 ca soạn/học/360px bài Trung, chia sẻ và quản trị) và `npm run build`.

Nguồn: [yêu cầu](../01-requirements.md), [BD](../basic-design/teaching-service.md), [DD dự kiến](../detail-design/teaching-service.md).

| Ca | Yêu cầu | Tình huống và kết quả cần đạt |
|---|---|---|
| SV-01 | SERVICE-01 | Giáo viên đăng ký, xác minh email, được server kích hoạt; chưa xác minh không được tạo lớp |
| SV-02 | SERVICE-01/02 | Sửa role/user_metadata hoặc giả user_id không cấp quyền; bị đình chỉ dạy không truy cập API giáo viên |
| SV-03 | SERVICE-01 | Một người vừa dạy lớp A vừa học lớp B; không mất lịch sử học hoặc quyền chủ lớp |
| SV-04 | SERVICE-02 | Hai giáo viên khác nhau không đọc/sửa lớp, nháp, notes, bài nộp, email hoặc media riêng của nhau qua UI/API/RLS/URL |
| SV-05 | CLASS-08 | Lớp 10 chỗ: nhận đủ 10; người 11 bị chặn; retry thành viên cũ không tăng số chỗ |
| SV-06 | CLASS-08 | Hai người tranh chỗ cuối, chỉ một vào được; rời/rejoin/đổi capacity không vượt sức chứa, không xóa lịch sử |
| SV-07 | CLASS-09 | Chủ lớp nhập link Meet hợp lệ, học sinh lớp đọc được; người ngoài/học sinh đã rời không đọc được; URL nguy hiểm bị từ chối |
| SV-08 | CLASS-09 | Dạy thử qua Meet: chỉ share tab slide, audio nghe được; presenter, notes, đáp án test và dashboard không lộ |
| SV-09 | LANG-01 | Bài Việt–Trung: hướng dẫn/nghĩa Việt, chữ Hán/pinyin/audio Trung, font/input/TTS đúng locale; không bật wanakana cho Trung; hồi quy riêng snapshot Nhật cũ |
| SV-10 | LANG-01 | Tiếng Trung giữ thanh điệu và phân biệt giản/phồn theo đáp án; tiếng Nhật giữ âm dài, âm ngắt và đáp án thay thế |
| SV-11 | SHARE-01 | View chỉ xem đúng version, không copy/edit/giao bài trực tiếp cho lớp; tài khoản khác không dùng được grant |
| SV-12 | SHARE-01/02 | Copy tạo draft riêng, đủ refs/media/nguồn; không có notes, test, thông tin lớp hoặc kết quả học sinh |
| SV-13 | SHARE-02 | Retry copy không nhân bài/asset; sửa/xuất bản bài nguồn không đổi bản sao hoặc assignment cũ |
| SV-14 | SHARE-01 | Thu hồi chặn xem/copy mới; URL media hết hiệu lực theo TTL; bản copy hợp lệ giữ hoạt động đúng điều kiện đã thông báo |
| SV-15 | SCAN-01 | Upload JPG/PNG/PDF đúng giới hạn; tệp hỏng/giả MIME/quá trang/quá dung lượng/PDF có mật khẩu bị từ chối rõ ràng |
| SV-16 | SCAN-01/OPS-02 | Job riêng tư: giáo viên khác không đọc file/status/output; quota và concurrency không vượt khi gửi song song |
| SV-17 | SCAN-02/03 | Bài in choice/fill nhận dạng thành draft, đối chiếu trang/vùng; thiếu đáp án hoặc câu chưa duyệt không xuất bản được |
| SV-18 | SCAN-02 | Chữ viết tay/bảng khó/không đọc được báo cần sửa, không bịa câu/đáp án; gợi ý AI chưa duyệt không được chấm |
| SV-19 | SCAN-02 | Worker lỗi/retry/timeout không mất sửa tay; conflict revision không ghi đè; import lặp chỉ tạo một draft |
| SV-20 | SCAN-02/SERVICE-02 | Ảnh nguồn có đáp án cuối trang không lọt vào ảnh học sinh, preview/PDF/media; test vẫn giữ policy after_due |
| SV-21 | SCAN-01/OPS-02 | Xóa nguồn/retention dọn OCR trung gian và job lỗi đúng hạn; không làm hỏng asset còn được bài xuất bản dùng |
| SV-22 | GRADE-01 | Choice/fill tự chấm từ snapshot; dạng chưa hỗ trợ bị chặn khi xuất bản. Sau khi có chấm tay: chờ chấm không thành 0 |
| SV-23 | SERVICE-02 | Bài nộp trùng chỉ chấm một lần; tiến độ và báo cáo đúng lớp; chưa nộp khác 0 điểm |
| SV-24 | OPS-02 | Email chỉ đến thành viên đủ điều kiện và đã đồng ý; rời lớp/đã nộp/tắt nhắc được loại khi gửi, job retry không nhân gửi |
| SV-25 | SCAN-03 | So sánh nhập tay và sửa OCR trên bộ scan được phép dùng: ghi thời gian, số lỗi, câu sửa, chi phí/trang và phản hồi giáo viên |
| SV-26 | LANG-01 | Môn học, ngôn ngữ hướng dẫn và ngôn ngữ nội dung được lưu riêng; giao diện Việt không tự đổi bài Trung giản/phồn hoặc biến thành môn tiếng Việt |

Bộ thử MVP cần hai giáo viên tiếng Trung, học sinh Việt Nam thuộc hai lớp khác nhau, một lớp capacity 10 và nội dung Việt–Trung có quyền sử dụng. Dữ liệu Nhật hiện có dùng kiểm tra hồi quy, không phải khóa học mới bắt buộc để ra mắt. Không dùng email/tệp của học sinh thật trong automated test. Dạy qua Meet và chất lượng OCR/font/audio cần kiểm chứng thủ công trên thiết bị thật; ghi bằng chứng và giới hạn trước nghiệm thu.

## Nghiệm thu soạn bài theo mẫu — toàn bộ NOT RUN

| Ca | Yêu cầu | Tình huống và kết quả cần đạt |
|---|---|---|
| AU-01 | AUTHOR-01/07 | Chọn từng mẫu, nhập mục tiêu nhỏ; bài đầu bỏ ôn cũ được, có đường soạn tay không cần scan/AI; giáo viên sửa thứ tự/độ khó được |
| AU-02 | AUTHOR-02 | Dán bảng Trung/pinyin/nghĩa Việt/ví dụ; giữ thanh điệu/giản-phồn, lỗi/duplicate rõ từng dòng; preview không tự ghi dữ liệu lỗi |
| AU-03 | AUTHOR-03 | Dựng slide đúng thứ tự, chữ dài đọc đủ trên 1280×720, một nội dung dùng chung refs; dựng lại không nhân slide hoặc mất sửa tay, diff cũ bị chặn khi revision đổi |
| AU-04 | AUTHOR-04 | Tạo choice/fill từ từ/câu, thiếu đáp án/lựa chọn hoặc chưa duyệt không xuất bản; sửa câu/đáp án làm mất xác nhận, không dùng câu luyện lộ sẵn làm test bí mật |
| AU-05 | AUTHOR-05 | Lưu draft thiếu nội dung, quay lại bước/tải lại/tiếp tục đúng bản server; hai tab báo conflict; chỉ báo đã lưu khi server xác nhận, mobile không mất dữ liệu khi đổi tab preview |
| AU-06 | AUTHOR-05 | Xem trước vai học sinh không lộ notes/test; publish không tự public/giao/email; giao đúng version/lớp/hạn, retry không tạo trùng, lỗi giao không mất version đã xuất bản |
| AU-07 | AUTHOR-06 | Dùng lại bài riêng hoặc copy đúng grant tạo draft độc lập có nguồn; không mang lớp/hạn/điểm/notes người khác; view không copy được, đổi mẫu không sửa snapshot cũ |
| AU-08 | AUTHOR-07/08 | Một giáo viên soạn bài nhập môn với một mục tiêu nhỏ, dạy thử và giao/làm/chấm một practice; ghi thời gian chuyên môn và thời gian thao tác riêng, đếm chỗ cần hỗ trợ và kiểm tra mục tiêu dưới 30 phút |
| AU-09 | AUTHOR-02/05 | Audio chưa có/đang tạo/chưa nghe duyệt/sẵn sàng hiển thị đúng; thiếu media chặn loại câu cần audio; luồng tạo/duyệt audio trên web không đòi giáo viên chạy CLI |

Đo AU-08 trước khi làm nhiều mẫu/OCR; giáo viên chuyên môn duyệt nội dung Việt–Trung minh họa, không dùng tên bài mẫu như bằng chứng chất lượng giáo trình. Những ca trên là tiêu chí sản phẩm mới, chưa được kiểm chứng bởi bộ tests code hiện tại.

## Kiểm chứng hợp đồng chung — toàn bộ NOT RUN

| Ca | Yêu cầu/phạm vi | Kết quả cần đạt |
|---|---|---|
| CT-01 | DATA-01/LANG-01 | Reader/slide/presenter/PDF/assignment cùng context version; sửa draft không đổi metadata hoặc điểm cũ; v1 tiếp tục chạy |
| CT-02 | LANG-01/EX-02 | Profile Trung NFC+trim giữ thanh điệu/khoảng trắng pinyin/dấu câu/giản-phồn; chỉ đáp án khai báo được nhận; profile Nhật không đổi |
| CT-03 | AUTHOR-02/03/UI | Chữ Hán/pinyin/nghĩa và nội dung dài đúng font/lang ở 360px và 1280×720; bàn phím, focus, reduced motion và tương phản kiểm tra được |
| CT-04 | SERVICE-02/API | Payload sai/schema lạ/quá dung lượng/origin sai/quota hết bị chặn; mã lỗi/field dễ xử lý, không lộ SQL/token/dữ liệu riêng |
| CT-05 | DATA-03/SHARE-02/SCAN-02 | requestId retry trả kết quả cũ; cùng key khác payload bị conflict; revision sai không overwrite và không nhân asset/job/bản copy |
| CT-06 | OPS-01 | Migration nâng từ dữ liệu v1 không mất bài/điểm/quyền; flag dừng v2 không hỏng reader; khôi phục DB/media đã thử với bằng chứng |
| CT-07 | Audio | Locale Trung không fallback Nhật; đổi text/voice làm mất duyệt; draft đổi khi worker chạy không gắn audio cũ vào câu mới; nghe duyệt thật được lưu |
| CT-08 | OPS-02 | Quota, lease/retry và retention nguồn/OCR đúng; asset còn snapshot không bị xóa; nhà cung cấp chưa bật trả trạng thái chưa sẵn sàng |
| CT-09 | SERVICE/OPS | Giáo viên độc lập tạo lớp, soạn một bài dễ, dạy qua Meet, giao/nộp/chấm/theo dõi/nhắc trọn luồng; ghi thời gian, chi phí và phản hồi |

Ca CT-03 cần đo thủ công và thiết bị thật; CT-06 là nghiệm thu vận hành, không phải kết quả từ unit test. Chỉ cập nhật NOT RUN khi có người thực hiện, môi trường, thời điểm và bằng chứng.

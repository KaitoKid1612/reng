# Rà soát độ dễ dùng và dạy online Nhật–Trung — 02/11/2026

Báo cáo này ghi lại đợt đi thử các luồng chính của Reng bằng trình duyệt, những gì đã sửa ngay và những gì nên làm tiếp để dạy online tiếng Nhật và tiếng Trung dễ hơn. Đợt trước: [rà soát luồng 30/10](user-flow-review.md), [rà soát hiện trạng 02/11](project-health-2026-11-02.md).

## Kết luận

Reng đủ để chạy lớp pilot: giáo viên trình chiếu, giao bài, có bài hằng ngày tự giao; học viên làm bài, xem điểm, ôn câu sai. Đi thử cho thấy người dùng dễ vấp ở ba chỗ:

1. **Tìm đúng trang.** Header luôn hiện "Lịch sử học tập" dù đó chỉ là bản lưu từ Google Sheet. Link "Luyện tập" thực chất là luyện kana nhưng trùng chữ với bài "Luyện tập hằng ngày". Ngày 02/11 chính chủ dự án đã mở `/history` để tìm bài hằng ngày, rồi hỏi xem tiến độ ở đó.
2. **Làm bài 40–60 câu trên điện thoại.** Không có danh sách câu, mỗi câu phải bấm Kiểm tra rồi Câu sau. Hộp xác nhận nộp chỉ báo "Còn 59 câu chưa trả lời" mà không dẫn tới câu đó. Trang kết quả mở toàn bộ 60 câu, dài khoảng 18.000px.
3. **Dạy qua Meet.** Trang lớp không có nút trình chiếu bài của lớp. Nút Trình chiếu ở trang Giảng dạy mở phiên bản xuất bản mới nhất, có thể khác bản lớp đang học. Link Meet nằm trong form cuối trang (trang dài khoảng 4.500px). Số slide đã dạy phải nhớ rồi gõ tay.

Lớp tiếng Trung còn một lỗi hiển thị: trang kết quả, sổ lỗi, trang học viên và danh sách "Câu cả lớp sai nhiều" gắn `lang="ja"` cho chữ Hán, pinyin và cả câu trả lời tiếng Việt. Ô pinyin lại bắt gõ dấu thanh, trong khi bàn phím điện thoại tiếng Việt không có các dấu này.

Đợt này đã sửa 15 điểm, liệt kê ở bảng dưới. Mỗi điểm đều có kiểm thử tự động hoặc kiểm tra trên trình duyệt. Chưa kiểm thử với người dùng thật trên điện thoại thật.

## Cách kiểm tra

- Source gốc `24aada7`. Supabase local là các container `supabase_*_reng-history-tests` đã có sẵn trên máy (bật lại, không tạo mới; chỉ áp thêm migration `20261102044627` vào database local). Dev server chạy từ một bản sao riêng của repo để không đụng `.next` của repo.
- Bốn vai trên dữ liệu local:
  - Học viên lớp "Tiếng Nhật Minna – Lớp 1": 60 câu mỗi ngày, 7 bài giao.
  - Giáo viên lớp đó.
  - Học viên và giáo viên lớp tiếng Trung tạo bằng `npm run seed:demo`.
  Script chỉ ghi vào stack local và từ chối URL không phải `127.0.0.1`/`localhost`.
- Chụp màn hình ở 1280px và 390px; đo chiều cao header, độ tràn ngang và số mục menu; thử bàn phím (Enter, Escape) và trạng thái `lang` của từng phần tử.
- Không làm: thiết bị iOS/Android thật, buổi Google Meet thật, email thật, production.

## Số đo trước và sau

| Chỉ số | Trước | Sau |
| --- | --- | --- |
| Header điện thoại 390px | 188–190px: 4 hàng, 9 mục (học viên) hoặc 10 mục (giáo viên) | 67px: Reng, trang chính của người dùng, nút Menu |
| Header giáo viên 1280px | 130px, menu xuống hai hàng | 85px, một hàng 7 mục |
| Bài hôm nay ở trang chủ (học viên đã đăng nhập, 390px) | Nằm dưới phần giới thiệu, ngoài màn hình đầu | Đầu trang, có nút Làm bài |
| Nộp bài luyện tập 60 câu có câu sai | Mở "Tất cả 60" | Mở thẳng bộ lọc "Sai", chỉ hiện câu sai |
| `lang` của đề/đáp án lớp tiếng Trung ở kết quả và sổ lỗi | `ja` (font Nhật) | Đề `vi`; đáp án `zh`, `zh-Latn-pinyin` hoặc `vi` theo ô nhập |

## Vấn đề và trạng thái

Ưu tiên: P1 cản bước chính hoặc dẫn sai; P2 làm khó tìm hoặc khó dùng; P3 hoàn thiện. "Đã sửa" nghĩa là source đã đổi và đã qua kiểm thử nêu ở mục Kiểm chứng.

### Học viên (Nhật và Trung)

| Mã | Ưu tiên | Vấn đề | Đã sửa |
| --- | --- | --- | --- |
| UX-01 | P1 | Header: "Lịch sử học tập" luôn hiện dù chỉ là bản lưu Sheet; "Luyện tập" (luyện kana) trùng chữ với bài "Luyện tập hằng ngày"; tài khoản đã đăng nhập vẫn thấy "Vào lớp", "Cho giáo viên" và phải tìm "Lớp của tôi" ở cuối | "Lịch sử Sheet" chỉ hiện khi tài khoản đọc được ít nhất một bản lưu (`/api/me` trả `hasLearningHistory`); đổi tên thành "Luyện kana"; người đã đăng nhập thấy Giảng dạy/Lớp của tôi trước, không còn link dành cho khách |
| UX-02 | P1 | Header điện thoại chiếm 4 hàng trên mọi trang | Menu gập sau nút Menu (`aria-expanded`, Escape để đóng, tự đóng khi chuyển trang); trang chính của người dùng (Lớp của tôi, Giảng dạy hoặc Đăng nhập) luôn ở cạnh nút |
| UX-03 | P2 | Trang chủ: "Hôm nay của bạn" nằm dưới phần giới thiệu, vẫn hiện "0 thẻ cần ôn" | Đưa lên đầu trang, mỗi bài có nút Làm bài, chỉ hiện khi có bài hoặc thẻ cần ôn |
| UX-04 | P2 | Lớp của tôi: nút nổi bật nhất là "Ôn tập (0 thẻ)", bài hôm nay chỉ là link chữ; Sổ lỗi và Tiến độ ở cuối trang; "Lịch sử từ Google Sheet" hiện cả khi không có | Mỗi bài cần làm có nút Làm bài/Làm tiếp; thêm mục "Ôn lại và tiến độ" ngay sau; link Sheet chỉ hiện khi có dữ liệu; có tên lớp khi học nhiều lớp |
| UX-05 | P2 | Trang lớp: bài cần làm lẫn với bài đã nộp; bài hằng ngày cộng thêm mỗi ngày mà không gộp; hiện "Phiên bản 1" | Tách "Bài tập cần làm" (đặt trước bài học) và "Bài đã làm và bài khác" (5 bài mới nhất, còn lại gập); nút Vào Google Meet dạng nút chính; bỏ số phiên bản với học viên |
| UX-06 | P1 | Làm bài dài trên điện thoại: không có danh sách câu, mỗi câu hai lần bấm, xác nhận nộp không dẫn tới câu trống | Danh sách câu gập (từ 6 câu): màu theo đã trả lời/đúng/sai, bấm số để nhảy tới câu đó. Enter kiểm tra câu luyện tập, Enter lần nữa sang câu sau (con trỏ vào sẵn ô kế tiếp). Enter khi đang gõ IME chỉ xác nhận chữ, và ở câu cuối không mở hộp nộp bài. Thêm nút "Đến câu chưa làm" |
| UX-07 | P2 | Kết quả 60 câu mở "Tất cả", khoảng 18.000px trên điện thoại | Nộp bài luyện tập có câu sai sẽ mở `?outcome=wrong`; bài kiểm tra vẫn mở như cũ để không lộ đúng/sai trước giờ công bố |
| UX-08 | P1 | Lớp tiếng Trung: đề, đáp án và câu trả lời ở trang kết quả, sổ lỗi, trang học viên (giáo viên xem) và "Câu cả lớp sai nhiều" bị gắn `lang="ja"`, nên chữ Hán dùng font Nhật, chữ giản thể như 谢 phải lấy font khác, trình đọc màn hình đọc sai ngôn ngữ | Đề theo ngôn ngữ câu hỏi; câu trả lời theo ô nhập (`answerLang`, dùng chung bảng `INPUT_LANGS` với ô nhập); danh sách câu sai nhiều theo ngôn ngữ lớp |
| UX-09 | P1 | Ô pinyin chỉ nhận dấu thanh (nǐ hǎo), bàn phím điện thoại tiếng Việt không có các dấu này | Gõ số thanh sau mỗi âm sẽ đổi thành dấu: `ni3 hao3` thành `nǐ hǎo`, `lao3shi1` thành `lǎoshī`, `v` thành `ü`, số 5 hoặc 0 là thanh nhẹ. Gợi ý dưới ô nêu cách gõ; chấm điểm không đổi |
| UX-10 | P3 | Tiến độ: nút "Lịch sử từ Google Sheet" nổi bật ở đầu trang dù không có dữ liệu; danh sách bài dài dần | Bỏ nút (mục Sheet ở cuối trang vẫn hiện khi có dữ liệu); gập bài cũ sau 5 bài |

### Giáo viên dạy online

| Mã | Ưu tiên | Vấn đề | Đã sửa |
| --- | --- | --- | --- |
| UX-11 | P1 | Trang lớp không trình chiếu được bài của lớp; trang Giảng dạy mở phiên bản xuất bản mới nhất, có thể khác bản lớp học | Khối "Buổi dạy online" ở đầu trang lớp. Mục Nội dung lớp có Trình chiếu/Đọc bài cho từng bài, đúng phiên bản lớp đang dùng |
| UX-12 | P2 | Link Meet chỉ nằm trong form Cài đặt lớp cuối trang | Nút Mở Google Meet ở khối Buổi dạy online; lớp chưa có link thì có nút Thêm link Google Meet dẫn tới cài đặt |
| UX-13 | P2 | Ghi buổi dạy phải nhớ số slide và gõ tay ở cuối trang | Slide mở từ trang lớp có nút "Ghi buổi dạy (slide N)": quay về Nhật ký buổi dạy với bài và slide điền sẵn. Khối Buổi dạy online đổi thành "Trình chiếu tiếp từ slide N". Buổi chưa ghi lần nào thì chọn bài ở Nội dung lớp, vì lớp còn có ngân hàng câu hỏi, không nên đoán bài |
| UX-14 | P3 | Giải thích Bài luyện hằng ngày dài 6 dòng luôn mở | Còn một dòng; phần chi tiết gập ở "Cách Reng chọn câu mỗi ngày" |
| UX-15 | P3 | Hướng dẫn trong app còn mô tả cách cũ (Trình chiếu từ trang Giảng dạy, Mở slide ở đầu trang lớp) | Cập nhật `/guide`: Menu trên điện thoại, khối Buổi dạy online, Ghi buổi dạy từ thanh trình chiếu, Enter khi làm bài, kết quả mở câu sai, Lịch sử Sheet |

## Đề xuất tiếp theo để dạy online Nhật–Trung dễ hơn

Các mục dưới đây chưa làm trong đợt này. Thứ tự theo tác động với lớp pilot.

| Thứ tự | Ngôn ngữ | Việc nên làm | Lý do và tiêu chí nghiệm thu |
| --- | --- | --- | --- |
| 1 | Cả hai | Sửa 3 lỗi P1 về dữ liệu học tập trong [rà soát 02/11](project-health-2026-11-02.md): flashcard theo phiên bản lớp (CR-23), không tái dùng ID nội dung (CR-21), hàng ôn bị chặn bởi 200 thẻ không đọc được (CR-22) | Sai lịch ôn khó phát hiện. Cần ca hồi quy cho từng lỗi |
| 2 | Cả hai | Audio đọc mẫu sinh sẵn cho từ vựng và hội thoại của bài đang dạy (giọng ja-JP, zh-CN, zh-TW), có bước nghe duyệt | Hiện nút Nghe dùng giọng của thiết bị; máy không có giọng Nhật/Trung thì không có tiếng. Nghiệm thu: bài trong lớp phát được trên điện thoại không cài thêm giọng |
| 3 | Cả hai | Thử một buổi thật: giáo viên chia sẻ tab trong Meet, học viên làm bài hằng ngày trên điện thoại (iOS và Android) | Kiểm chứng bộ gõ romaji/kana, pinyin số thanh, bàn phím ảo che ô nhập, Enter trên bàn phím ảo; ghi lại chỗ cần trợ giúp |
| 4 | Cả hai | Giáo viên chấp nhận một câu trả lời tương đương ngay trên trang học viên (cộng điểm, thêm vào đáp án cho lần sau, có nhật ký) | Ngày 02/11 đã phải sửa điểm N5 bằng migration. Nghiệm thu: không cần SQL để sửa điểm một câu |
| 5 | Trung | Trang tự học cho người mới học tiếng Trung: bảng pinyin, luyện nghe và phân biệt 4 thanh, như phần kana của tiếng Nhật | Menu tự học hiện chỉ có tiếng Nhật; học viên lớp Trung không có bài nhập môn tương ứng. Một phần 03/11/2026: có bảng pinyin và luyện gõ pinyin (`/pinyin`); luyện nghe thanh điệu chờ audio |
| 6 | Cả hai | Câu hỏi nhanh trong buổi: giáo viên mở một câu trên slide, học viên trả lời bằng điện thoại, giáo viên thấy tỉ lệ đúng | Buổi Meet hiện chỉ có slide một chiều. Nên làm sau khi buổi thử ở mục 3 xác nhận nhu cầu |
| 7 | Cả hai | Đánh dấu loại bài "ngân hàng câu hỏi" và "bài học" | Lớp đang trộn hai loại: học viên thấy Flashcard/Luyện kanji cho ngân hàng không có từ vựng; khối Buổi dạy online chưa tự gợi ý được bài đầu tiên. Một phần ngày 03/11/2026: hai link chỉ hiện khi bài có từ vựng ([QA-07](question-authoring-2026-11-03.md)) |
| 8 | Cả hai | Trang Giảng dạy: chỉ hiện form lọc bài khi có nhiều bài, hoặc gập lại | Với 2 bài, form lọc chiếm phần lớn màn hình đầu. Đã làm 03/11/2026: form gập trong mục "Lọc bài học", mở sẵn khi có hơn 6 bài hoặc đang lọc |
| 9 | Cả hai | Render phần tài khoản của header ở server cho các trang cần đăng nhập | Header vẫn tải tài khoản sau khi trang hiện, nên các mục đổi một nhịp sau khi tải. Một phần 03/11/2026: trình duyệt đã đăng nhập không còn thấy menu khách nháy qua (gợi ý trong localStorage, script inline trước lần vẽ đầu) |
| 10 | Cả hai | Tiến độ theo ngày và theo dạng bài cho bài làm trên Reng, như trang lịch sử Sheet | Người học không còn cần mở bản lưu cũ để xem mình yếu dạng nào (mục 5 của rà soát 02/11). Một phần 04/11/2026: trang Tiến độ có mục Theo dạng câu (tỉ lệ đúng từng dạng, dạng hay sai nhất). Cùng ngày có thêm trang Bài tập hằng ngày: điểm từng ngày với ô màu như Sheet cũ, bấm vào ngày để xem từng câu ([kiểm chứng](flow-fixes-2026-11-03.md#lịch-sử-bài-tập-hằng-ngày-04112026)) |

## Quy trình dạy một buổi online sau đợt này

1. **Trước buổi.** Mở trang lớp, xem "Câu cả lớp sai nhiều" và tỉ lệ nộp bài tuần này.
2. **Vào lớp.** Ở khối Buổi dạy online: bấm Mở Google Meet, rồi "Trình chiếu tiếp từ slide N". Buổi đầu thì bấm Trình chiếu ở bài cần dạy trong Nội dung lớp. Bấm Toàn màn hình. Trong Meet chọn Trình bày → Một thẻ. Mở Presenter (phím S) ở cửa sổ riêng để xem ghi chú, không chia sẻ cửa sổ đó.
3. **Kết thúc.** Bấm "Ghi buổi dạy (slide N)" trên thanh trình chiếu, thêm ghi chú (ví dụ: học viên còn nhầm 〜つ và 〜人), rồi bấm Ghi buổi dạy. Bài hằng ngày tự giao lúc 6:00; muốn giao thêm thì bấm Giao bài.
4. **Học viên.** Mở Reng, bài hôm nay nằm ngay đầu trang chủ và ở Lớp của tôi. Làm bài:
   - Tiếng Nhật: gõ romaji ra kana; ん ở giữa từ gõ `nn`.
   - Tiếng Trung: gõ pinyin kèm số thanh (`ni3 hao3`), hoặc dùng bộ gõ chữ Hán.
   - Enter để kiểm tra, Enter lần nữa sang câu sau. Nộp xong xem câu sai, rồi ôn ở Ôn tập/Sổ lỗi.

## Kiểm chứng

- `npm run check`: PASS. Gồm Prettier, ESLint, TypeScript và 165 test logic/database. Test mới kiểm tra ngôn ngữ của câu trả lời, link quay lại nhật ký và điền sẵn, và cách đổi số thanh pinyin.
- `npm run test:e2e`: PASS 36/36. Test mới cho header điện thoại (gập/mở, Escape, tự đóng khi chuyển trang, cao dưới 90px). Header theo vai: giáo viên không thấy link dành cho khách; Lịch sử Sheet chỉ hiện khi có dữ liệu.
- `npm run test:e2e:supabase` trên stack local: kết quả ở mục dưới. Bổ sung các bước:
  - Kết quả mở câu sai sau khi nộp có câu sai.
  - Enter kiểm tra câu luyện tập (romaji được hoàn tất trước).
  - Khối Buổi dạy online hiện "Trình chiếu tiếp từ slide 12".
  - Từ slide 13 bấm "Ghi buổi dạy (slide 13)" thì form điền sẵn bài và số 13.
  - Lớp tiếng Trung: trang kết quả gắn `lang="vi"` cho đề và `lang="zh"` cho câu trả lời chữ Hán.
- Đi thử bằng script trên dữ liệu local:
  - Giáo viên: trình chiếu bài 11 từ Nội dung lớp → tới slide 5 → "Ghi buổi dạy (slide 5)" → form điền sẵn → ghi → khối hiện "Trình chiếu tiếp từ slide 5". Menu điện thoại mở, Escape đóng.
  - Học viên (390px): Enter kiểm tra rồi chuyển câu, con trỏ vào ô kế tiếp; danh sách câu hiện đúng trạng thái; "Đến câu chưa làm" nhảy về câu trống đầu tiên; nộp bài mở `?outcome=wrong` với "Hiển thị 59 / 60 câu".
  - Học viên lớp Trung: nộp bài rồi kiểm tra `lang` ở trang kết quả và sổ lỗi; gõ `lao3shi1` ra `lǎoshī`, Enter chấm "Đúng rồi!".

### Kết quả E2E với Supabase local

- PASS 35/35 (2,7 phút) trên code cuối, chạy bằng `npx playwright test -c playwright.supabase.config.ts`, với khóa và URL lấy từ stack local đang chạy.
- Lần chạy trước đó có 1 test hỏng, đúng do thay đổi chủ ý: bài tiếng Trung đạt 50% giờ mở `?outcome=wrong`. Đã cập nhật test và thêm kiểm tra `lang`; chạy lại riêng file đạt 4/4, rồi chạy lại toàn bộ.

## Giới hạn

- Đánh giá dựa trên dữ liệu thử và trình duyệt Chromium headless. Bàn phím ảo, bộ gõ tiếng Nhật/Trung trên điện thoại, Safari iOS và chia sẻ tab trong Meet chưa được thử.
- Dữ liệu local có hai bài "Luyện tập hằng ngày 02/11" (một bài giao tay khi dựng dữ liệu). Không coi đó là lỗi của cron.
- Không đổi schema, quyền hay dữ liệu production. Thay đổi trong đợt này chỉ ở giao diện và API đọc `/api/me`, nên triển khai không cần migration.

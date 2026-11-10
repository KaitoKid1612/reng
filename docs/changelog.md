# Nhật ký thay đổi

Những thay đổi chính theo ngày, mới nhất ở trên. Báo cáo kiểm thử và rà soát đầy đủ ở [mục lục tài liệu](README.md#báo-cáo-kiểm-thử-và-rà-soát).

### 10/11/2026

- Làm đẹp giao diện trên PC: nút chọn giao diện thành ba nút biểu tượng; trang Tài khoản và Email nhắc học có tab chung, hai thẻ form cạnh nhau và lối tắt tới Tiến độ, Sổ lỗi; các trang một cột (đăng nhập, đăng ký, vào lớp, ôn tập, flashcard…) nằm giữa màn hình; Tạo bài mới có lưới bài mẫu và hai form soạn cạnh nhau; Bài được chia sẻ và Chia sẻ bài dùng bố cục rộng. Xem [báo cáo](testing/code-review-2026-11-10.md#làm-đẹp-giao-diện-trên-pc).
- Rà soát quy ước mã nguồn và tài liệu: ba script Python của đợt JLPT 09/11 viết lại bằng TypeScript (`npm run jlpt:drafts`, `npm run audit:jlpt-audio`) và bộ câu nháp nay được kiểm tra trong `npm run check`; tách trang lớp của giáo viên và bảng sửa lỗi hiển thị thành component theo từng phần; tách `app/globals.css` thành 18 file theo khu vực trong `app/styles/` (giao diện không đổi: so computed style 59.628 phần tử); [quy ước code](coding-standards.md) mô tả đủ cấu trúc thư mục, cách viết script, CSS, test và commit. Xem [báo cáo](testing/code-review-2026-11-10.md).
- Giao diện sáng và tối: ba nút **Giao diện** trên thanh đầu trang (Theo máy, Sáng, Tối), lưu trong trình duyệt; slide, Presenter và bản in giữ nền sáng. Gộp từ nhánh `feat/site-theme-light-dark-20261110`, sửa lỗi lint/kiểu và chữ slide không đọc được ở giao diện tối. Xem [thiết kế](detail-design/teaching-service.md#giao-diện-sáng-và-tối--10112026).
- Tài liệu nguồn đề JLPT N4/N5 (đợt 09/11): danh mục nguồn chính thức chỉ lưu link, chờ duyệt bản quyền; 6 câu N5 và 6 câu N4 tự biên soạn, đã duyệt tiếng Nhật ngày 10/11 (sửa 4 câu, thay 2 câu kanji vượt cấp N4); bộ 20 câu nghe thi thử N4 (`content/listening/n4-viet-listening-mock-20.json`) nay có audio hội thoại hai giọng (nữ Sakura, nam Haruto) sinh ngày 10/11; bộ đề nghe ghi giọng cho từng người nói trong `speakerVoices`. Xem [hướng dẫn nội dung](content-authoring.md#nguồn-đề-jlpt-và-câu-tự-biên-soạn).

### 09/11/2026

- Thi thử JLPT: giáo viên lớp tiếng Nhật tạo đề N5/N4 từ ngân hàng ôn của lớp theo ba phần như đề thật, mỗi học viên một lượt có đồng hồ (mặc định 90/115 phút) tự nộp khi hết giờ; kết quả có điểm từng phần, điểm ước tính thang 180 và đếm ngược tới kỳ thi 06/12/2026. Cần áp migration `20261109032029`. Xem [thiết kế](detail-design/phase-3.md#thi-thử-jlpt--09112026).
- Rà soát sau đợt merge 07/11: tên file migration nay khớp lịch sử production (`20261107044229_daily_practice_seventy`, điểm danh đổi thành `20261109024203`) để `npx supabase db push --linked` chạy được; form bài luyện hằng ngày có lựa chọn **Theo tỉ lệ của bài** và lưu form không còn tự đổi lớp sang 0 câu nghe; lưu vị trí slide không còn xóa dấu "Đã học xong"; CI chạy `npm run check` (có kiểm tra định dạng) cho PR và `main`. Xem [báo cáo](testing/review-2026-11-09.md).

### 07/11/2026

- Bài luyện hằng ngày và bài giao tối đa 70 câu (migration đã áp production); lớp chọn số câu nghe mỗi ngày (0–10 hoặc theo tỉ lệ của bài); ngân hàng ôn N4/N5 thêm câu nghe có audio; học viên mở lại slide ở vị trí đã xem. Xem [thiết kế](detail-design/teaching-service.md#số-câu-nghe-mỗi-ngày-bài-70-câu-và-mở-lại-slide--0711-và-09112026).

### 06/11/2026

- Rà soát giao diện, luồng và database: quyền, RLS và quan hệ dữ liệu đúng thiết kế; 38/38 và 34/34 kịch bản E2E đạt sau khi cập nhật 7 kịch bản theo giao diện mới; crawl 326 trang theo vai không có lỗi. Còn lại: quyền ghi thẳng bảng `lessons` cho phép lách kiểm tra chia sẻ lại, chưa có đường xóa dữ liệu học viên. Xem [báo cáo](testing/project-audit-2026-11-06.md).
- Giáo viên sao chép tin nhắn giao bài (tên bài, hạn nộp, link) để dán vào nhóm Zalo/Messenger của lớp. Xem [thiết kế](detail-design/phase-3.md#tin-nhắn-giao-bài-cho-nhóm-lớp--06112026).
- Điểm danh trong nhật ký buổi dạy và danh sách học viên hay vắng. Cần áp migration `20261109024203`. Xem [thiết kế](detail-design/teaching-service.md#điểm-danh-trong-nhật-ký-buổi-dạy--06112026).

### 05/11/2026

- Sửa lỗi hiển thị bài đã giao: giáo viên sửa đề, giải thích và furigana của câu đã giao (kể cả bài hằng ngày) mà không đổi đáp án, bài làm hay điểm; mỗi lần sửa được lưu lại. Cần áp migration `20261105044634`. Xem [thiết kế](detail-design/phase-3.md#sửa-lỗi-hiển-thị-bài-đã-giao--05112026).
- Furigana trong bài tập: đề, lựa chọn, đoạn văn, giải thích và lời nghe hiện cách đọc khi giáo viên viết `{漢字|かんじ}`, như trang đọc bài; xuất bản từ chối furigana làm lộ đáp án. Xem [thiết kế](detail-design/phase-3.md#furigana-trong-bài-tập--05112026).
- Rà soát tài liệu, mã nguồn và trải nghiệm (04–05/11/2026): mọi trang ghi ngày giờ một kiểu ("23:59 04/11/2026"), form giao bài dùng chữ "giao" thay cho "xuất bản", lượt bỏ dở của bài không cho nộp muộn được tự nộp khoảng 6:00 sau hạn (cần áp migration `20261105012503`), thêm [sổ tay vận hành](operations.md), viết lại [kiến trúc](02-architecture.md). Xem [báo cáo](testing/system-review-2026-11-05.md).

### 04/11/2026

- Trang lịch sử bài tập cũ từ Google Sheets (`/history`) đã gỡ ngày 04/11/2026: bài làm trên Reng xem ở trang Tiến độ (điểm theo tuần, sổ lỗi, tỉ lệ đúng theo dạng câu) và trang Luyện tập hằng ngày của lớp (`/classes/[id]/daily-practice`: điểm từng ngày với ô màu như Sheet cũ, bấm ngày để xem từng câu; giáo viên xem ở trang chi tiết học viên); link cũ chuyển về `/progress`. Bảng dữ liệu đã nhập vẫn giữ trong database. Xem [thiết kế cũ](basic-design/learning-history.md).
- Chuẩn hóa Kanji Nhật v1 (04/11/2026): migration `20261104063229` đã áp dụng trên cloud `reng`, sửa `kanji: null` thành bỏ trường trong nháp và snapshot, giữ ID/version lớp đang ghim, thêm ràng buộc chặn giá trị sai kiểu. Xem [thiết kế](detail-design/phase-4.md#chuẩn-hóa-kanji-v1) và [kiểm chứng](testing/phase-4.md).

### 03/11/2026

- Ôn N4 (03/11/2026): bộ **Tổng ôn N4 — Minna 1–50** trong repo có **304 câu, 10 dạng bài** và 80 từ vựng. Ngoài đọc kanji, biến đổi từ, ngữ pháp và đọc hiểu, nay thêm chọn cách đọc kanji, chọn chữ Hán, từ vựng theo ngữ cảnh, câu cùng nghĩa, điền trợ từ và sắp xếp câu (bấm mảnh theo thứ tự). Đoạn văn đọc hiểu nằm trong khung riêng, và các câu cùng đoạn đi liền nhau. Bài hằng ngày 40 câu đủ 10 dạng. Production vẫn dùng bản 200 câu cho đến khi chạy `npm run bank:sql` theo [hướng dẫn](testing/n4-review-bank.md#đa-dạng-dạng-bài--03112026). Bộ Minna 1–28 vẫn giữ riêng. Câu tự biên soạn, chưa sinh câu mới bằng AI; chưa có phần nghe.
- Sửa lỗi luồng học và dạy (03/11/2026): trang Tài khoản (đổi họ tên, mật khẩu), quên mật khẩu có lối vào bằng Google, thông báo câu luyện nghe rõ ràng, trình soạn hỏi lại trước khi rời trang chưa lưu, giáo viên xóa học viên khỏi lớp và học viên tự rời lớp, lịch học hằng tuần với "Buổi tới" cho học viên (migration `202611030002` đã chạy trên production), trình soạn có mục "Dùng bài trong lớp" và trang Giảng dạy có "Các bước bắt đầu dạy", học viên có mục "Hôm nay học gì" ở Lớp của tôi và trang chủ. Xem [lỗi còn lại và phần cần quyết định](testing/flow-fixes-2026-11-03.md).
- Kiểm tra bố cục bằng code (03/11/2026): `npm run audit:layout` mở các trang ở 360/768/1280px và báo chữ chồng hoặc dính nhau, hàng lệch, nút sát chữ, chữ bị cắt, tràn ngang và vùng bấm nhỏ; các chỗ nó tìm thấy đã được sửa. Xem [công cụ và kết quả](testing/layout-audit-2026-11-03.md).
- Đăng nhập bằng Google (03/11/2026): nút Google ở trang đăng nhập và hai trang đăng ký, quay lại đúng trang đang mở. Nút chỉ hiện khi `AUTH_GOOGLE_ENABLED=true` và nhà cung cấp Google đã bật trong Supabase Auth; production đã bật từ 03/11/2026. Xem [các bước bật](poc-setup.md#bật-đăng-nhập-bằng-google-03112026) và [kiểm tra](testing/google-sign-in-2026-11-03.md).
- Trang chung không gắn môn (03/11/2026): trang chủ, header, chân trang, metadata và ảnh chia sẻ giới thiệu Reng là nơi dạy và học online, không gắn tiếng Nhật; công cụ tự học tiếng Nhật nằm ở trang Tự học (`/self-study`), cùng môn tiếng Trung với bảng pinyin và luyện gõ pinyin (`/pinyin`). Xem [rà soát và phần còn gắn với ngôn ngữ](testing/platform-neutral-ui-2026-11-03.md).
- Công cụ giáo viên (03/11/2026): từ chối yêu cầu làm giáo viên, audio sinh sẵn cho bài tiếng Trung, trang không còn lỗi khi danh sách dài; chấp nhận đáp án tương đương đang chờ áp migration. Xem [báo cáo](testing/teacher-tools-2026-11-03.md).
- Soạn câu sắp xếp và đọc hiểu (03/11/2026): giáo viên thêm câu sắp xếp và câu có đoạn văn ngay trên trình soạn tiếng Nhật, tiếng Trung và câu kiểm tra riêng; sửa câu ngân hàng ôn không còn mất đoạn văn hay ngôn ngữ. Xem [báo cáo](testing/question-authoring-2026-11-03.md).
- Độ đúng dữ liệu học tập (03/11/2026): flashcard và thẻ ôn theo bản lớp ghim, ID mục đã xóa không bị cấp lại, hàng ôn không bị thẻ hỏng che, thử lại khi mất mạng giữ kết quả đã lưu, chuỗi ngày học đủ khi ôn nhiều. Xem [báo cáo](testing/data-correctness-2026-11-03.md).
- Bài tập dùng chung cho tiếng Nhật và tiếng Trung (03/11/2026): ô trả lời, phản hồi, nhãn phần và ngân hàng ôn theo ngôn ngữ của câu; lớp tiếng Trung có "Luyện chữ Hán" (pinyin nhận số thanh). Xem [rà soát](testing/exercise-languages-2026-11-03.md).

### 02/11/2026

- Rà soát độ dễ dùng 02/11/2026 (đi thử học viên/giáo viên lớp Nhật và Trung ở 1280px và 390px): header gọn theo vai, menu gập trên điện thoại, bài hôm nay lên đầu, làm bài dài có danh sách câu và phím Enter, kết quả mở câu sai, pinyin gõ số thanh (`ni3 hao3` → `nǐ hǎo`), sửa thẻ ngôn ngữ tiếng Trung, khối Buổi dạy online (Meet, trình chiếu tiếp đúng phiên bản lớp, ghi buổi dạy từ slide). Xem [báo cáo và đề xuất tiếp theo](testing/user-flow-review-2026-11-02.md).
- Giáo viên vừa dạy vừa học dùng một tài khoản: học trong **lớp tự học** của mình (chỉ mình là học viên, không có mã mời) và không tự vào lớp mình dạy; báo cáo lớp dạy không tính chủ lớp. Trang lớp có **nhật ký buổi dạy** (bài, slide dạy tới, ghi chú riêng, mở lại đúng slide), và bài tạo từ mẫu Minna có trang **cập nhật từ mẫu** mới nhất. Xem [Luồng 7](basic-design/teaching-service.md#luồng-7--vừa-dạy-vừa-học-lớp-tự-học-nhật-ký-buổi-dạy-và-cập-nhật-bài-mẫu-02112026) và [kiểm chứng](testing/teach-and-learn.md).

### 30/10/2026

- Rà soát trải nghiệm ngày 30/10/2026: trang chủ có lối vào lớp bằng mã, tự học và giảng dạy; menu giáo viên mở trực tiếp cả lớp đang học. Trang giao bài hướng dẫn tạo/xuất bản khi chưa có học liệu và chỉ cho chọn bài đã có phiên bản xuất bản. Xem [báo cáo bug UI, cải tiến và giới hạn kiểm chứng](testing/user-flow-review.md).
- Rà soát mã nguồn 30/10/2026: đã sửa lỗi mất câu trả lời khi mạng chập chờn, mất bài đang soạn khi lưu lỗi, chuyển hướng ra trang ngoài qua `next`, trang chủ học viên che bài hôm nay, form lưu bài vào lớp đổi thứ tự/giờ mở; thêm link mời vào lớp. Xem [lỗi đã sửa, còn mở và giới hạn kiểm chứng](testing/code-review-2026-10-30.md).
- Quản lý Nhật–Trung: đã bổ sung tìm/lọc bài theo ngôn ngữ và trạng thái, nhãn ngôn ngữ từng phiên bản, lối chọn công cụ soạn/nhập và mặc định câu kiểm tra theo lớp. Xem [kết quả và phần cần nghiệm thu](testing/teaching-management.md), [quy trình nâng cấp bài](content-authoring.md#quản-lý-và-nâng-cấp-bài-cho-lớp-nhậttrung).

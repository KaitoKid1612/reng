# Reng — Tài liệu dịch vụ hỗ trợ giảng dạy

Reng hướng tới dịch vụ cho nhiều giáo viên: tạo lớp, trình chiếu và chia sẻ học liệu, bài tập, tiến độ và nhắc học; dạy video qua Google Meet bên ngoài. Tiếng Nhật N5 là nền đã có; mốc dịch vụ đầu tiên ưu tiên dạy tiếng Trung cho người Việt (Việt–Trung). Từ 29/10/2026 pilot ưu tiên dạy tiếng Nhật theo trình tự Minna no Nihongo (bài mẫu 1–15, slide hội thoại/bảng, furigana — xem [biên soạn](content-authoring.md)); luồng Việt–Trung vẫn giữ. Đã có và chạy trên production thử (https://reng-class.vercel.app, từ 29/10/2026): đăng ký giáo viên có quản trị viên duyệt, soạn bài Nhật và Việt–Trung, lớp học, bài tập, luyện tập hằng ngày, ôn tập, chia sẻ/sao chép bài và SEO cho trang công khai; nhập scan và TTS web chưa triển khai. Kiến trúc hướng tới nhiều môn/ngôn ngữ, không triển khai đồng loạt trong MVP.

## Bắt đầu từ đâu

| Bạn cần | Đọc theo thứ tự |
|---|---|
| Hiểu sản phẩm | [README gốc](../README.md) → [tổng quan](00-overview.md) → [yêu cầu](01-requirements.md) → [đối chiếu source](source-alignment.md) |
| Sửa mã nguồn | [coding standards](coding-standards.md) → [kiến trúc](02-architecture.md) → [dữ liệu](03-data-design.md) → BD/DD của tính năng (mục dưới). Rule cho agent ở [AGENTS.md](../AGENTS.md) |
| Làm giao diện | [thiết kế UI](12-ui-design.md) → [màn hình](04-screen-design.md) → báo cáo rà soát giao diện mới nhất |
| Soạn nội dung, audio | [biên soạn nội dung](content-authoring.md) → [audio](06-audio.md) → [hình minh họa](illustrations.md) → [quyền sử dụng](10-risks-costs-and-licenses.md) |
| Vận hành production | [vận hành](operations.md) → [kế hoạch POC và production thử](poc-setup.md) → [chuẩn bị staging](staging-setup.md) |

Tên file và thư mục dùng tiếng Anh; ngôn ngữ nội dung tài liệu vẫn là tiếng Việt.

## Tài liệu chung

| File | Nội dung | Đọc khi nào |
|---|---|---|
| `00-overview.md` | Mục tiêu, người dùng, phạm vi | Đọc đầu tiên |
| `01-requirements.md` | Yêu cầu chức năng và phi chức năng | Trước khi chốt phạm vi |
| `02-architecture.md` | Stack, kiến trúc runtime, lớp mã nguồn, luồng dữ liệu | Trước khi sửa mã nguồn |
| `03-data-design.md` | Schema JSON nội dung và database | **Chốt trước khi code** |
| `04-screen-design.md` | Danh sách màn hình, luồng chính | Trong giai đoạn basic design |
| [`05-slide-engine.md`](05-slide-engine.md) | Cơ chế render và trình chiếu slide | Khi làm phần bài giảng |
| `06-audio.md` | Pipeline sinh, lưu và phát audio | Khi làm phần phát âm, luyện nghe |
| [`07-exercises-and-grading.md`](07-exercises-and-grading.md) | Các dạng bài tập, logic chấm, báo cáo | **Chốt trước khi code** |
| [`08-notifications.md`](08-notifications.md) | Email nhắc bài và web push | Giai đoạn 4 trở đi |
| [`09-roadmap.md`](09-roadmap.md) | Chia giai đoạn, thứ tự làm | Lập kế hoạch |
| `10-risks-costs-and-licenses.md` | Giấy phép dữ liệu, chi phí, rủi ro | **Đọc trước khi dùng dữ liệu mở** |
| [`11-design-workflow.md`](11-design-workflow.md) | Làm basic design / detail design đến đâu | Đọc cùng README |
| `12-ui-design.md` | Hệ màu, typography, ngày giờ và số, nguyên tắc giao diện | Trước khi viết component |
| `coding-standards.md` | Quy ước đặt tên, cấu trúc, TypeScript, React, kiểm tra và git | Trước khi sửa mã nguồn |
| `operations.md` | Môi trường, biến môi trường, cron, migration, phát hành, lỗi hay gặp | Trước khi deploy hoặc áp migration |
| `poc-setup.md` | Công cụ, chi phí, các bước dựng POC 10 giáo viên, trạng thái production thử, Google sign-in, SEO | Trước khi đăng ký hoặc đổi dịch vụ cloud |
| `staging-setup.md` | Checklist dựng staging và nghiệm thu dịch vụ | Khi dựng môi trường mới |
| `content-authoring.md` | Soạn bài Nhật/Trung, bài mẫu Minna, bài nghe, nâng cấp bài cho lớp | Khi soạn hoặc nạp nội dung |
| `illustrations.md` | Icon từ vựng, hội thoại bong bóng, hướng dẫn tạo ảnh AI | Khi làm hình cho bài Nhật |
| `source-alignment.md` | Mức đáp ứng 22 yêu cầu dịch vụ theo lát (23% lúc audit, khoảng 70% sau các lát đã triển khai; không phải test coverage) | Khi lập kế hoạch tiếp |
| `documentation-review.md` | Rà soát toàn bộ docs ngày 29/10/2026: phạm vi, truy vết và quyết định còn mở lúc đó; các đợt sau ở mục Báo cáo kiểm thử và rà soát | Khi cần lịch sử quyết định |
| [`legal/privacy-policy-draft.md`](legal/privacy-policy-draft.md), [`legal/terms-of-use-draft.md`](legal/terms-of-use-draft.md) | Chính sách quyền riêng tư và điều khoản sử dụng: bản nháp 03/11/2026, chưa công bố, cần điền người vận hành và rà soát pháp lý | Trước khi nhận học viên thật |

## Thiết kế theo tính năng

| Tính năng | Basic Design | Detail Design | Kiểm chứng |
|---|---|---|---|
| Giai đoạn 1 — kana, nền dự án | [BD](basic-design/phase-1.md) | [DD](detail-design/phase-1.md) | [checklist](testing/phase-1.md) |
| Giai đoạn 2 — bài giảng, trình chiếu | [BD](basic-design/phase-2.md) | [DD](detail-design/phase-2.md) | [checklist](testing/phase-2.md) |
| Giai đoạn 3 — lớp học, bài giao, làm bài, ôn tập FSRS, theo dõi | [BD](basic-design/phase-3.md) | [DD](detail-design/phase-3.md) | [checklist](testing/phase-3.md) |
| Giai đoạn 4 — editor bài học, nhập CSV, email nhắc bài | [BD](basic-design/phase-4.md) | [DD](detail-design/phase-4.md) | [checklist](testing/phase-4.md) |
| Giai đoạn 5 (phần A) — luyện nghe | [BD](basic-design/phase-5.md) | [DD](detail-design/phase-5.md) | [checklist](testing/phase-5.md) |
| Dịch vụ hỗ trợ giảng dạy (29/10/2026) | [BD](basic-design/teaching-service.md) | [DD](detail-design/teaching-service.md) | [nghiệm thu và kết quả local](testing/teaching-service.md) |
| Vừa dạy vừa học: lớp tự học, chặn chủ lớp tự vào lớp dạy (CR-20), nguồn bài luyện hằng ngày, nhật ký buổi dạy, cập nhật bài từ mẫu (02/11/2026) | [BD Luồng 7](basic-design/teaching-service.md#luồng-7--vừa-dạy-vừa-học-lớp-tự-học-nhật-ký-buổi-dạy-và-cập-nhật-bài-mẫu-02112026) | [DD](detail-design/teaching-service.md#vừa-dạy-vừa-học--đã-triển-khai-02112026) | [kiểm chứng](testing/teach-and-learn.md) |
| Lịch sử bài tập hằng ngày: điểm từng ngày như trang Sheet cũ, cho học viên và giáo viên (04/11/2026) | [BD](basic-design/teaching-service.md#lịch-sử-bài-tập-hằng-ngày--04112026) | [DD](detail-design/teaching-service.md#lịch-sử-bài-tập-hằng-ngày--04112026) | [kiểm chứng](testing/flow-fixes-2026-11-03.md#lịch-sử-bài-tập-hằng-ngày-04112026) |
| Luyện kanji theo bài | [BD](basic-design/kanji-practice.md) | — | — |
| Tự nộp lượt bỏ dở khi hết hạn (05/11/2026) | [BD](basic-design/phase-3.md#tự-nộp-lượt-còn-mở-khi-hết-hạn--05112026) | [DD](detail-design/phase-3.md#tự-nộp-lượt-còn-mở-khi-hết-hạn--05112026) | [rà soát](testing/system-review-2026-11-05.md) |
| Furigana trong bài tập (05/11/2026) | [BD](basic-design/phase-3.md#furigana-trong-bài-tập--05112026) | [DD](detail-design/phase-3.md#furigana-trong-bài-tập--05112026) | [rà soát](testing/system-review-2026-11-05.md) |
| Sửa lỗi hiển thị bài đã giao (05/11/2026) | [BD](basic-design/phase-3.md#sửa-lỗi-hiển-thị-bài-đã-giao--05112026) | [DD](detail-design/phase-3.md#sửa-lỗi-hiển-thị-bài-đã-giao--05112026) | [rà soát](testing/system-review-2026-11-05.md) |
| Tin nhắn giao bài cho nhóm lớp (06/11/2026) | [BD](basic-design/phase-3.md#tin-nhắn-giao-bài-cho-nhóm-lớp--06112026) | [DD](detail-design/phase-3.md#tin-nhắn-giao-bài-cho-nhóm-lớp--06112026) | [rà soát](testing/project-audit-2026-11-06.md) |
| Điểm danh trong nhật ký buổi dạy (06/11/2026) | [BD](basic-design/teaching-service.md#điểm-danh-trong-nhật-ký-buổi-dạy--06112026) | [DD](detail-design/teaching-service.md#điểm-danh-trong-nhật-ký-buổi-dạy--06112026) | [rà soát](testing/project-audit-2026-11-06.md) |
| Số câu nghe mỗi ngày, bài 70 câu, mở lại slide (07/11/2026) | [BD](basic-design/teaching-service.md#số-câu-nghe-mỗi-ngày-bài-70-câu-và-mở-lại-slide--07112026) | [DD](detail-design/teaching-service.md#số-câu-nghe-mỗi-ngày-bài-70-câu-và-mở-lại-slide--0711-và-09112026) | [rà soát](testing/review-2026-11-09.md) |
| Thi thử JLPT N5/N4 (09/11/2026) | [BD](basic-design/phase-3.md#thi-thử-jlpt--09112026) | [DD](detail-design/phase-3.md#thi-thử-jlpt--09112026) | [kiểm chứng](testing/jlpt-mock-exam-2026-11-09.md) |
| Giao diện sáng và tối (10/11/2026) | — | [DD](detail-design/teaching-service.md#giao-diện-sáng-và-tối--10112026) | [rà soát](testing/code-review-2026-11-10.md#gộp-giao-diện-sáng-và-tối) |
| Nguồn đề JLPT và câu tự biên soạn (09–10/11/2026) | [biên soạn](content-authoring.md#nguồn-đề-jlpt-và-câu-tự-biên-soạn) | — | `tests/jlpt-original-drafts.test.ts` |
| Lịch sử bài tập từ Sheets (đã gỡ khỏi giao diện ngày 04/11/2026, dữ liệu còn giữ) | [BD](basic-design/learning-history.md) | [DD](detail-design/learning-history.md) | [kiểm chứng cũ](testing/learning-history.md) |
| Quản lý bài học/bài tập Nhật–Trung | [quy trình biên soạn/nâng cấp bài](content-authoring.md#quản-lý-và-nâng-cấp-bài-cho-lớp-nhậttrung) | — | [phạm vi, kết quả và checklist](testing/teaching-management.md) |

Luồng soạn bài được chốt: giáo viên tự soạn theo mẫu, bắt đầu bài dễ, nhập bảng → dựng slide → tạo câu luyện → giao lớp ([biên soạn nội dung](content-authoring.md)).

## Báo cáo kiểm thử và rà soát

Mới nhất ở trên. Mỗi báo cáo ghi trạng thái lúc viết; phần "còn lại" của báo cáo cũ có thể đã được làm ở báo cáo sau.

### 10/11/2026

- Rà soát quy ước mã nguồn và tài liệu: [script JLPT viết lại bằng TypeScript, tách file lớn, quy ước code đầy đủ, tài liệu và trang Hướng dẫn cập nhật theo tính năng mới](testing/code-review-2026-11-10.md).

### 09/11/2026

- Thi thử JLPT: [kiểm chứng logic, database, E2E và trình duyệt, lỗi bắt được, việc khi đưa lên production](testing/jlpt-mock-exam-2026-11-09.md).
- Rà soát sau đợt merge 07/11: [tên migration khớp production, số câu nghe mỗi ngày, lưu vị trí slide, CI và định dạng](testing/review-2026-11-09.md).

### 06/11/2026

- Rà soát giao diện, luồng và database: [quyền và quan hệ dữ liệu, 72 kịch bản E2E, crawl 326 trang, phát hiện còn lại, tin nhắn giao bài và điểm danh](testing/project-audit-2026-11-06.md).

### 05/11/2026

- Rà soát tài liệu, mã nguồn và trải nghiệm: [ngày giờ một định dạng, thuật ngữ giao bài, sổ tay vận hành, kiến trúc viết lại, phần còn lại](testing/system-review-2026-11-05.md).

### 04/11/2026

- Rà soát giao diện: [đã sửa (3 đợt), cách kiểm tra và các đề xuất còn lại theo thứ tự](testing/ux-review-2026-11-04.md).
- Kiểm tra các dạng bài tập: [từng dạng trên điện thoại, kết quả, Sổ lỗi, Ôn tập và những gì đã sửa](testing/question-types-review-2026-11-04.md).
- Bộ đề nghe Minna 1–15: [90 câu, cách nạp, sinh audio và kiểm tra](testing/listening-set-2026-11-04.md); hướng dẫn ở [soạn bài › Làm bài nghe](content-authoring.md#làm-bài-nghe).
- Kiểm tra cập nhật thư viện: [đã nâng bản vá, bản lớn còn giữ và lý do](testing/dependency-check-2026-11-04.md).

### 03/11/2026

- Lỗi luồng học và dạy: [chức năng đang lỗi trên production, phần đã sửa và phần cần quyết định](testing/flow-fixes-2026-11-03.md).
- Kiểm tra bố cục bằng code: [công cụ `npm run audit:layout`, lỗi tìm thấy và cách sửa](testing/layout-audit-2026-11-03.md).
- Đăng nhập bằng Google: [kiểm tra local và phần chưa thử](testing/google-sign-in-2026-11-03.md); [các bước bật trên Google Cloud, Supabase và Vercel](poc-setup.md#bật-đăng-nhập-bằng-google-03112026).
- Trang chung không gắn môn: [trang chủ, header, metadata và ảnh chia sẻ giới thiệu nơi dạy online chung, trang Tự học theo môn và phần còn gắn với ngôn ngữ](testing/platform-neutral-ui-2026-11-03.md).
- Công cụ giáo viên: [chấp nhận đáp án tương đương, từ chối yêu cầu giáo viên, audio tiếng Trung, danh sách ID dài](testing/teacher-tools-2026-11-03.md); [kịch bản học thử trên điện thoại](testing/device-trial-plan-2026-11-03.md).
- Soạn câu sắp xếp và đọc hiểu: [hai dạng bài mới trên cả hai trình soạn và câu kiểm tra riêng, lỗi mất đoạn văn khi sửa câu ngân hàng ôn và kiểm chứng](testing/question-authoring-2026-11-03.md).
- Sửa độ đúng dữ liệu học tập: [ID mục không bị cấp lại, hàng ôn, flashcard theo bản lớp ghim, thử lại khi mất phản hồi, chuỗi ngày học](testing/data-correctness-2026-11-03.md).
- Bài tập học viên cho cả tiếng Nhật và tiếng Trung: [chỗ gắn cứng tiếng Nhật đã sửa, luyện chữ Hán, kiểm tra ngôn ngữ ngân hàng ôn và phần còn lại](testing/exercise-languages-2026-11-03.md).

### 02/11/2026

- Rà soát độ dễ dùng và dạy online Nhật–Trung: [vấn đề đã sửa, số đo trước/sau, quy trình dạy một buổi và đề xuất tiếp theo](testing/user-flow-review-2026-11-02.md).
- Rà soát hiện trạng: [lỗi còn xác nhận được, giới hạn kiểm chứng và thứ tự ưu tiên](testing/project-health-2026-11-02.md). Lúc đó bộ kiểm tra đạt 161/161; báo cáo phân biệt lỗi source, việc vận hành cần nghiệm thu và cải tiến sản phẩm.
- [Rà soát lỗi lần 2](testing/code-review-2026-11-02.md): liên kết lịch sử hai bước, giữ chỉnh sửa trình soạn sau lần lưu mất phản hồi, sự cố triển khai trước migration và việc chờ áp lại.
- [Sửa điểm N5 ngày 01/11](testing/grading-correction-2026-11-02.md); [bổ sung ngân hàng ôn N4](testing/n4-review-bank.md).

### 30/10/2026

- [Bug UI, cải tiến đã giao, vấn đề còn mở và kết quả kiểm chứng](testing/user-flow-review.md). Các mục đề xuất và chưa kiểm thử được ghi trạng thái riêng.
- [Rà soát mã nguồn](testing/code-review-2026-10-30.md): lỗi đã sửa, lỗi còn mở và việc vận hành production khi chưa có email riêng.
- [Đổi domain pilot](testing/domain-change.md).

## Nguyên tắc xuyên suốt

Một nguồn nội dung draft dùng cho nhiều preview. Xuất bản tạo version bất biến; lớp ghim version, bài giao giữ snapshot. Sửa draft không tự đổi bài đang dạy hoặc điểm cũ. V1 Nhật và v2 Việt–Trung cùng chạy.

## Trạng thái tài liệu

Định hướng dịch vụ được cập nhật ngày 29/10/2026. Giai đoạn 1–4, phần A giai đoạn 5 và các lát dịch vụ đã ghi ở [đối chiếu source](source-alignment.md) đã có mã nguồn và chạy trên production thử từ 29/10/2026 cho lớp pilot; kết quả/giới hạn kiểm chứng xem checklist từng giai đoạn, chưa nghiệm thu đầy đủ với lớp học thật. Hướng dẫn khởi động tại README.md ở thư mục gốc.

Các quyết định trong tài liệu là đặc tả dự kiến, không phải tính năng đã hoàn thành. Phần nào đã triển khai thì cập nhật lại file tương ứng thay vì viết tài liệu mới. Mốc triển khai và tiêu chí nghiệm thu lấy theo `09-roadmap.md`; font, màu và kích thước lấy theo `12-ui-design.md`.

Đợt bổ sung này tập trung vào phiên bản nội dung, quyền truy cập, nộp bài, dữ liệu ôn tập và vận hành. Giá, quota, giấy phép và điều khoản dịch vụ trong tài liệu cũ chưa được kiểm chứng lại; phải xác minh từ nguồn chính thức trước khi chọn gói hoặc nhập dữ liệu bên ngoài.

## Phạm vi rà soát và phần còn mở

[Rà soát toàn bộ tài liệu](documentation-review.md) ghi phạm vi từng file, nguồn quyết định, phần đã đồng bộ và các lựa chọn provider/font/voice/gói còn phải xác minh trước tích hợp thật. Đợt này chỉ sửa Markdown, không viết code hoặc chạy dịch vụ mới. Không dùng chữ “đã có tài liệu” thay cho “đã triển khai/đã nghiệm thu”.

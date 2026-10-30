# Quản lý bài học và bài tập Nhật–Trung — 30/10/2026

## Kết luận

Nền hiện có hỗ trợ schema v1 tiếng Nhật, v2 tiếng Trung, lớp có ngôn ngữ riêng, bản nháp/phiên bản, bài luyện/kiểm tra, báo cáo và quản trị quyền giáo viên. Đợt này hoàn thiện khả năng nhận biết và chọn đúng nội dung ở các màn quản lý; không nâng phiên bản framework, tự áp migration cloud hoặc bổ sung nguyên bộ giáo trình. Chất lượng bài cần giáo viên chuyên môn duyệt.

## Điểm đã kiểm tra và nâng cấp

| Phạm vi | Trước | Cập nhật / đánh giá |
|---|---|---|
| Quản lý bài | Danh sách chung, khó tìm bài theo ngôn ngữ/trạng thái | Tìm tên, lọc Nhật/Trung giản/Trung phồn và chỉ nháp/đã xuất bản; số kết quả và xóa lọc; nhãn ngôn ngữ bản soạn |
| Tạo/nâng cấp bài | Form Nhật và Trung trên cùng trang, thiếu lối chọn nhanh | Có link chọn ngôn ngữ ở đầu trang; hướng dẫn quy trình sửa nháp/xuất bản/chọn lại phiên bản lớp |
| Nhập học liệu | CSV Nhật nằm dưới nhãn nhập chung | Nêu rõ CSV Nhật, chỉ tải bài Nhật vào công cụ; hướng dẫn Trung dùng bảng trong wizard |
| Đưa bài vào lớp | Không có nhãn ngôn ngữ ở lựa chọn bài/phiên bản | Nhãn lớp, bản soạn và từng phiên bản; nhắc không tự dịch/đổi giản-phồn; không tự khóa bài đối chiếu khác ngôn ngữ |
| Tạo bài kiểm tra | Fill mặc định Hiragana cả ở lớp Trung, prompt gắn Nhật và hint kanji/kana | Default theo lớp; prompt Trung giữ ngôn ngữ hướng dẫn Việt, đáp án Trung/pinyin có lang riêng; hint theo kiểu nhập; chuyển sang Trung bỏ kanjiStrict |
| Xuất bản/giao bài | Hai bước độc lập, snapshot bài đã giao có sẵn | Giữ cơ chế này và ghi rõ trong guide; đổi bài đang chọn đóng phần xem lại để giáo viên xác nhận lại |
| Quản lý hệ thống | Admin duyệt giáo viên, quyền chủ lớp và chia sẻ riêng đã có | Đối chiếu source và test hiện có; không phát hiện nhu cầu cấp thêm quyền cho giáo viên, không thay phân quyền |
| Dữ liệu/hạ tầng | Hai schema cùng hoạt động | Chỉ lấy metadata JSON projection cho summary; chưa cần migration hay dependency mới |

## Kết quả kiểm tra

- `npm run check`: PASS sau khi đồng bộ source và guide, 102 test, gồm 6 test mới về bộ lọc, schema/ngôn ngữ chưa biết, render form ba ngôn ngữ và chấm chữ Hán/pinyin.
- `npm run test:e2e`: PASS — 30 test Chromium hồi quy suite mặc định, không có phiên Supabase. Các test này không nghiệm thu các form quản lý sau đăng nhập.
- `npm run build`: PASS — biên dịch Next.js, TypeScript và tạo 41 trang tĩnh; các trang quản lý tiếp tục tải theo phiên đăng nhập.
- Test mới trong `e2e-supabase/teaching-authoring.spec.ts`: **NOT RUN**. Không có Supabase local đang chạy; không dùng cloud để chạy test tạo tài khoản/bài/lớp. Ca này kiểm tra GET filter/reset, ngôn ngữ phiên bản, mặc định chữ Hán, nhập pinyin, đổi mode bỏ kanjiStrict và bố cục 360px.
- Summary JSON projection mới, bộ lọc trên dashboard và thao tác form có đăng nhập cần được kiểm chứng với PostgREST/Supabase local; unit/render tests không thay cho browser tích hợp.

## Checklist nghiệm thu tiếp

| Mã | Ca cần chạy | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| TM-01 | Giáo viên có bài Nhật, Trung giản, Trung phồn, nháp và xuất bản | Lọc kết hợp không trộn ngôn ngữ; reset khôi phục form và URL; không thấy bài người khác | Logic PASS; browser NOT RUN |
| TM-02 | Nháp đổi giản/phồn sau khi đã có version | Nhãn bản soạn và version có thể khác nhau, chọn đúng version để lưu; không đổi assignment cũ | NOT RUN |
| TM-03 | Lớp Nhật tạo câu fill | Hiragana mặc định; kana/kanji và IME Nhật hoạt động như cũ | Render/default PASS; browser có phiên NOT RUN |
| TM-04 | Hai lớp Trung giản/phồn tạo fill chữ Hán và pinyin | Default chữ Hán, pinyin giữ dấu thanh; sai script/dấu thanh không được coi đúng | Render/grading PASS; browser có phiên NOT RUN |
| TM-05 | Giáo viên nhập bảng Trung và CSV Nhật | Đúng công cụ/đúng schema; bản nháp thiếu nội dung vẫn lưu, chỉ xuất bản khi đủ điều kiện | Logic cũ còn chạy; browser mới NOT RUN |
| TM-06 | Sửa bài đã dạy rồi xuất bản/giao lại | Lớp/bài giao/điểm cũ giữ nguyên snapshot, phiên bản mới chỉ áp khi chọn và giao mới | Migration tests hiện có; browser mới NOT RUN |
| TM-07 | Admin đình chỉ giáo viên hoặc giáo viên truy cập bài người khác | Server vẫn chặn đúng quyền; UI không cấp quyền qua filter/ngôn ngữ | Migration tests hiện có; browser mới NOT RUN |

## Phần còn mở và hướng nâng cấp tiếp

1. Flashcard: link từ reader/lớp chưa mang `version` và `getVocabularyDeck` đang đọc phiên bản mặc định; SRS hiện gắn lesson/item, chưa ghim snapshot riêng. Đây là quan sát từ source, chưa tái hiện với hai phiên bản khác nhau trong đợt này. Cần thiết kế thống nhất đọc thẻ và lưu lịch ôn trước khi cam kết flashcard luôn theo đúng phiên bản trang đang đọc.
2. Lớp và bài giao: chưa thêm ràng buộc bắt buộc cùng ngôn ngữ. Hiện dùng nhãn để giáo viên chọn chủ động. Nếu muốn chặn sai ngôn ngữ phải chốt cả ngoại lệ dạy đối chiếu và dữ liệu lớp cũ, không chỉ lọc UI.
3. Khi thư viện lớn: đo số bài/phiên bản và thời gian tải, rồi phân trang/search phía database; bộ lọc hiện ở server trên danh sách đã tải.
4. Nội dung: bổ sung dần bài mẫu Nhật/Trung do giáo viên duyệt, có mục tiêu và đáp án rõ; chưa công bố toàn bộ bộ bài đã đạt chuẩn giảng dạy chỉ vì test qua.
5. Audio web, OCR/scan, luyện nói/chấm tay: chưa được bổ sung ở lát này; chỉ mở rộng sau khi lượt soạn–giao–học–chấm của hai ngôn ngữ được nghiệm thu.

Tham chiếu: [BD](../basic-design/teaching-service.md), [DD](../detail-design/teaching-service.md), [quy trình nội dung](../content-authoring.md), [báo cáo UI](user-flow-review.md).

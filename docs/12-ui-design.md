# Thiết kế UI

## Phạm vi

Thiết kế dịch vụ ngày 29/10/2026: giao diện quản lý và hướng dẫn tiếng Việt, nội dung học ưu tiên Trung, giữ module Nhật hiện tại. Màu/token có sẵn được tái sử dụng; font Trung, wizard và trạng thái mới dưới đây chưa triển khai. Không dùng hình ảnh hoặc nhãn tiếng Nhật làm mặc định cho mọi lớp.

## Luồng chính của giáo viên

Trang giáo viên ưu tiên việc cần làm: tiếp tục bài nháp, soạn bài mới, lớp sắp dạy và bài cần theo dõi. Luồng **Chọn mẫu → Nhập nội dung → Dựng slide → Thêm bài tập → Xem trước/giao lớp** dùng nhãn tiếng Việt; phần kỹ thuật nằm ngoài thao tác thường ngày.

Mỗi bước có quay lại/tiếp tục/lưu nháp, báo dữ liệu đã lưu hay còn chưa đồng bộ. Không khóa lưu nháp vì bài chưa đủ trường xuất bản. Nút hành động chính diễn tả kết quả: “Dựng slide”, “Lưu nháp”, “Xuất bản”, “Giao cho lớp”. Không gộp các thao tác này thành nút hoàn tất không rõ nghĩa.

Desktop xem nội dung cạnh preview; mobile 360px đổi vùng nội dung/preview mà giữ dữ liệu, không thu nhỏ cả editor thành một màn hình không đọc được. Có thao tác bàn phím/nút đổi thứ tự thay kéo thả. Xung đột hai tab không tự ghi đè, cho xem dữ liệu hiện có và chọn cách tiếp tục.

## Bảng nhập Việt–Trung

Cột chính: chữ Hán, pinyin, nghĩa Việt, ví dụ tùy chọn. Thêm dòng/dán bảng Excel; trước import hiển thị lỗi từng ô/dòng và mục trùng. Không dùng jp/romaji làm nhãn UI Trung. Ví dụ, thông tin nâng cao và ghi chú giáo viên có thể mở thêm; không bắt người mới học toàn bộ schema.

Chữ Hán/pinyin/nghĩa là các trường riêng, không đoán pinyin đã đúng vì máy tự sinh. Mẫu bài nhập môn có một mục tiêu nhỏ và hướng dẫn ngắn; có thể bỏ phần ôn cũ ở bài đầu. Nội dung mẫu ghi trạng thái đã/chưa chuyên môn duyệt.

## Font và ngôn ngữ

| Nội dung | Quyết định thiết kế |
|---|---|
| UI/nghĩa/hướng dẫn Việt | Be Vietnam Pro, đủ dấu Việt, line-height văn bản tối thiểu 1.6, không letter-spacing âm |
| Chữ Trung | Font CJK đúng locale giản/phồn, self-host sau khi xác minh font/giấy phép và test nét chữ; chưa chốt font cụ thể |
| Pinyin | Font Latin có đủ dấu thanh, không cắt dấu ở line-height nhỏ; hiển thị riêng dưới/cạnh chữ Hán |
| Nhật hiện có | Noto Sans JP cho văn bản, Klee One ở mẫu kana; không tự dùng font Nhật làm chuẩn chữ Trung |

Gắn lang đúng cho từng vùng, hỗ trợ IME và composition. Font lớp nào chỉ tải khi cần; không tải toàn bộ font mọi ngôn ngữ ở mọi route. Chữ luyện viết cần giáo viên duyệt mẫu riêng; MVP không có chấm nét viết.

## Cỡ chữ và bố cục

| Vai trò | Mục tiêu thiết kế |
|---|---|
| Chữ Hán chính trên slide | 72 px trên khung 1280×720; nội dung dài chia slide, không tự cắt ý |
| Pinyin/nghĩa trên slide | 28–32 px, dễ đọc khi share tab/máy chiếu |
| Chữ Hán ở reader | 22 px trở lên; pinyin/nghĩa có thứ bậc rõ |
| UI thường | 16–17 px, nhãn phụ ít nhất 14 px; focus không che chữ/dấu |
| Tiêu đề trang/mục | 32/24 px theo token nền, điều chỉnh responsive |

Thông số là mục tiêu cần kiểm chứng với nội dung dài, không phải kết quả đo. Bảng kana Nhật giữ quy tắc riêng. Không áp quy tắc “mọi chữ Nhật luôn lớn hơn 20%” cho tất cả môn; ưu tiên khả năng đọc và đúng nội dung.

## Thương hiệu Reng và logo

Tên **Reng** là tiếng chuông vào lớp. Logo là chiếc chuông tay trường học đang reng (thân nghiêng, lưỡi chuông văng sang bên) trên tấm bảng bo góc: bảng màu chàm `#2B4C7E` (token `--primary`), chuông đồng thau `#E3A83E` (token `--brand-bell`), cán chuông màu giấy `#FAF8F3` (token `--background`). Chữ "Reng" dùng Be Vietnam Pro đậm, giãn chữ −0.015em, đặt bên phải logo.

| Tệp | Dùng cho |
|---|---|
| `components/brand-mark.tsx` | Logo trong giao diện, màu lấy từ token CSS |
| `app/icon.svg` | Favicon (hex cố định vì tệp đứng riêng) |
| `app/apple-icon.png` | Icon 180×180 khi lưu ra màn hình iPhone, nền đầy không bo góc |
| `app/opengraph-image.png`, `app/twitter-image.png` | Ảnh chia sẻ 1200×630 có logo, tên và câu giới thiệu |

Quy tắc dùng: kích thước nhỏ nhất 16px; chừa khoảng trống quanh logo ít nhất 1/4 chiều rộng; không thêm gradient, đổ bóng, phát sáng hay biến dạng; không đổi màu ngoài ba token trên. Logo không dùng chữ Nhật "ます" của tên cũ.

## Màu và khoảng cách

Giữ màu nền `#FAF8F3`, chữ `#1C1B1A`, nền bề mặt `#FFFFFF`, hành động chàm `#2B4C7E`, nền phụ `#DCE6F2`, viền/chữ phụ theo token trong globals.css. Semantic: đúng `#2E7D53`, sai `#C0392B`, cần chú ý `#B87333`. Tương phản từng cặp màu cần đo, không mặc định một hex luôn đạt.

Không dùng màu làm tín hiệu duy nhất: đúng/sai/cần duyệt có chữ/icon phù hợp. Trang thái draft/saved/published/assigned khác nhau, chờ chấm không có màu/nhãn như điểm 0. Màu trợ từ Nhật chỉ thuộc module Nhật; không tô thanh điệu Trung bằng màu nếu chưa có quy tắc chuyên môn.

Khoảng cách theo bội 4 px; nút/input bo khoảng 6 px, thẻ 10 px, nhãn trạng thái 4 px; dùng token thay hex/radius rải trong component. Bóng dành cho menu/hộp thoại/thanh nổi, nội dung trong luồng dùng viền. Không đổi theme chỉ để khác với mẫu công cụ sinh UI.

## Hình minh họa trong bài Nhật

Từ 30/10/2026 (phương án B, [chi tiết](illustrations.md)): icon Fluent Emoji (MIT) cạnh từ vựng cụ thể trên slide, trang đọc và mặt sau flashcard; hội thoại dạng bong bóng, người nói đầu bên trái màu `--primary-soft`, người thứ hai bên phải pha `--brand-bell`, avatar cùng màu bên; tiêu đề slide có vạch nhấn `--brand-bell` bên trái và thanh tiến độ cùng màu. Ảnh AI cho nhân vật và tranh mở đầu dùng chung một phong cách, không chứa chữ. Các yếu tố này nằm trong bài tiếng Nhật, không thành mặc định của giao diện chung. CSS ở `app/lesson-visuals.css`; slide vẫn phải vừa khung 1280×720 và trang đọc không cuộn ngang ở 360px.

## Thống kê và biểu đồ

Ô thống kê dùng lại `.stat-tiles` (4 cột, 2 cột từ 820px trở xuống): số lớn, nhãn, dòng chi tiết `.stat-tile-detail`. Biểu đồ vẽ bằng HTML/SVG ở server, không thêm thư viện. Biểu đồ cột phần trăm dùng chung `components/charts/score-column-chart.tsx` (lịch sử học tập, tiến độ); CSS dùng chung ở `app/charts.css`. Một chuỗi số dùng một màu chàm; ngày đang xem đậm hơn, các ngày khác dùng bậc nhạt hơn vẫn đạt 3:1. Lưới là đường mảnh; mốc mục tiêu là nét đứt. Giá trị trống vẽ vòng rỗng, không vẽ như 0.

Màu dải điểm (`--score-good`, `--score-fair`, `--score-low`, `--score-none` trong `app/charts.css`) luôn đi kèm con số. Cặp xanh/đỏ chỉ cách ΔE 7,1 khi mô phỏng mù màu, nên không dùng màu làm tín hiệu duy nhất. Mỗi biểu đồ có câu tóm tắt bằng chữ, và giá trị từng ngày cũng đọc được trong danh sách ngày. Kiểm tra 360px và 1280px không tràn ngang trước khi phát hành.

## Hình ảnh và scan

Review ảnh và câu tương tác có đánh dấu vùng nguồn, số trang và phần chưa nhận được. Ảnh không đọc được có hướng sửa/tải lại; không dùng độ tin cậy để báo câu đã đúng. Crop/che lời giải phải thể hiện ở preview học sinh, không chỉ ở preview giáo viên. Scan là lối nhập bổ sung, không lấn át nút tạo bài theo mẫu.

## Quyền và tình huống rỗng/lỗi

Không có bài: “Soạn bài đầu tiên” cùng lựa chọn mẫu. Chưa có lớp: tạo lớp/mời học sinh. Lớp đầy: báo hết chỗ, không lộ danh sách thành viên. Grant view: chỉ xem, không để nút copy hoạt động. Notes/presenter/đáp án test không xuất hiện trong giao diện học sinh hoặc ảnh/PDF chia sẻ.

Lỗi trường nhập đưa focus về nơi sửa; lỗi mạng giữ dữ liệu và phân biệt đã lưu/chưa lưu. Không báo thành công khi server thất bại hoặc chỉ preview. Modal xác nhận dùng cho thay mẫu/ghi đè phần generated có sửa tay/công khai học liệu; không hỏi xác nhận cho mọi thao tác nhỏ.

## Dữ liệu thiết kế và tiêu chí nghiệm thu

Dùng nội dung học thật được phép sử dụng, có ví dụ dài và dấu đầy đủ; tên/điểm/email là dữ liệu thử ẩn danh, không dùng học sinh thật làm fixture/screenshot công khai. Không dùng Lorem ipsum thay nội dung Việt–Trung khi kiểm tra bố cục.

- Kiểm tra 360px và 1280×720, câu dài/pinyin nhiều dấu/tên dài không cắt hoặc cuộn ngang trang.
- Dùng bàn phím hoàn thành soạn/giao, focus rõ, label và aria-label đúng; lỗi có thông báo đọc được.
- Tương phản mục tiêu WCAG AA; không chỉ phân biệt bằng màu; tôn trọng prefers-reduced-motion.
- Preview học sinh/PDF/share tab không lộ notes hoặc đáp án test; trạng thái lưu/giao phản ánh server.
- Giáo viên thử một bài nhập môn, ghi thời gian và chỗ cần trợ giúp theo AUTHOR-08; chưa đánh dấu đạt trước thử.

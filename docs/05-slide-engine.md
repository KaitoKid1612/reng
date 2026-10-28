# Slide engine

## Quyết định nền tảng

Dùng **reveal.js** cho chế độ trình chiếu. Lý do là bốn thứ mà tự code sẽ mất cả tuần:

| Tính năng | Vì sao cần |
|---|---|
| Fragment | Hiện dần từng phần. Chiếu câu hỏi, hỏi cả lớp, bấm mũi tên mới lộ đáp án. Đây là tính năng dạy học quan trọng nhất của slide. |
| Presenter view | Máy chiếu hiện slide, laptop hiện ghi chú riêng, slide kế tiếp và đồng hồ. Học viên không thấy phần ghi chú. |
| Xuất PDF | Thêm `?print-pdf` vào URL rồi in. Phát tài liệu cho học viên không phải làm lại. |
| Overview mode | Bấm `Esc` ra lưới toàn bộ slide, nhảy nhanh tới bài bất kỳ giữa giờ. |

reveal.js nhận DOM động nên vẫn render slide từ JSON bình thường, không phải viết HTML tay.

Hai phương án đã cân nhắc và loại: **Slidev** đẹp và viết bằng Markdown nhưng build thành site riêng, khó nhúng vào app chung. **Tự code** bằng `scroll-snap` thì kiểm soát hoàn toàn nhưng phải tự làm presenter view.

## Luồng render

```
lesson_versions.content.slides[]  mảng slide đã xuất bản
          |
          v
    SlideRenderer            map type -> component
          |
     +----+----+----+----+
     |    |    |    |    |
  Title Vocab Gram Quiz Note     mỗi loại một component
     |    |    |    |    |
     +----+----+----+----+
          |
          v
     reveal.js                điều khiển, fragment, presenter
```

Mỗi `type` của slide ứng với một component. Thêm loại slide mới chỉ cần viết component và đăng ký vào map, không đụng code cũ.

## Co giãn màn hình

**Đừng để chữ tự xuống dòng theo bề rộng màn hình.** Thiết kế slide trên khung cố định 1280×720 rồi `transform: scale()` cho vừa viewport. Như vậy slide trên laptop và trên máy chiếu phòng học giống hệt nhau — cái bạn nhìn thấy khi soạn chính là cái học viên thấy.

reveal.js làm sẵn việc này qua cấu hình `width`, `height`, `margin`.

## Font

Nhúng Noto Sans JP từ Google Fonts, luôn luôn.

Máy phòng học thường là Windows không cài đủ font Nhật. Chữ sẽ ra ô vuông, hoặc tệ hơn là bị thay bằng font Trung Quốc. Kanji Trung và Nhật có nét khác nhau — học viên tập viết theo là viết sai. Đây không phải chuyện thẩm mỹ.

Chỉ tải các độ dày thực sự dùng (400 và 700) vì font Nhật rất nặng.

## Điều khiển

| Phím | Hành động |
|---|---|
| `→` `Space` | Slide kế, hoặc fragment kế nếu còn |
| `←` | Slide trước |
| `F` | Toàn màn hình |
| `Esc` | Lưới toàn bộ slide |
| `S` | Mở presenter view |
| `B` | Màn hình đen (khi muốn cả lớp nhìn mình thay vì nhìn màn hình) |

Trên điện thoại: vuốt trái phải.

## Presenter view

Baseline triển khai giai đoạn 2 dùng presenter riêng với BroadcastChannel scope theo lesson/version. Chỉ vị trí/fragment/command được gửi qua channel. Ghi chú riêng lấy qua API cookie-auth/RLS và không nhúng vào DOM của reveal hoặc gửi tới cửa sổ máy chiếu. Quyết định này cụ thể hóa yêu cầu giữ kín notes; không bật plugin notes nhúng DOM.

Bấm `S` mở cửa sổ presenter. Dùng plugin presenter của reveal.js trước; kiểm chứng tích hợp với Next.js, đồng bộ cửa sổ và quyền truy cập trên staging. Chỉ tự bổ sung BroadcastChannel nếu cần, không mặc định plugin dùng cơ chế đó.

Cửa sổ laptop hiện:
- Slide hiện tại thu nhỏ
- Slide kế tiếp
- Ghi chú của giảng viên cho slide này
- Đồng hồ đếm thời gian buổi dạy

Ghi chú lấy từ API riêng có xác thực giảng viên sở hữu bài. Không nhúng ghi chú vào DOM, JSON hydration hay bản in dành cho học viên; cửa sổ máy chiếu chỉ nhận payload trình chiếu. Chặn popup phải hiện hướng dẫn mở lại, đóng cửa sổ phụ không làm mất vị trí slide.

## Link sâu

Lưu vị trí vào hash: `/lessons/lesson-05/slide#7`.

Lợi ích: học viên bookmark được, giảng viên gửi link thẳng tới đúng slide cần xem lại, và F5 giữa giờ không mất chỗ.

## Mã QR trên slide bài tập

Giai đoạn 6 thêm QR. `quiz.ref` là question_id luyện trong bài, không phải assignment_id. Khi dạy trong ngữ cảnh lớp, giảng viên chọn bài giao đã xuất bản; QR mới trỏ tới `/assignments/[assignmentId]`. Không có bài giao thì không hiện QR. Học viên vẫn phải đăng nhập và có quyền trong lớp; quét QR không bỏ qua phân quyền.

Dùng thư viện `qrcode`, sinh lúc render slide.

## Xuất PDF

reveal.js hỗ trợ `?print-pdf` rồi in bằng Chrome. Dùng để phát tài liệu cho học viên vắng mặt hoặc in ra giấy.

Cần một stylesheet riêng cho bản in: bỏ màu nền tối, hiện hết fragment (vì bản in không bấm được), thêm số trang.

## Nhập từ Google Slides, nếu cần

Chỉ dùng khi bạn đã có sẵn kho slide cũ. Không phải cách làm lâu dài.

Hai cách:

**Slides API.** Gọi `presentations.get` trả về cấu trúc bài trình chiếu dạng JSON, gồm từng slide, từng text box và cả speaker notes. Viết script đọc rồi đổ vào database.

Mẹo để parser không rối: soạn theo template cố định. Mỗi slide một ô tiêu đề, một ô nội dung, quy ước riêng cho từ vựng, ví dụ mỗi dòng `いきます | ikimasu | đi`. Script chỉ đọc text theo vị trí, không phải hiểu layout.

**Xuất .pptx rồi đọc bằng `python-pptx`.** Đơn giản hơn nhiều, nhưng phải tải file về thủ công mỗi lần.

Ảnh trong slide thì script tải về rồi upload sang Storage, không hotlink từ Drive.

## Chiến lược chuyển tiếp

Nếu bạn đang có kho Google Slides:

1. Giai đoạn đầu nhúng iframe để dạy ngay
2. Song song viết script import
3. Bài nào import xong thì chuyển sang native, có đủ audio và quiz
4. Hai chế độ chạy song song, không phải làm lại từ đầu

Luồng chuyển tiếp này chưa nằm trong bản đầu và chưa có trường database hỗ trợ. Không dùng content rỗng để suy đoán nguồn bài. Nếu cần import kho slide cũ, bổ sung source_type và nguồn đã kiểm tra quyền trước khi triển khai; bản đầu chỉ hỗ trợ JSON native theo `03`.

## Vị trí slide và bản in

Hash `#7` là số slide hiển thị 1-based; adapter đổi sang index của engine. Hash sai hoặc vượt phạm vi đưa về slide đầu và báo nhẹ. Hash chỉ ổn định trong cùng phiên bản; lớp dùng lesson_version_id đã ghim. URL giảng viên có thể dùng `?version=<id>#7`; API vẫn kiểm tra quyền.

Bản PDF cho học viên chỉ in nội dung xuất bản được phép xem; không chứa teacherNotes, dữ liệu test hoặc đáp án riêng. Kiểm tra font tải xong, câu dài có ruby, fragment hiện đủ và ngắt trang trên máy chiếu 1280×720 trước nghiệm thu.

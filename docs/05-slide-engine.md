# Slide engine

Cơ chế renderer/version hiện có là nền tái sử dụng. Profile Việt–Trung, dựng slide từ bảng/template và chia sẻ giữa giáo viên là thiết kế mới; xem [03](03-data-design.md) và [DD dịch vụ](detail-design/teaching-service.md). Không coi BroadcastChannel là đồng bộ phòng học online.

## Quyết định nền tảng

Nền hiện tại dùng **reveal.js** cho trình chiếu cùng presenter và bản in riêng của Reng. Các hành vi cần bảo toàn:

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

Mỗi type có component render; thêm type cần cập nhật schema/validator/editor/renderer/DTO và testcase liên quan, không chỉ đăng ký một component.

## Co giãn màn hình

**Đừng để chữ tự xuống dòng theo bề rộng màn hình.** Thiết kế slide trên khung cố định 1280×720 rồi `transform: scale()` cho vừa viewport. Như vậy slide trên laptop và trên máy chiếu phòng học giống hệt nhau — cái bạn nhìn thấy khi soạn chính là cái học viên thấy.

reveal.js làm sẵn việc này qua cấu hình `width`, `height`, `margin`.

### Bố cục dày cho nội dung dài (bài Nhật)

Slide từ vựng có trên 3 từ, ví dụ có trên 1 câu và bảng có trên 8 hàng chuyển sang bố cục dày để vừa khung 1280×720. Hội thoại tính theo số dòng sau khi xuống dòng: mỗi lượt chiếm `ceil(số ký tự / 20)` dòng (ít nhất 1); tổng trên 5 dòng thì dùng cỡ chữ gọn. Mỗi slide hội thoại tối đa 6 lượt; hội thoại dài hơn tách thành nhiều slide.

## Font và ngôn ngữ dịch vụ

MVP Việt–Trung cần chữ Hán, pinyin và nghĩa Việt ở các vùng riêng có lang/locale đúng; font CJK Trung phải chốt và kiểm chứng theo 12. Mẫu sinh slide là bộ dựng xác định từ nội dung và template, không cần AI; dài thì chia slide, không tự cắt ý. Dựng lại giữ sửa tay và không đổi version đã xuất bản. Chi tiết AUTHOR-03 ở DD dịch vụ; chưa triển khai renderer v2.

### Nền Nhật hiện có

Nền hiện tại self-host Noto Sans JP từ package @fontsource; không gọi Google Fonts lúc build. Đây là font module Nhật, không là mặc định cho lớp Trung.

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

Bấm `S` mở presenter riêng đã triển khai theo lesson/version; không bật plugin notes nhúng DOM. Kiểm chứng popup/quyền notes và đồng bộ trên staging/thiết bị thật vẫn là bước nghiệm thu.

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

## Nhập slide cũ — ngoài MVP

Bản đầu soạn native theo mẫu/bảng; chưa có parser Google Slides/PPTX hoặc iframe chuyển tiếp. Nếu cần tái sử dụng kho cũ, phải có thiết kế import nguồn/quyền/media và loại notes riêng trước khi bật. Không yêu cầu giáo viên công khai file nguồn để dạy; bản nhập vẫn cần duyệt thành draft chuẩn.

## Vị trí slide và bản in

Hash `#7` là số slide hiển thị 1-based; adapter đổi sang index của engine. Hash sai hoặc vượt phạm vi đưa về slide đầu và báo nhẹ. Hash chỉ ổn định trong cùng phiên bản; lớp dùng lesson_version_id đã ghim. URL giảng viên có thể dùng `?version=<id>#7`; API vẫn kiểm tra quyền.

Bản PDF cho học viên chỉ in nội dung xuất bản được phép xem; không chứa teacherNotes, dữ liệu test hoặc đáp án riêng. Kiểm tra font tải xong, câu dài có ruby, fragment hiện đủ và ngắt trang trên máy chiếu 1280×720 trước nghiệm thu.

## Dạy qua Meet và chia sẻ học liệu — thiết kế mới

Giáo viên mở slide Reng rồi chia sẻ tab qua Google Meet; presenter/notes giữ ở cửa sổ khác. Đây là quy trình dùng slide hiện tại với dịch vụ video bên ngoài, chưa có tích hợp cuộc gọi. BroadcastChannel hiện tại chỉ điều khiển cửa sổ cùng trình duyệt; không đồng bộ slide tới máy học sinh qua mạng.

Chia sẻ giữa giáo viên là quyền trên version và bản sao độc lập theo [BD dịch vụ](basic-design/teaching-service.md), không đồng nghĩa chia sẻ phòng học hay cấp quyền sửa bài gốc. Bài Trung cần locale/font phù hợp, không dùng mặc định font Nhật cho mọi chữ Hán. Trang scan dạng ảnh chỉ để hiển thị; muốn chấm tự động phải chuyển thành câu có cấu trúc/đáp án được duyệt.

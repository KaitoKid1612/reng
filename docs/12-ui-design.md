# Thiết kế UI

## Vấn đề cần tránh

Giao diện do AI sinh ra có một bộ đặc điểm nhận dạng rất rõ. Người trong nghề nhìn ba giây là biết. Liệt kê ra đây để tránh một cách có ý thức:

| Dấu hiệu | Vì sao nhận ra ngay |
|---|---|
| Nền kem ấm `#F4F1EA` cộng serif tương phản cao cộng accent đất nung `#D97757` | Bộ ba này xuất hiện bất kể chủ đề là gì |
| Nền gần đen cộng một màu xanh neon hoặc đỏ son | Mẫu thứ hai, cũng dùng cho mọi chủ đề |
| Mọi thứ chặt thành card bo tròn giống hệt nhau, cùng một `border-radius`, cùng một bóng xám `rgba(0,0,0,.1)` | Thứ bậc nội dung bị san phẳng |
| Nhãn chữ hoa giãn chữ phía trên mọi tiêu đề | Thêm chữ mà không thêm thông tin |
| Meta nối bằng dấu chấm giữa: `A · B · C` | Mẫu lặp |
| Mũi tên `→` gắn sau mọi nút và link | Trang trí, không mang nghĩa |
| Chữ gradient tím sang xanh | |
| Emoji thay icon | |
| `rounded-2xl` và `shadow-lg` trên tất cả | Không phân biệt cái gì quan trọng |
| Mọi section fade-and-slide-up khi cuộn | Chuyển động không phục vụ gì |
| shadcn/ui để nguyên mặc định, font Inter | Nhận ra ngay vì ai cũng dùng y hệt |
| Đánh số `01 / 02 / 03` cho nội dung không phải trình tự | |

Nguyên tắc chung: những thứ trên đều hợp lệ **trong một số trường hợp**. Vấn đề là chúng được chọn như mặc định chứ không phải như quyết định, và chúng xuất hiện bất kể chủ đề.

## Nền tảng thị giác lấy từ đâu

Đây là chỗ quyết định. Giao diện có bản sắc là giao diện lấy ngôn ngữ thị giác từ chính lĩnh vực của nó.

Lĩnh vực ở đây là **sách giáo khoa tiếng Nhật và lớp học**. Những thứ có sẵn để khai thác:

**原稿用紙 (genkō yōshi)** — giấy ô vuông viết tiếng Nhật, mỗi ô một chữ, có dấu thập mờ ở giữa để căn chữ. Đây là hình ảnh mọi người học tiếng Nhật đều quen. Dùng làm nền cho bảng chữ cái và ô luyện viết là vừa đẹp vừa đúng chức năng.

**Thứ tự nét** — số nhỏ đánh ở đầu mỗi nét. Đây là kiểu đánh số duy nhất nên dùng trong dự án này, vì nó thực sự là một trình tự.

**Furigana** — chữ nhỏ phía trên kanji. Là một tầng thông tin thật, không phải trang trí.

**Mã màu trợ từ** — sách tiếng Nhật hay tô màu trợ từ để học viên thấy cấu trúc câu. Màu ở đây mang thông tin.

Những thứ **nên tránh** vì là khuôn sáo du lịch: hoa anh đào, vòng tròn đỏ mặt trời, cổng torii, mái ngói cong, chữ thư pháp làm nền.

## Typography

Đây là đòn bẩy lớn nhất. Trang này có hai hệ chữ viết chạy song song, và xử lý đúng việc đó đã tạo ra bản sắc.

### Chữ Việt

Phần lớn font không có đủ dấu tiếng Việt, và đây là ràng buộc thật chứ không phải chuyện thẩm mỹ.

**Be Vietnam Pro** — thiết kế bởi người Việt, dấu đặt đúng chỗ, có đủ độ dày. Không phải lựa chọn mặc định mà ai cũng dùng.

Dấu tiếng Việt chồng cao (ế, ộ, ữ, ỡ). Hệ quả cụ thể:

- `line-height` tối thiểu 1.6 cho văn bản chạy, 1.3 cho tiêu đề. Chặt hơn là dấu đụng dòng trên.
- Không giãn chữ âm (`letter-spacing` âm) bao giờ.
- Không dùng chữ hoa toàn phần cho câu dài, vì dấu trên chữ hoa rất chật.

### Chữ Nhật trong giao diện

**Noto Sans JP** cho mọi chữ Nhật trong giao diện: nút, menu, nhãn.

Chỉ tải độ dày 400 và 700. Font Nhật rất nặng, mỗi độ dày khoảng 1,5 MB.

### Chữ Nhật mà học viên sẽ viết tay

Đây là chi tiết quan trọng mà hầu hết trang học tiếng Nhật làm sai.

Font gothic (sans-serif) có hình chữ **khác với hình chữ viết tay**. Ví dụ き trong font gothic thường nối liền ở dưới, còn trong chữ viết tay thì tách rời. さ cũng vậy. Học viên nhìn font gothic rồi tập viết theo là viết sai hình.

Nên dùng font kiểu 教科書体 (kyōkashotai, kiểu sách giáo khoa) cho:

- Bảng chữ cái Hiragana và Katakana
- Thẻ kanji
- Mẫu chữ trong bài luyện viết

**Klee One** trên Google Fonts là font kiểu này, hình chữ gần với nét bút thật.

Các chỗ khác vẫn dùng Noto Sans JP, vì kyōkashotai đọc văn bản dài hơi mệt.

### Bảng cỡ chữ

Thang chữ dùng tỉ lệ 1.25, làm tròn cho dễ nhớ.

| Vai trò | Cỡ | Font | Ghi chú |
|---|---|---|---|
| Chữ Nhật trên slide | 72px | Klee One hoặc Noto Sans JP | Phải đọc được từ cuối lớp |
| Nghĩa tiếng Việt trên slide | 32px | Be Vietnam Pro | Nhỏ hơn hẳn, để mắt nhìn chữ Nhật trước |
| Tiêu đề trang | 32px | Be Vietnam Pro 600 | |
| Tiêu đề mục | 24px | Be Vietnam Pro 600 | |
| Chữ Nhật trong nội dung | 22px | Noto Sans JP | Luôn lớn hơn chữ Việt cùng chỗ |
| Văn bản chạy | 17px | Be Vietnam Pro 400 | |
| Chú thích, nhãn | 14px | Be Vietnam Pro 400 | |
| Furigana | 0.5em của chữ gốc | | |

Quy tắc không đổi: **chữ Nhật luôn lớn hơn chữ Việt ở cùng một chỗ**, chênh ít nhất 20%. Lý do không phải thẩm mỹ: kanji nhiều nét, cỡ nhỏ là không phân biệt được 待 với 持.

Độ dài dòng tối đa 70 ký tự cho tiếng Việt.

## Màu

### Bảng màu cơ sở

Lấy từ hệ màu truyền thống Nhật, nhưng tránh đỏ son vì đó đang là màu accent mặc định của AI.

| Tên | Hex | Dùng cho |
|---|---|---|
| 墨 sumi (mực) | `#1C1B1A` | Chữ chính. Không dùng đen tuyệt đối, cũng không dùng `#0B0B0B` |
| 生成り kinari (vải mộc) | `#FAF8F3` | Nền trang. Ấm nhẹ, không phải `#F4F1EA` |
| 白 shiro | `#FFFFFF` | Nền thẻ nội dung |
| 藍 ai (chàm) | `#2B4C7E` | Màu chủ đạo, dùng cho hành động chính |
| 水 mizu (nước) | `#DCE6F2` | Nền nhạt của màu chủ đạo |
| 鼠 nezumi (xám chuột) | `#8A8782` | Chữ phụ, viền |

### Màu mang nghĩa, không trang trí

Chỉ bốn màu ngữ nghĩa, và mỗi màu chỉ một nghĩa duy nhất trong toàn bộ sản phẩm:

| Màu | Hex | Nghĩa duy nhất |
|---|---|---|
| Xanh lá | `#2E7D53` | Đúng |
| Đỏ | `#C0392B` | Sai |
| Hổ phách | `#B87333` | Cần chú ý, sắp hết hạn |
| Chàm | `#2B4C7E` | Hành động chính |

Không dùng màu để làm đẹp. Nếu một mảng màu không trả lời được câu hỏi "màu này nói gì", bỏ nó đi.

### Màu trợ từ

Đây là chỗ màu thực sự dạy được:

| Loại | Màu |
|---|---|
| Trợ từ (は、が、を、に、で、へ) | Chàm |
| Đuôi động từ (ます、ました、ません) | Hổ phách |
| Phần còn lại | Mực |

Dùng trên slide ngữ pháp và trong câu ví dụ. Có nút tắt, vì khi kiểm tra thì không nên gợi ý.

## Hình khối và không gian

**Bo góc theo thứ bậc, không dùng một giá trị cho tất cả.**

| Thành phần | Radius |
|---|---|
| Nút, ô nhập | 6px |
| Thẻ nội dung | 10px |
| Ô chữ cái trong bảng kana | 2px, gần vuông, theo tinh thần ô giấy viết |
| Nhãn trạng thái | 4px |

**Bóng đổ chỉ dùng cho thứ thực sự nổi lên trên mặt phẳng khác**: menu thả xuống, hộp thoại, thanh công cụ nổi. Thẻ nội dung nằm trong luồng thì dùng viền `1px` màu `#E8E4DC`, không dùng bóng.

**Khoảng cách** theo bội số 4px. Khoảng cách giữa các khối lớn dùng bội số 8px.

## Nơi tiêu một chút mạo hiểm

Một thiết kế tốt có **một chỗ đáng nhớ**, còn lại giữ yên tĩnh.

Chỗ đó nên là **bảng chữ cái**. Lý do: đó là màn hình học viên mở nhiều nhất trong ba tuần đầu, và nó có cấu trúc lưới tự nhiên.

Làm nó thành một tấm giấy 原稿用紙 thật: ô gần vuông, đường kẻ mảnh, dấu thập mờ ở tâm mỗi ô. Bấm vào ô thì chữ phóng to ngay trong ô đó kèm thứ tự nét, không mở hộp thoại.

Còn lại — danh sách bài học, bảng theo dõi lớp, màn hình làm bài — giữ đơn giản và quy củ. Đừng để mỗi màn hình một ý tưởng.

## Công cụ

| Việc | Dùng gì | Ghi chú |
|---|---|---|
| Thư viện component | shadcn/ui | **Phải retheme**, để mặc định là nhận ra ngay |
| Nền tảng tương tác | Radix UI | shadcn đã dùng sẵn, lo giúp phần bàn phím và screen reader |
| Token màu và chữ | Biến CSS trong `globals.css` | Không viết hex thẳng trong component |
| Icon | Lucide, chọn có chủ đích | Không rải icon vào mọi nhãn |
| Chuyển động | CSS transition | Framer Motion chỉ khi thực sự cần |

### Cách retheme shadcn

Để nguyên mặc định là ai cũng nhận ra. Ba thứ phải đổi:

1. `--radius` từ `0.5rem` xuống `0.375rem`
2. Bảng màu `--primary`, `--background`, `--border` sang bảng ở trên
3. Font trong `tailwind.config` sang Be Vietnam Pro, bỏ Inter

Sau đó mở component `Button`, `Card`, `Input` ra sửa trực tiếp. shadcn copy code vào dự án chính là để làm việc này.

### Nếu dùng v0, Lovable hay công cụ sinh giao diện

Dùng được, nhưng chỉ lấy phần khung bố cục. Phần màu, chữ và chi tiết thì thay hết bằng token của bạn. Nếu không thì sản phẩm sẽ trông y hệt mọi sản phẩm khác sinh ra từ công cụ đó.

## Thiết kế bằng nội dung thật

Quy tắc này quan trọng hơn mọi thứ ở trên.

**Không dùng Lorem ipsum. Không dùng tên giả kiểu "Nguyễn Văn A".** Dùng câu tiếng Nhật thật, tên học viên thật, điểm số thật.

Lý do cụ thể: chữ Nhật đặc hơn chữ Latin rất nhiều. Một câu 20 ký tự tiếng Nhật mang lượng thông tin bằng 60 ký tự tiếng Việt nhưng chiếm chỗ ít hơn. Bố cục đẹp với Lorem ipsum sẽ vỡ khi đổ chữ Nhật vào, và ngược lại.

Ba trường hợp phải thử ngay từ đầu:

- Từ vựng dài nhất trong bài (`じてんしゃ` so với `ひ`)
- Câu ví dụ dài nhất có furigana
- Tên học viên dài nhất trong lớp

## Chuyển động

Chỉ dùng khi chuyển động **cho biết cái gì vừa thay đổi**:

- Lật thẻ flashcard
- Đáp án đúng hoặc sai hiện ra
- Mở hộp thoại
- Thứ tự nét chạy

Không dùng cho: tải trang, cuộn trang, hover lên thẻ, xuất hiện của section.

Luôn tôn trọng `prefers-reduced-motion`.

## Chất lượng nền

Những thứ phải có, không cần phô ra:

- Chạy được từ màn hình 360px
- Viền focus nhìn thấy rõ khi dùng bàn phím
- Tương phản chữ nền đạt WCAG AA, tối thiểu 4.5:1 cho chữ thường
- Mọi icon đơn độc phải có `aria-label`
- Màn hình rỗng là lời mời hành động, không phải câu xin lỗi. "Chưa có bài tập nào. Giao bài đầu tiên" chứ không phải "Không có dữ liệu".
- Thông báo lỗi nói rõ chuyện gì xảy ra và làm gì tiếp. Không hiện mã lỗi thô.

## Tự phê bình

Trước khi coi một màn hình là xong, làm ba việc:

**Chụp màn hình rồi nhìn lại.** Nhìn ảnh phát hiện ra lỗi mà nhìn code không thấy.

**Nheo mắt.** Thu nhỏ còn 25% rồi nhìn. Thứ nổi lên trước tiên có phải là thứ quan trọng nhất không? Nếu nút phụ nổi hơn nút chính thì thứ bậc sai.

**Bỏ bớt một thứ.** Mỗi màn hình, tìm một thành phần bỏ đi mà không mất thông tin. Thường là một nhãn, một icon, hoặc một đường kẻ.

## Danh sách kiểm tra

Trước khi deploy một màn hình mới:

- [ ] Không có nhãn chữ hoa giãn chữ phía trên tiêu đề
- [ ] Không có mũi tên `→` gắn sau chữ trong nút
- [ ] Không phải mọi thẻ đều cùng radius và cùng bóng
- [ ] Bóng đổ chỉ nằm trên thứ thực sự nổi lên
- [ ] Mỗi màu dùng đúng một nghĩa
- [ ] Chữ Nhật lớn hơn chữ Việt ở cùng chỗ
- [ ] `line-height` đủ cho dấu tiếng Việt, không bị đụng dòng
- [ ] Đã thử với nội dung dài nhất
- [ ] Đã thử ở 360px
- [ ] Đã thử bằng bàn phím
- [ ] Bảng kana dùng font kiểu sách giáo khoa, không phải gothic

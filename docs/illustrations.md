# Hình minh họa cho bài tiếng Nhật

Ngày 30/10/2026. Chủ dự án chọn **phương án B**: icon mở cho từ vựng; ảnh AI cho bộ nhân vật hội thoại và tranh mở đầu mỗi bài. Hình chỉ hỗ trợ nghĩa đã viết bằng chữ, không bao giờ là cách duy nhất để hiểu nội dung. Không dùng, không vẽ lại và không mô phỏng tranh, nhân vật hay bố cục của sách Minna no Nihongo.

## Đã có: icon từ vựng

- Nguồn: Microsoft Fluent Emoji kiểu Flat, giấy phép MIT ([LICENSE](../public/icons/vocab/LICENSE.txt)), ghi công ở trang `/sources`.
- Danh mục có nhãn tiếng Việt ở `lib/vocab-icons.ts`; file SVG ở `public/icons/vocab/`. Thêm icon: bổ sung tên vào danh mục rồi chạy `node --import tsx scripts/extract-vocab-icons.ts --source <icons.json>` với `icons.json` của gói `@iconify-json/fluent-emoji-flat` (script từ chối SVG có script/tham chiếu ngoài).
- Từ vựng bài Nhật có trường tùy chọn `image` (đường dẫn `/…` hoặc `https://…`). Giáo viên chọn ở ô **Hình** của từng từ trong trình soạn. Chỉ gắn cho từ cụ thể (đồ vật, đồ ăn, nơi chốn, xe cộ, thời tiết, người); từ ngữ pháp, chào hỏi, phó từ để trống.
- Hiển thị: slide từ vựng (một cột hình cho cả slide), danh sách từ ở trang đọc, mặt sau flashcard (mặt trước không có hình để học viên vẫn đoán nghĩa từ chữ).

## Đã có: hội thoại dạng bong bóng

Slide và trang đọc hiển thị hội thoại bài Nhật như khung chat: người nói đầu tiên bên trái (bong bóng xanh), người thứ hai bên phải (bong bóng màu chuông đồng), có avatar. Khi chưa có ảnh, avatar là chữ đầu tên trên nền cùng màu bong bóng. Ảnh nhân vật được gắn ở `CHARACTER_PICTURES` (`lib/characters.ts`) theo tên người nói đã bỏ furigana, ví dụ `ナム`, `先生`, `お母さん`.

## Cần tạo bằng AI

### Phong cách chung

Dán đoạn này đầu mọi prompt để các ảnh cùng một bộ:

> Flat vector illustration with soft rounded shapes and gentle shading, warm off-white paper background (#FAF8F3), limited palette of indigo (#2B4C7E), light blue (#DCE6F2), brass yellow (#E3A83E) and natural skin tones, friendly and modern, for a language-learning app for Vietnamese adults learning Japanese. No text, no letters, no numbers, no logos, no watermark. Original characters; do not imitate any textbook, anime or real person.

### Bộ nhân vật (ảnh vuông, đầu và vai, nền trơn, nhìn thẳng)

| Tên trong hội thoại | File | Mô tả thêm sau phần phong cách |
|---|---|---|
| ナム | `nam.webp` | Vietnamese male university student, about 20, short black hair, casual shirt, cheerful smile |
| アン | `an.webp` | Vietnamese female student, about 20, shoulder-length black hair, cardigan, friendly smile |
| リン | `linh.webp` | Vietnamese female student, about 22, ponytail, round glasses, calm expression |
| 先生 | `sensei.webp` | Japanese female teacher in her forties, neat bob haircut, light blouse, kind expression |
| 店員 | `tenin.webp` | Japanese young restaurant staff member, apron and cap, polite smile |
| お母さん | `okaasan.webp` | Japanese woman in her fifties, warm smile, apron over sweater |
| 田中 | `tanaka.webp` | Japanese male office worker in his thirties, short hair, shirt and tie |
| ハナ | `hana.webp` | Japanese female university student, about 20, short hair, hoodie |

### Tranh mở đầu bài (ảnh vuông, một cảnh đơn giản, nhiều khoảng trống)

| Bài | File | Cảnh |
|---|---|---|
| 1 | `minna-1-01.webp` | Two students meeting for the first time in a bright classroom, bowing slightly |
| 2 | `minna-1-02.webp` | A desk with everyday objects: book, pen, umbrella, bag, phone |
| 3 | `minna-1-03.webp` | A department store counter with a price tag and shopping bags |
| 4 | `minna-1-04.webp` | Clocks and a sun and moon showing a day from morning to night |
| 5 | `minna-1-05.webp` | A train arriving at a station platform with a few travellers |
| 6 | `minna-1-06.webp` | Friends sharing a meal at a small table |
| 7 | `minna-1-07.webp` | One person giving a wrapped gift to another, chopsticks on a table |
| 8 | `minna-1-08.webp` | A lively city street beside a quiet mountain town |
| 9 | `minna-1-09.webp` | A student with a guitar, a football and a cooking pot nearby |
| 10 | `minna-1-10.webp` | A room with a cat under a desk and boxes on a shelf |
| 11 | `minna-1-11.webp` | Apples and tangerines being counted next to envelopes and stamps |
| 12 | `minna-1-12.webp` | A traveller with a suitcase in front of a four-season landscape |

### Quy trình

1. Kiểm tra điều khoản sử dụng thương mại của công cụ tạo ảnh đang dùng và ghi lại tên công cụ, ngày tạo, đường dẫn điều khoản vào cuối file này (theo [quyền dùng học liệu](10-risks-costs-and-licenses.md)).
2. Tạo mỗi ảnh vài lần, chọn ảnh đúng mô tả. Loại ảnh có chữ, đồ vật sai, tay/mặt méo hoặc giống nhân vật có sẵn.
3. Lưu ảnh vuông 512×512 dạng WebP: nhân vật vào `public/illustrations/characters/`, tranh bài vào `public/illustrations/lessons/`.
4. Gắn ảnh: thêm tên → đường dẫn trong `CHARACTER_PICTURES`; điền ô **Hình mở đầu** của slide tiêu đề (hoặc trường `image` của slide tiêu đề trong file bài mẫu).
5. Xem lại slide ở khổ 1280×720 và trang đọc ở khổ 360px trước khi xuất bản.

Ảnh AI chưa được tạo: cần chủ dự án chọn công cụ và chấp nhận chi phí, hoặc tự tạo bằng tài khoản của mình rồi gửi file vào các thư mục trên.

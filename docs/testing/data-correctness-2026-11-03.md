# Sửa độ đúng dữ liệu học tập — 03/11/2026

## Kết luận

Đợt này sửa sáu lỗi còn mở trong [rà soát hiện trạng 02/11](project-health-2026-11-02.md): ba lỗi P1 (CR-21, CR-22, CR-23), hai lỗi P2 (CR-31, CR-32) và cảnh báo lặp của bài hằng ngày. Mỗi lỗi có test hồi quy. Với CR-22, CR-23 và CR-31 đã thử bỏ phần sửa: test mới đều fail, khôi phục lại thì đạt.

Các thay đổi không đụng schema, không cần migration và không sửa dữ liệu production; deploy code là đủ. Thẻ ôn và lịch sử học hiện có vẫn giữ nguyên.

## Thay đổi

| Mã | Vấn đề trước sửa | Sửa | Kiểm chứng |
| --- | --- | --- | --- |
| CR-21 | Trình soạn tiếng Trung cấp ID nhỏ nhất còn trống. Xóa `vocab-1` rồi thêm từ mới thì từ mới lại nhận `vocab-1`, kéo theo lịch ôn của từ đã xóa | `createUniqueId` (`lib/item-ids.ts`) dùng chung cho hai trình soạn: tiền tố + 6 ký tự ngẫu nhiên, không trùng ID đang có. `scripts/seed-demo.ts` đọc ID từ nháp và tìm bài theo request trước khi tạo, nên chạy lại vẫn idempotent | `tests/teaching-content.test.ts`: xóa rồi thêm từ không cấp lại ID cũ. Chạy `npm run seed:demo` hai lần trên stack local |
| CR-22 | Hàng ôn chỉ đọc 200 thẻ đến hạn đầu tiên rồi mới bỏ thẻ không mở được (đã rời lớp, bài bị gỡ). Thẻ hợp lệ phía sau không được đọc | `listDueCards` đọc từng trang 200 thẻ, tối đa 5 trang, theo thứ tự cố định `due, item_type, source_id, item_id`, tới khi đủ thẻ cho phiên | E2E flashcard bên dưới: 205 thẻ của bài đã gỡ đến hạn trước thẻ hợp lệ, trang ôn vẫn có 1 thẻ |
| CR-23 | Flashcard và thẻ ôn từ vựng đọc bản mới nhất khi bài công khai hoặc khi giáo viên tự học bài của mình, dù lớp ghim bản cũ. Link Flashcard không mang phiên bản | `findClassLessonVersions` tìm bản lớp ghim theo cùng thứ tự với `read_lesson_version`. Link Flashcard ở trang lớp và trang bài mang `?version=`. Khi chấm thẻ, server kiểm tra từ trong đúng bản đang hiển thị | E2E `flashcards and vocabulary review keep the version a class pins after a newer public one` |
| CR-31 | Thử lại lần ôn bị mất phản hồi thì server chấm câu trả lời mới, có thể báo khác kết quả đã lưu; ô trả lời mở lại cho sửa | Server nhận diện request đã ghi trước khi chấm và trả kết quả đã lưu. Ô trả lời khóa sau khi gửi; nút đổi thành "Gửi lại câu trả lời" | E2E lớp học: chặn phản hồi lần đầu; gửi lại cùng request với đáp án khác vẫn nhận kết quả đã lưu |
| CR-32 | Số thẻ cần ôn dừng ở 50 nên không thấy phần còn tồn. Chuỗi ngày học chỉ đọc 400 lượt ôn nên ôn nhiều mỗi ngày làm chuỗi bị tính thiếu | Lớp của tôi và trang chủ hiện "50+ thẻ"; trang ôn báo còn thẻ cho phiên sau. Chuỗi ngày đọc thêm từng trang 1.000 lượt ôn, tối đa 10 trang, tới khi ngày trống đầu tiên nằm trong phần đã đọc (`isStreakSettled`) | `tests/review-and-report.test.ts` |
| Cảnh báo lặp | Nguồn có đúng bằng số câu mỗi ngày không bị cảnh báo, dù ngày nào cũng lặp toàn bộ | `repeatsEveryDay` dùng `<=`. Trang lớp ghi "bằng số câu mỗi ngày" khi hai số bằng nhau | `tests/daily-practice.test.ts` |

## Giới hạn còn lại

- Thẻ ôn từ vựng vẫn gắn theo bài và ID từ, không theo phiên bản. Trường hợp hiếm: học viên mở flashcard bản mới hơn qua link `?version=` của bài công khai và chấm một từ chỉ có ở bản đó. Thẻ ấy chưa hiện trong phiên ôn cho tới khi lớp chuyển sang bản mới.
- Mỗi lần mở trang, hàng ôn đọc tối đa 1.000 thẻ đến hạn. Hơn 1.000 thẻ không mở được nằm trước thẻ hợp lệ vẫn có thể che phần sau; pilot chưa gặp trường hợp này.
- Chuỗi ngày học tính trên tối đa 10.000 lượt ôn gần nhất cộng 400 bài nộp gần nhất.
- Trên điện thoại thật chưa thử mất mạng khi ôn. E2E giả lập mất phản hồi bằng cách chặn response trong trình duyệt.

## Kết quả kiểm thử

- `npm run check`: PASS 176/176, gồm Prettier, ESLint, TypeScript và test logic/database.
- `npm run test:e2e`: PASS 36/36.
- `npm run test:e2e:supabase` trên stack local: PASS 36/36. Spec lớp học chạy lại sau khi thêm bước thử lại: PASS 8/8.
- Thử bỏ phần sửa:
  - Bỏ bước tìm bản lớp ghim: test flashcard fail, thẻ hiện nghĩa của bản mới.
  - Chỉ đọc một trang thẻ đến hạn như trước: test flashcard fail, trang ôn không còn thẻ nào.
  - Server chấm lại câu trả lời khi thử lại: test lớp học fail (`isCorrect: false`).
- `npm run build`: PASS.
- `npm run seed:demo` chạy hai lần trên stack local: lần hai dùng lại đúng bài và lớp demo.

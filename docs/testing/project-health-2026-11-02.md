# Rà soát hiện trạng và ưu tiên tiếp theo — 02/11/2026

## Kết luận và phạm vi

Kiểm tra source tại `117d514`, các báo cáo trước và Supabase production theo quyền chỉ đọc. Nền dạy–học đã có giao bài, chấm điểm, nháp/khôi phục, phiên bản, sổ lỗi, SRS và tiến độ. Đề xuất ưu tiên độ đúng dữ liệu học tập, vận hành và nghiệm thu thực tế trước khi mở rộng sản phẩm.

`npm run check` mới chạy: **PASS 161/161**, Prettier/ESLint/TypeScript đạt. Đây không phải chứng nhận an toàn hoặc nghiệm thu toàn bộ ứng dụng. Không chạy lại E2E, build, thử mất mạng bằng trình duyệt, thử email thật hay restore database trong đợt này. Không thay runtime, schema, cấu hình cloud hoặc dữ liệu học viên.

Các điểm đã ghi ở báo cáo cũ được đối chiếu lại với source hiện tại, không coi việc có tài liệu là bằng chứng đã sửa.

## Lỗi còn xác nhận được

| Ưu tiên | Điểm cần sửa | Bằng chứng hiện tại và ảnh hưởng |
| --- | --- | --- |
| P1 | Flashcard phải dùng đúng phiên bản của lớp | `app/classes/[id]/page.tsx` truyền `?version=` cho Đọc bài và Kanji, nhưng không truyền cho Flashcard; `getVocabularyDeck` trong `lib/server/reviews.ts` tải version mặc định. Khi giáo viên đã xuất bản bản mới mà lớp vẫn ghim bản cũ, flashcard có thể không cùng nội dung đang học. Cần chốt cả phiên bản cho SRS, không chỉ sửa link. CR-23 vẫn mở. |
| P1 | Không tái sử dụng ID nội dung đã xóa | `createTeachingId` trong `lib/teaching-draft.ts` chọn số nhỏ nhất chưa dùng. Probe bằng hàm thật: còn `vocab-1` thì sinh `vocab-2`; xóa từ đó thì sinh lại `vocab-1`. Thẻ SRS nhận diện từ bằng lesson/item ID nên có thể nối lịch ôn cũ sang từ mới sau xuất bản. Áp dụng cho editor v2 Việt–Trung; CR-21 vẫn mở. |
| P1 | Hàng ôn phải đi tiếp sau các thẻ không còn đọc được | `listDueCards` trong `lib/server/reviews.ts` lấy tối đa 200 hàng rồi mới bỏ các nguồn/từ không truy cập được, sau đó trả tối đa 50 thẻ. Nếu 200 hàng đầu không hợp lệ, thẻ hợp lệ ở sau không được đọc. Chưa ghi nhận trường hợp này trên tài khoản pilot; đây là biên được xác nhận từ thuật toán. CR-22 vẫn mở. |
| P2 | Khóa nội dung request khi thử lại lần ôn bị mất phản hồi | `components/review/review-session.tsx` giữ requestId khi lỗi mạng nhưng mở lại ô trả lời. `recordMistakeReview` trong `lib/server/reviews.ts` chấm câu trả lời hiện tại trước khi kiểm tra request đã ghi, nên phản hồi retry có thể khác kết quả lần đầu đã lưu. Chưa tái hiện bằng mạng thật trong đợt này. CR-31 vẫn mở. |
| P2 | Số thẻ cần ôn và chuỗi ngày học | `getLearnerAgenda` trong `lib/server/learner.ts` đếm số thẻ từ `listDueCards`, vốn chỉ trả 50 thẻ/phiên: số hiện ở Lớp của tôi không phản ánh toàn bộ backlog khi lớn hơn 50. `getStudyActivity` chỉ đọc 400 sự kiện mỗi loại nên có thể tính thiếu chuỗi ngày khi ôn nhiều; CR-32 vẫn mở. |
| P2 | Cảnh báo thiếu độ đa dạng bài hằng ngày | `repeatsEveryDay` trong `lib/daily-practice.ts` dùng `<`, nên nguồn 40 câu/giao 40 câu trả `false`, dù toàn bộ câu lặp mỗi ngày. Đã probe hàm thật. `tests/daily-practice.test.ts` hiện còn khẳng định trường hợp bằng nhau là false. Cần đổi cả mô tả và test hành vi. |

P1 trong báo cáo này là việc nên làm ở đợt ổn định kế tiếp, không có nghĩa đã chứng minh sự cố mất dữ liệu hoặc lộ dữ liệu đang xảy ra trên production.

## Các việc cần nghiệm thu hoặc hoàn thiện

1. **Chấm điểm và chất lượng học liệu.** `lib/grading/grade.ts` đối chiếu các đáp án khai báo, chưa có luồng chấm tay/duyệt đáp án tương đương trên web. Đợt [sửa điểm N5](grading-correction-2026-11-02.md) đã phải thực hiện bảo trì dữ liệu có duyệt. Cần rà câu dịch/câu trả lời mở và có cách giáo viên xử lý tranh luận điểm, nhật ký và cập nhật ngân hàng cho các lần sau. Test dữ liệu chứng minh đáp án khai báo được chấm đúng, không chứng minh mọi cách diễn đạt đúng đều được chấp nhận hoặc nội dung đã được chuyên gia duyệt.
2. **Cron và cảnh báo thiếu bài.** `runDailyPractice` bắt lỗi riêng từng lớp và trả `failed`; route cron vẫn trả HTTP 200 với summary khi có lớp thất bại. Cách này giữ các lớp khác chạy được nhưng cần giám sát `failed` và kiểm tra lớp đang bật mà chưa có bài của ngày. Có `daily_practice_runs` và log, chưa tìm thấy cơ chế cảnh báo vận hành tự động trong repo. Không kết luận cấu hình bên ngoài Vercel không có giám sát.
3. **Email và khôi phục tài khoản.** Cấu hình production trong `supabase/config.toml` vẫn tắt xác nhận email, giữ template mặc định; `/auth/confirm` chỉ nhận `token_hash`, không xử lý `code`. [Tài liệu POC](../poc-setup.md) ghi SMTP/email chưa hoàn thiện. Cần xác minh cấu hình hosted hiện tại rồi nghiệm thu đăng ký, quên mật khẩu, liên kết email và nhắc bài trên địa chỉ thật. Đợt này không gửi email hoặc đổi mật khẩu người dùng.
4. **Sao lưu và triển khai.** Đã có bằng chứng dump thủ công trước migration nhưng chưa tìm thấy biên bản restore thành công trên môi trường riêng. Repo chưa có `.github`/workflow CI kiểm tra trước triển khai; hiện dựa vào quy trình chạy local rồi push. Sự cố code lên trước migration đã có trong [rà soát 02/11](code-review-2026-11-02.md). Cần kiểm tra restore, tự động hóa các check và kiểm tra tương thích schema trước phát hành; vẫn làm trên main theo quy ước dự án.
5. **Luồng học dễ tìm.** `/history` là snapshot Sheet, `/classes` là bài cần làm và `/progress` là kết quả Reng theo tuần. Nội dung này đã khiến người dùng nhầm trong phiên trao đổi. Cần lối đi rõ từ lịch sử sang bài mới, ghi rõ nguồn dữ liệu và cân nhắc biểu đồ tiến độ theo ngày/dạng bài. Đây là cải tiến UX, không phải lỗi cron không giao bài.
6. **Học liệu N4 và thiết bị thật.** Bộ N4 đã mở rộng đọc–viết đến Minna 50, chưa có nghe. Cần nghe N4 có nội dung/quyền sử dụng và nghiệm thu âm thanh, nhập tiếng Nhật, màn hình nhỏ, resume bài sau mất mạng trên thiết bị người học. Không dùng số lượng 200 câu để kết luận bao phủ toàn bộ năng lực N4.

## Supabase security advisor

Đã đọc advisor và định nghĩa hàm thật trên production. Phải phân loại cảnh báo, không đếm tất cả là lỗ hổng:

- 9 bảng có RLS nhưng không policy: phù hợp với các bảng chỉ cho server thao tác; cần giữ nguyên kiểm tra phân quyền ở caller. Không tự thêm policy cho client chỉ để xóa cảnh báo. [Giải thích linter](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- 3 hàm trigger `initialize_profile`, `sync_legacy_teacher_grant`, `sync_teacher_capability` còn quyền EXECUTE cho anon/authenticated. Các hàm trả `trigger`, không phải RPC thông thường để tự gọi nâng quyền; nên thu hẹp grant, nhưng đợt này chưa chứng minh đường khai thác. [Giải thích cảnh báo](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- `teaches_class`/`teaches_assignment` là helper security definer phục vụ quyền đọc. Đã kiểm tra `teaches_class` ràng buộc `auth.uid()` và các hàm khóa `search_path`; không coi việc authenticated gọi được là lỗi mặc định. [Giải thích cảnh báo](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Advisor báo chưa bật bảo vệ mật khẩu rò rỉ. Cần xem điều kiện gói và bật khi phù hợp trong đợt hoàn thiện Auth. [Hướng dẫn](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Đã xem tổng hợp log database/API trong cửa sổ 24 giờ mặc định. Chưa phân loại nguyên nhân từng lỗi log, nên không dùng số lỗi làm kết luận về độ ổn định ứng dụng.

## Thứ tự đề xuất

1. Sửa các P1 về phiên bản/ID/hàng ôn và P2 cảnh báo lặp; thêm ca hồi quy tương ứng.
2. Nghiệm thu luồng làm bài → nộp → xem điểm → câu sai → ôn → tiến độ, gồm retry mất mạng và hai tab, trên môi trường test và điện thoại thật.
3. Hoàn thiện Auth/email, cảnh báo cron, backup/restore và check trước triển khai.
4. Làm rõ đường đi Lịch sử/Bài mới/Tiến độ; bổ sung thống kê theo ngày và dạng bài khi cần.
5. Bổ sung nghe N4 và duyệt chuyên môn các ngân hàng câu.

Các mục trên là kết quả rà soát và đề xuất, **chưa được sửa trong đợt audit này**. Bản báo cáo source-alignment cũ có nhiều mốc/giới hạn khác; không dùng tỷ lệ phần trăm của tài liệu đó để suy ra mức hoàn thiện hiện tại.

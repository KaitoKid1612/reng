# Kiểm chứng lịch sử học tập — 30/10/2026

## Phạm vi

Đối chiếu [BD](../basic-design/learning-history.md), [DD](../detail-design/learning-history.md). Dữ liệu kiểm thử là dữ liệu tự soạn, không commit lịch sử học viên thật. Snapshot nguồn thật chỉ dùng để nhập và đối chiếu số lượng trong vùng riêng.

| Kiểm tra | Bằng chứng |
|---|---|
| Header, số thập phân dấu phẩy, trống/0, thang 10/100, dòng trùng mã, giữ dòng nguồn và nội dung HTML dạng chữ | `tests/learning-history.test.ts` |
| Nhập lặp, xung đột nội dung/chủ sở hữu, RLS giáo viên/học viên/người lạ, cấm ghi trực tiếp, học viên chờ và xác nhận email/liên kết, giáo viên mất quyền | `tests/learning-history-migration.test.ts` trên PostgreSQL nhúng |
| Giao diện 1280px/360px, không chạy HTML nguồn, mở chi tiết, routes yêu cầu đăng nhập, sitemap/robots riêng tư | `e2e/history.spec.ts` |
| Giáo viên xem hai hồ sơ, đăng ký chưa tự nhận lịch sử, xác nhận liên kết rồi học viên chỉ xem bản thân, đoán ID khác trả 404 | `e2e-supabase/learning-history.spec.ts` trên Supabase local |

## Trạng thái bàn giao

- `npm run check`: PASS, 123/123 test; format, ESLint và TypeScript đạt. Test pipeline cần chạy ngoài sandbox để tạo process local.
- `npm run test:e2e`: 34/35 đạt lần đầu; một test kanji chậm chuyển trang khi chạy song song. Chạy lại riêng `e2e/kanji.spec.ts`: 2/2 đạt. Ba test lịch sử và các test menu đều đạt.
- `npm run test:e2e:supabase -- e2e-supabase/learning-history.spec.ts`: PASS, 1/1 luồng thực tế. Hai lần chuẩn bị trước đó lỗi locator: chờ tên nút biến mất đã khớp trạng thái pending trước khi RPC xong; và câu kiểm tra thiếu nhãn “Đề bài:”. Đã sửa chờ form được gỡ sau refresh và kiểm tra đúng văn bản hiển thị.
- `npm run build`: PASS, route lịch sử được render động và có xác thực.
- Supabase local chạy trong stack riêng `reng-history-tests`. CLI 2.122 gặp lỗi Podman secret; dùng CLI 2.95.3 với bản cấu hình tương thích trong `/tmp`, không sửa cấu hình repo hoặc dừng container dự án khác. Toàn bộ migration đã áp dụng trên stack này trước khi chạy E2E.
- Production: đã áp dụng riêng migration lịch sử, không seed/Vault; nhập 2 hồ sơ với tổng cộng 56 dòng tổng hợp và 2.808 câu. Đọc lại số dòng và ánh xạ đúng; một hồ sơ đã gắn người học, một hồ sơ chờ đăng ký/xác nhận liên kết. Sheet không đổi.
- Đối chiếu toàn bộ JSONB production với hai file đã kiểm tra: khớp. Transaction chỉ đọc kiểm tra RLS với subject giáo viên chỉ định thấy 2 hồ sơ, subject không liên quan thấy 0; rollback sau kiểm tra.
- Commit tính năng `72133c8` đã push main; Vercel deployment `dpl_6Hx7R4hraLLcTbvGtxxKKf13vHMn` Ready, alias công khai https://reng-cyan.vercel.app. HTTP không đăng nhập: `/history` và chi tiết trả 307 về đăng nhập kèm next path; robots trả 200 có chặn `/history`, sitemap trả 200 không chứa lịch sử. Không có nội dung bài làm trong các phản hồi này. Các alias tự sinh khác có Vercel SSO; dùng địa chỉ công khai nêu trên.

Giới hạn: không tự đăng nhập tài khoản thật hoặc đặt lại mật khẩu để kiểm thử production. Snapshot cũ không được chấm lại; không nhập buổi dạy từ ngày làm bài. Sheet được giữ nguyên và không đồng bộ tiếp.

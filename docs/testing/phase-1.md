# Truy vết và nghiệm thu giai đoạn 1

PASS local không thay thế nghiệm thu cloud/thiết bị thật. BD/DD tại ../basic-design và ../detail-design.

| ID | Yêu cầu | Thiết kế | Tình huống | Kết quả |
|---|---|---|---|---|
| G1-01 | KANA-01 | S02/validator | 208 mục, đúng nhóm, không trùng ID/tọa độ | PASS — validator và test dataset |
| G1-02 | KANA-01 | S02/chart | Đổi hệ, ô trống không focus, chi tiết đúng | PASS local — Chromium, 104 ô mỗi hệ |
| G1-03 | KANA-03 | S03/chấm | Biến thể, NFKC, chữ hoa, khoảng trắng, sai | PASS — unit test và luồng Chromium |
| G1-04 | KANA-03 | S03/reducer | Enter, submit trùng, rỗng, tổng kết, luyện lại | PASS — reducer và phiên 10 câu, luyện lại lỗi |
| G1-05 | KANA-03 | S03/shuffle | 10/20/toàn bộ, không lặp, query hệ | PASS phạm vi đã chạy — unit 20 câu/pool ngắn, browser 10 câu và query Katakana |
| G1-06 | KANA-02 | S02/player | MP3 thành công/404/timeout, chọn nhanh | PASS local — native MP3 silence fixture, 404/retry, timeout, đổi chữ và dispose; chưa đo audio phát âm thật |
| G1-07 | KANA-02 | S02/fallback | Có/thiếu voice Nhật, không dùng voice khác | PASS với stub — thiếu voice, voice Nhật sẵn sàng muộn và lỗi speak đồng bộ; chưa nghe voice thiết bị thật |
| G1-08 | Thiết bị | UI | 360px, bàn phím, focus, nhãn và thông báo | PASS smoke local — 4 trang không tràn 360px, skip link focus được; chưa audit accessibility đầy đủ |
| G1-09 | Audio | Canonical | Hash ổn định, đổi cấu hình đổi hash, dry-run | PASS — hash/SSML, dry-run, thiếu khóa không đổi manifest |
| G1-10 | Audio | Pipeline | Sinh/upload/retry, chạy lại không sinh lại | PASS với fake adapters — retry TTS, lỗi inspect/upload/metadata/manifest và chạy lại không sinh trùng; cloud thật vẫn chờ credentials |
| G1-11 | Bảo mật | Migration | Anon bị chặn, student không đổi role, version bất biến | PASS trên PostgreSQL nhúng/auth stub; chưa kiểm chứng Supabase Auth thật |
| G1-12 | Nền | Config | Lint, typecheck, tests, build | PASS — lint, typecheck, format, 18 test logic/database/pipeline, 13 E2E, production build |
| G1-13 | NFR | Thiết bị thật | Safari, máy chiếu, 4G, mục tiêu audio 300ms | Chưa chạy thiết bị/mạng thật |

## Bằng chứng hiện tại

Ngày kiểm tra: 28/10/2026. Node 24.16.0, dependency theo lockfile.

- npm run check: formatter, ESLint, next typegen, TypeScript và 18/18 test logic/database/pipeline thành công. Test chỉ dùng database nhúng hoặc fake adapters, không chạm dịch vụ thật.
- npm run test:e2e: 13/13 Chromium test qua. Bao gồm bảng kana, phiên 10 câu/tổng kết/luyện lại, 360px, bàn phím, redirect giữ query và 8 tình huống audio bổ sung.
- MP3 fixture được tạo từ frame MPEG silence trong test; Chromium dùng HTMLAudioElement thật để decode. Kiểm tra playing/done, 404 rồi retry, timeout bằng clock giả lập, đổi chữ dừng nguồn cũ và dispose chặn callback/play tiếp theo. Không dùng fixture làm phát âm cho học viên.
- Nhánh giọng Nhật của thiết bị được kiểm tra bằng stub: không có voice, voice đến muộn và speak ném lỗi đồng bộ. Quay lại trang kana reset thông báo của trang trước.
- Pipeline fake kiểm tra asset đã có không gọi TTS; lỗi inspect dừng trước TTS; upload lỗi không publish manifest; metadata/ghi manifest lỗi sau upload có thể retry mà không sinh lại asset. Azure adapter kiểm tra 429/5xx retry hữu hạn, 401 không retry, response rỗng và network timeout.
- npm run audio:plan: 208 mục/208 hash, không gọi cloud. Test generate thiếu credentials trả lỗi và giữ nguyên manifest thật.
- npm run build: thành công, các route /, /kana, /kana/practice, /sources; module browser không kéo adapter Node/TTS vào client.
- Ảnh UI tại test-results/kana-mobile-viewport.png là artifact local bị gitignore. Bản UI desktop/mobile đã được rà trước đó; thay đổi lần này tập trung vòng đời audio và pipeline.

## Phạm vi chưa nghiệm thu

Chưa có credentials Azure/R2/Supabase hoặc môi trường deploy được chỉ định. Chưa sinh MP3 phát âm thật, chưa chạy migration vào cloud, chưa deploy. Chưa có bằng chứng Safari/máy chiếu/4G hoặc giảng viên duyệt chất lượng phát âm. Giai đoạn 1 vẫn chưa nghiệm thu hoàn chỉnh; PASS local/fake không thay thế kiểm chứng dịch vụ và thiết bị thật.

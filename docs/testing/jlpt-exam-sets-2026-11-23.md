# Kiểm chứng bộ đề JLPT N5, N4 có bản in — 23/11/2026

Theo [prompt](../prompts/jlpt-exam-sets.md). Thiết kế ở [BD Luyện đề](../basic-design/exam-center.md#bộ-đề-có-bản-in--23112026) và [DD](../detail-design/phase-3.md#bộ-đề-cố-định-và-bản-in-jlpt--23112026).

## Danh sách đề

| Cấp | Đề | Nguồn | 文字・語彙 | 文法・読解 | 聴解 | Tổng |
|---|---|---|---|---|---|---|
| N5 | Đề 1 | Đề chính thức, tập 2018 (jlpt.jp) | 35 | 32 | 24 | 91 |
| N5 | Đề 2 | Đề chính thức, tập 2012 (jlpt.jp) | 33 | 32 | 24 | 89 |
| N5 | Đề 3 | Đề thi thử Reng N5 số 1 (`reng-n5-1`) | 21 | 22 | 24 | 67 |
| N4 | Đề 1 | Đề chính thức, tập 2018 (jlpt.jp) | 35 | 35 | 28 | 98 |
| N4 | Đề 2 | Đề chính thức, tập 2012 (jlpt.jp) | 34 | 35 | 28 | 97 |
| N4 | Đề 3 | Đề thi thử Reng N4 số 1 (`reng-n4-1`) | 28 | 29 | 28 | 85 |

- Đề chính thức đã có từ 11/11/2026 và đã gắn vào lớp trên production, nên lần này chỉ làm bản in. Đáp án đã được `tests/jlpt-official-tests.test.ts` so với 正答表.
- Đề Reng lấy câu từ ngân hàng đề đã soát ngày 19/11/2026 ([N5](exam-center-2026-11-19.md), [N4](n4-reng-exams-2026-11-19.md)). Chọn câu theo thứ tự ngân hàng, bỏ câu có trong ngân hàng ôn hằng ngày của lớp:
  - N5: phần nghe lấy từ câu 41–72, vì câu 1–40 cũng nằm trong ngân hàng ôn của lớp Minna.
  - N4: ngân hàng chuẩn không trùng câu nào với ngân hàng ôn hằng ngày.
- Vị trí đáp án ở câu bốn phương án: N5 14/14/12/16, N4 19/18/17/18.

## Kiểm kê production (chỉ đọc, 23/11/2026)

Câu SQL chỉ có SELECT, chạy bằng `npx supabase db query --linked`. Kết quả khớp ghi chú trong prompt:
- **Tiếng Nhật Minna – Lớp 1**:
  - Bài gắn: đề chính thức N5 2018 (91 câu) và 2012 (89 câu), mở cho học viên 07/12/2026. `n5-jlpt-mock-bank` v1, 201 câu, gắn 20/11. `n5-sheet-review-bank` v8, `n5-minna-review-bank` v4, "Luyện nghe Minna 1–15".
  - Đề đã mở: "Thi thử JLPT N5 — 10/11", 65 câu từ `n5-sheet-review-bank`, 0 bài nộp, đã hết hạn. Chưa mở đề nào từ `n5-jlpt-mock-bank`.
  - Mã câu của `n5-jlpt-mock-bank` trên production trùng hoàn toàn với file trong repo (md5 danh sách mã).
- **Ôn JLPT N4 – Việt**:
  - Bài gắn: đề chính thức N4 2018 (98 câu) và 2012 (97 câu), mở 07/12/2026, cùng các bài ôn ngữ pháp.
  - Đề đã mở: "Thi thử JLPT N4 — 10/11", 70 câu từ `n4-viet-review-bank`, 0 bài nộp. Chưa có ngân hàng N4 chuẩn hay nâng cao trên production.
- Không đề nào trên production dùng câu của hai đề Reng mới.

## Nguồn trên mạng

Một agent kiểm tra 35 nguồn bằng 25 từ khóa tiếng Nhật, Việt và Anh. Kết quả ở `content/jlpt/source-audit-2026-11-23.json`.
- **Không có tập đề chính thức mới.** jlpt.jp vẫn ghi 「これまでに2集」: 2012 và 第二集 2018. Danh mục sách chính thức (cập nhật 16/11/2026) và 凡人社 cũng không có 第三集.
- **Chính sách jlpt.jp mục 1(4) không đổi**: dùng làm tài liệu dạy tiếng Nhật không thu phí, ghi nguồn.
- **問題例 2009 chỉ là câu mẫu**, dạng đề trước 2010, không phải trọn một đề:
  - N5 có 29 câu (8 文字・語彙, 13 文法・読解, 8 聴解), N4 có 34 câu (10, 16, 8).
  - Có đáp án; audio chỉ có cho một phần câu nghe.
  - Đã thêm vào mục "Đề mẫu chính thức trên mạng" dưới dạng link, cùng trang làm thử 問題例に挑戦しよう.
- **Không có đề mẫu tải miễn phí** của JEES, Quỹ Giao lưu Quốc tế Nhật Bản tại Việt Nam, các trường nhận hồ sơ hay các nhà xuất bản sách luyện thi (3A, ASK, アルク, 凡人社, Jリサーチ, Japan Times).
- **Chỉ jpnotes.dev có giấy phép mở** (CC BY-NC 4.0, ghi nguồn). Đó là bài nghe tự soạn đọc bằng AI, không phải đề JLPT thật. Chưa đưa vào, chưa đặt link; chờ người dùng quyết.
- **Không dùng:**
  - Prepedu ("đề thi JLPT N5 chính thức 2017–2023") và Nihongo Master ("real N5 questions"): đề gắn nhãn tháng năm, không có xuất xứ chính thức.
  - Các file trên Scribd.
- **Thay đổi so với danh mục cũ:**
  - Ba link trong `source-registry.json` dùng host `samplequestions.jlpt.jp` không tồn tại; đã sửa về `www.jlpt.jp`.
  - jlpt.jp nay đặt link audio 問題2 của tập 2012 tới file năm 2017 (lớn gấp ba). Link Reng đang dùng vẫn mở được; chưa nghe so sánh.
  - VNJPClub chuyển trang và robots.txt chặn agent, nên không đọc lại. jlptsensei có trang chống bot, không vượt qua.
  - Quỹ Giao lưu Quốc tế Nhật Bản tại Hà Nội có thông báo 25/06/2026 coi việc thu thập, mua bán đề thi cũ là vi phạm.

## Rà câu hỏi đề thi thử

Mỗi cấp một agent không viết đề, đọc từng câu theo thứ tự đề. Cả hai không thấy câu nào sai đáp án hay có hai đáp án đúng, và không nhận ra câu nào chép từ đề thật. Mọi lỗi được báo đã sửa trong ngân hàng và bộ nghe nguồn.

**N5 (67 câu): 4 lỗi cần sửa, 6 lỗi nhỏ.**
- Câu lộ đáp án câu khác:
  - Hướng dẫn もんだい６ in {右|みぎ}, là đáp án câu 6 → viết みぎ.
  - Câu 23 in 大きい, là đáp án câu 10 → おおきい.
  - Câu ★ 33 trùng thứ tự với bài đọc câu 39 → テニスを しに 行きませんか.
  - Câu ★ 34 kết thúc bằng mẫu だれですか của câu 25 → 人は わたしの あにです.
- Gợi ý nhẹ:
  - Đoạn văn câu 35–38 có 書いて → đổi câu dẫn.
  - Đoạn văn câu 41–42 có 六時から 十時まで → 四時間ぐらい.
  - Câu 42 hỏi bằng 入ってから → 入ったら.
  - Phương án nghe 53 có furigana はん của 8時半 (đáp án câu 3) → bỏ furigana.
- Lời nghe:
  - Câu 46: 〜ましょうか → いりますか.
  - Câu 45: bỏ その không có gì để chỉ.
  - Sinh lại 2 MP3.

**N4 (85 câu): 2 lỗi cần sửa, 7 lỗi nhỏ.**
- mid-reading-02: phương án nhiễu "走るのを やめた" đúng theo nghĩa đen → "そこで 大会を やめた".
- Phần 3–4 nghe: đáp án xoay vòng 2,3,1 → đổi thứ tự lời đáp ở l-19, l-22, l-27 (nay 2,3,1,1,3 và 2,1,1,2,3,1,3,3).
- Từ trên N4:
  - 家賃 → へやが 広いので.
  - 営業所 → センター; lời giải thích bỏ chữ "hôm qua" mà thông báo không nói.
  - 画面, 充電 ở l-12 → 軽くて持ちやすい, ほとんど残っていない.
- Lộ đáp án:
  - Thông báo có 〜そうな (câu ngữ pháp 09) → なくなる 方は.
  - l-12 in 写真 (đáp án câu 表記) → カメラ.
- Câu chưa tự nhiên:
  - "パスポートなどの カード" → "名前と 住所が わかる もの".
  - l-22 "三百円ぐらい" cũng có thể là câu trả lời đúng → 九時ごろです.
- Sinh lại 4 MP3.

Audio mới tạo bằng Unreal Speech, cùng giọng bộ cũ (người dẫn Yuki, nữ Sakura, nam Haruto, nhân viên Rina). **Cần người dùng nghe duyệt 6 file:** n5-mock-45, 46; n4-rx-std-l-12, 19, 22, 27. Agent N4 cũng đề nghị nghe lại cách đọc 何とも (l-10), 林 (l-06), 九人 (l-15) trong file cũ.

Sau khi sửa, `npm run audit:jlpt-bank` trên hai ngân hàng không báo lỗi, 0 chữ Hán vượt cấp thiếu furigana.

## Bản in

Playwright (headless shell 1248) mở từng tập bằng tài khoản giáo viên local, xuất `page.pdf` theo khổ trang CSS, rồi `pdfinfo` và `pdftotext` đếm:

| Đề | Đề (trang) | Phiếu trả lời | Đáp án | Lời thoại nghe |
|---|---|---|---|---|
| N5 2018 | 19 | 3 | 9 (91 đáp án) | 6 (24) |
| N5 2012 | 19 | 3 | 8 (89) | 6 (24) |
| Reng N5 số 1 | 11 | 3 | 9 (67) | 7 (24) |
| N4 2018 | 21 | 3 | 10 (98) | 9 (28) |
| N4 2012 | 20 | 3 | 9 (97) | 7 (28) |
| Reng N4 số 1 | 13 | 3 | 11 (85) | 8 (28) |

- Mọi trang A4 dọc (595 × 842 pt).
- Số câu nghe in trên tập đề và phiếu trả lời khớp dữ liệu (24 hoặc 28 nhãn `Nばん`). Ở hai đề N5 chính thức `pdftotext` đếm 28 vì phương án của một câu nghe là "1かいの 3ばん…"; nhãn câu đúng 24.
- Tập đề và phiếu trả lời không có chữ "Đáp án" hay lời thoại (`ナレーター：`).
- Xem ảnh vài trang:
  - Lần đầu, phần đầu tiên luôn sang trang mới, để lại trang bìa gần trống; phương án thứ tư rớt một dòng riêng.
  - Đã sửa: phần đầu nằm ngay dưới bìa; phương án xếp 4, 2 hoặc 1 cột theo độ dài. Mỗi tập ngắn đi 1 trang.
- Script treo ở lần chạy đầu vì ảnh dùng lazy-load, nên ảnh ngoài màn hình chưa tải khi in. Ảnh của bản in nay tải ngay (`loading="eager"`).

## Giao diện

Trang Luyện đề và ba tập in (đề N5 Reng, phiếu trả lời N4 2018, đáp án N4 Reng) được kiểm ở 1280, 1440, 1920 và 390 px, giao diện sáng và tối:
- axe 0 lỗi;
- không tràn ngang;
- không lỗi console.

## Tự động

- `tests/jlpt-exam-sets.test.ts` kiểm tra:
  - thứ tự đề mỗi cấp, tên đề không ghi tháng năm;
  - cấu trúc và số câu từng dạng;
  - không trùng câu, giữ trọn đoạn văn, tránh câu ngân hàng ôn hằng ngày;
  - một đáp án, phân bố vị trí đáp án, mọi câu nghe có MP3;
  - mở đề cố định.
- `tests/exam-print.test.ts` kiểm tra:
  - đánh số như đề thật, mỗi câu in đúng một lần;
  - tập học viên không có đáp án, giải thích hay lời thoại;
  - quyền in.
- `npm run check`: 503/503.
- `npm run test:e2e`: 41/41.
- `npm run test:e2e:supabase`: 49/49, chạy trên Supabase local. Lượt đầu của spec mới hỏng vì bộ chọn `getByRole("alert")` trùng vùng thông báo route của Next; sửa spec, chạy lại thì qua. `exam-center.spec.ts` kiểm tra:
  - thư viện có dòng đề cố định;
  - mở đề một lần, ngân hàng còn 2 đề;
  - bản in 67 câu, 24 mã QR, tập đề không có đáp án, tập đáp án 67 dòng;
  - danh sách 6 đề in;
  - học viên bị chặn và không thấy mục Bản in.

## Còn mở

- **Ngân hàng N5 trên production** vẫn là bản trước khi sửa (v1). Cần nạp bản mới bằng `bank:sql` trước khi lớp Minna mở Đề thi thử Reng N5 số 1.
- **Ngân hàng N4 chuẩn** chưa có trên production. Cần nạp và gắn vào lớp Ôn JLPT N4 – Việt để làm Đề 3 N4 trên Reng; bản in không cần bước này.
- Người dùng nghe duyệt 6 MP3 mới.
- Quyết định về jpnotes.dev: chỉ đặt link, xin phép, hay bỏ qua.
- Không đọc được usage tuần của tài khoản, nên dừng theo phạm vi đợt làm.

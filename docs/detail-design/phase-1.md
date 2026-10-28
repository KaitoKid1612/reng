# Detail Design giai đoạn 1 — 詳細設計

Baseline 28/10/2026 theo [BD](../basic-design/phase-1.md). Node 24/npm; phiên bản package thực tế lấy từ package.json/package-lock.json.

## Module

| Module | Trách nhiệm |
|---|---|
| content/kana.json | schemaVersion=1, 208 mục, nguồn kana duy nhất |
| lib/kana.ts | Validator Zod, lọc, chuẩn hóa/chấm, phiên không lặp, reducer |
| lib/audio-config.ts | Canonical JSON, SHA-256, XML escape |
| components/kana/kana-chart.tsx | Điều phối hệ chữ và lựa chọn; lưới/chi tiết tách thành kana-grid.tsx và kana-character-details.tsx |
| components/kana/kana-practice.tsx | Điều phối state phiên; view tách thành practice-setup.tsx, practice-question.tsx, practice-result.tsx |
| components/audio-provider.tsx | Context React; reset phiên audio khi đổi pathname; dispose player khi rời trang |
| lib/audio-player.ts | Player browser, request token, timeout, hủy nguồn cũ, fallback giọng Nhật |
| lib/audio-generation.ts | Điều phối asset → metadata → manifest, hỗ trợ phục hồi sau lỗi |
| lib/azure-speech.ts | Adapter TTS: timeout, retry hữu hạn 429/5xx, không ghi khóa/response vào log |
| content/audio-manifest.json | Ánh xạ ID → hash, ban đầu rỗng khi chưa có MP3 |
| scripts/generate-audio.ts | Dry-run; Azure → local/R2, đồng bộ metadata tùy chọn |
| supabase/migrations | Schema nền, grants, RLS; không chạy khi mở web |

Trang server đọc và validate JSON khi build; component client nhận dữ liệu công khai. Không tạo REST API chỉ để bọc JSON tĩnh, không API ghi điểm hoặc kết nối database runtime ở mốc này.

## Dữ liệu và validation

```text
{schemaVersion: 1, items: KanaItem[]}
KanaItem = {id, script, group, row, column, kana,
            acceptedRomaji: string[], audio: null, strokes: string[]}
script = hiragana | katakana
group = basic | dakuten | handakuten | yoon
```

ID dạng h-a/k-a, h-sha/k-sha; không đổi sau xuất bản. row >=0 trong nhóm, column 0..4 hoặc 0..2 với yoon. Validator chặn ID/chữ/tọa độ trùng, sai hệ, romaji rỗng và thiếu số mục mỗi nhóm. Audio null trong dữ liệu nền; hash ở manifest để không lặp cấu hình voice. Quy ước này chi tiết hóa trường audio của 03. Base audio là đường dẫn local hoặc HTTPS cấu hình, không lấy URL từ input người dùng.

## Phiên luyện

1. Lọc hệ/nhóm; Fisher–Yates trên bản sao, lấy min(số câu, số mục).
2. Trạng thái configure → answering → feedback → answering/result. Reducer quản lý index/records; submit khi feedback bị bỏ qua.
3. Chấm NFKC → lowercase → trim với acceptedRomaji; rỗng không tạo record. Không gắn wanakana vào ô romaji.
4. Record {itemId, raw, correct}; điểm tính từ records. Input focus mỗi câu; aria-live cho phản hồi. Retry chỉ lấy câu sai, không lặp trong phiên.

## Player

Provider mỏng quản lý một instance từ lib/audio-player.ts, dùng HTMLAudioElement hoặc SpeechSynthesis. AudioSession được key theo pathname để quay lại trang không giữ thông báo của trang trước. Khởi tạo player chỉ khi bấm nghe; dispose hủy timer/listener và chặn callback/play sau khi rời trang. Mỗi play tăng request token; callback cũ không được đổi trạng thái mới. Đổi hệ/chuyển trang/unmount phải dừng nguồn và timer. Timeout 10 giây, có retry.

Có hash thì dùng MP3; lỗi MP3 không âm thầm đổi giọng. Chưa có hash thì tìm voice lang ja/ja-JP, đợi voiceschanged có timeout; không dùng giọng ngôn ngữ khác. Có nhãn dự phòng; không có voice Nhật thì báo thiếu. Không tự phát khi mount. Bản phát hành cần MP3 đầy đủ, có kiểm duyệt phát âm.

## Pipeline audio

`npm run audio:plan` chỉ lập kế hoạch, không mạng/ghi cloud. Generate bắt buộc --generate và một trong --local/--r2, không có khóa thì dừng trước gọi mạng. --sync-db mới đồng bộ metadata Supabase; không tự chạy migration hoặc tạo bucket.

Canonical theo thứ tự text, locale, voice, rate, pitch, format, pipelineVersion. Hash là 32 ký tự hex đầu SHA-256. Mặc định ja-JP/NanamiNeural, rate/pitch 0%, MP3 mono 16kHz/64kbps. XML escape text trước đưa vào SSML. Region là mã, không nhận URL tùy ý.

Kiểm tra file local hoặc HEAD R2 theo hash trước TTS; chỉ 404/NotFound xem là thiếu, lỗi quyền/mạng phải dừng. TTS retry tối đa 3 lần với 429/5xx, timeout hữu hạn; lỗi khóa/validation không retry. Sau upload ghi manifest bằng rename file tạm. Asset đã tồn tại vẫn cập nhật mapping/metadata để phục hồi lần dừng trước. Chạy tuần tự; file lock ngăn hai script trên cùng workspace, chưa hỗ trợ job phân tán. Không ghi khóa vào log. Giai đoạn này chưa quét draft bài học.

## Database nền

Chuẩn bị profiles (FK auth.users), lessons, lesson_versions, audio_assets. FK phiên bản thuộc đúng bài; phiên bản đã xuất bản bất biến. RLS chặn anon; user chỉ đọc/sửa tên mình; teacher đọc/sửa draft mình sở hữu, đọc phiên bản mình sở hữu. Server mới được xuất bản/ghi metadata. Trigger tạo profile role student; không cấp update role hoặc published_version_id từ client. Không tự áp dụng lên cloud.

## Lỗi và kiểm chứng

| Lỗi | Hành vi |
|---|---|
| Dataset sai | validate:data/build thất bại |
| Query script lạ | Mặc định Hiragana |
| Không chọn nhóm | Không bắt đầu |
| Submit trùng | Chỉ ghi một kết quả |
| Audio lỗi/thiếu voice | Thông báo, retry; luyện vẫn hoạt động |
| Thiếu credentials | Exit khác 0, không ghi manifest giả |
| HEAD R2 lỗi quyền | Dừng, không sinh/upload bù |

Node test runner + tsx kiểm tra logic, dataset, hash. Playwright kiểm tra browser local, không gọi cloud thật. Typecheck, ESLint, production build kiểm tra nền; kết quả ghi tại checklist.

Nguồn kỹ thuật: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Azure TTS](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech), [R2](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).

## Quy ước phát triển

Theo [coding standards](../coding-standards.md), file/thư mục/route dùng tiếng Anh, props có interface riêng và event handler có tên. Thay đổi chuẩn hóa không đổi quy tắc chấm hoặc nội dung học. `npm run check` chạy formatter, ESLint, sinh route types mới, TypeScript và test; typegen tránh tham chiếu route cũ sau khi đổi tên.

## Kiểm chứng audio local

Browser kiểm tra lib/audio-player.ts bằng native HTMLAudioElement và MP3 silence fixture được tạo từ frame MPEG trong test. Fixture chỉ xác minh decode/trạng thái, không phải audio phát âm. Mô phỏng network 404, request bị treo, đổi chữ, dispose và voice thiết bị sẵn sàng muộn; không sửa manifest thật hoặc thêm route thử vào ứng dụng.

Pipeline được kiểm tra tại ranh giới storage/TTS/metadata/manifest bằng fake local: lỗi inspect dừng trước TTS; lỗi upload không publish; metadata hoặc ghi manifest lỗi sau upload thì chạy lại dùng asset đã có. Asset tồn tại nhưng thiếu dữ liệu bị báo lỗi để người vận hành kiểm tra, không tự ghi đè hay gọi TTS lại. Retry TTS tối đa 3 lần, retry-after tối đa 10 giây; 401 và timeout mạng không tự retry. Cấu hình/request timeout 30 giây được truyền vào fetch.

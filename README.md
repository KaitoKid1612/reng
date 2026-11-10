# Reng

Reng (tiếng chuông vào lớp) là web cho giáo viên dạy online: mở lớp, soạn slide, giao bài tập tự chấm và theo dõi học viên; buổi học video vẫn qua Google Meet. Pilot hiện tại dạy tiếng Nhật cho người Việt theo trình tự Minna no Nihongo, bằng bài mẫu tự biên soạn (không chép sách); luồng tiếng Trung vẫn chạy.

- Bản chạy thật: https://reng-class.vercel.app. Mỗi lần push `main` là một lần deploy.
- Hướng dẫn cho giáo viên và học viên: trang `/guide`.
- Tài liệu: [mục lục](docs/README.md) · [vận hành](docs/operations.md) · [kiến trúc](docs/02-architecture.md) · [quy ước code](docs/coding-standards.md) · [nhật ký thay đổi](docs/changelog.md).

## Chạy local

Cần Node.js 24 và npm.

```bash
npm ci
npm run dev   # http://127.0.0.1:3000
```

Không cần `.env` để học kana và đọc bài công khai. Lớp học, tài khoản và trình soạn cần Supabase: xem [chạy với Supabase local](docs/operations.md#chạy-với-supabase-local).

## Lệnh hay dùng

| Lệnh                                            | Việc                                                                  |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `npm run check`                                 | Định dạng, ESLint, TypeScript và unit test; chạy trước khi bàn giao   |
| `npm run build`                                 | Build production                                                      |
| `npm run test:e2e`, `npm run test:e2e:supabase` | E2E không cần dịch vụ / trên Supabase local; dừng `npm run dev` trước |

Các lệnh còn lại (audio, nạp nội dung, seed, migration) ở [vận hành › Lệnh npm](docs/operations.md#lệnh-npm).

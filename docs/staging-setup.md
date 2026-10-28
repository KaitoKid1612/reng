# Chuẩn bị staging và nghiệm thu dịch vụ

Không có credentials trong workspace tại thời điểm bắt đầu giai đoạn 2. Tài liệu này là hướng dẫn, chưa phải bằng chứng đã triển khai cloud.

1. Tạo Supabase project staging riêng, xác nhận đúng project trước khi áp dụng migrations trong supabase/migrations theo thứ tự. Giữ backup trước nâng schema. Không dùng project production cho kiểm thử.
2. Tạo tài khoản giảng viên bằng người vận hành, cấp profiles.role phía quản trị. Không cho đăng ký tự chọn teacher. Kiểm tra own profile, own lesson và API notes bằng hai tài khoản khác nhau.
3. Tạo Azure Speech resource, điền khóa/vùng trong .env.local ở máy vận hành. Chạy audio:plan trước generate; sinh kana vào local hoặc R2, nghe duyệt ký tự đứng riêng/trợ từ trước dùng với lớp.
4. Tạo R2 bucket/domain staging và khóa chỉ có quyền bucket đó; đặt public base audio. Không public transcript/metadata test. Kiểm tra cache headers, audio 404/retry và chạy lại không sinh trùng.
5. Đặt LESSON_SOURCE, Supabase URL/secret/publishable key và audio base trên hosting staging; xác minh gói hosting phù hợp sử dụng. Không đưa secret vào NEXT_PUBLIC_ hoặc git.
6. Publish một bài đã duyệt bằng script, kiểm tra reader/slide/presenter/print, quyền notes và nội dung version cũ. Không tự đổi nguồn sang local khi cloud lỗi.
7. Chrome/Safari thật, điện thoại 360px, máy chiếu 1280×720, mạng 4G: đo tải trang/phát audio và kiểm tra bàn phím, popup, fullscreen, PDF.
8. Một buổi dạy thử; ghi vấn đề vào checklist phase-1/phase-2. Chỉ nghiệm thu sau khi có bằng chứng, người phụ trách và cách khôi phục.

Chưa tạo tài khoản/bucket/project hoặc apply migration vào dịch vụ thật trong đợt local này.

import {
  BadgeCheck,
  Clock,
  Database,
  Eye,
  EyeOff,
  History,
  Lock,
  Scale,
  Server,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";

import { ContactEmail } from "@/components/legal/contact-email";
import { LegalDocument } from "@/components/legal/legal-document";
import { DATA_REQUEST_DAYS, LEGAL_OPERATOR } from "@/lib/legal";

import type { LegalSection, LegalSummaryPoint } from "@/components/legal/legal-document";
import type { Metadata } from "next";

const DESCRIPTION =
  "Reng thu thập dữ liệu gì, dùng vào việc gì, ai xem được, lưu bao lâu và cách bạn xem, sửa hoặc xóa dữ liệu của mình.";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Chính sách quyền riêng tư của Reng",
    description: DESCRIPTION,
    url: "/privacy",
  },
};

const SUMMARY: LegalSummaryPoint[] = [
  { Icon: EyeOff, text: "Không bán dữ liệu, không quảng cáo, không dùng công cụ theo dõi." },
  { Icon: Users, text: "Chỉ giáo viên của lớp bạn học mới xem được kết quả của bạn trong lớp đó." },
  { Icon: Trash2, text: "Học viên tự xóa tài khoản ở trang Tài khoản bất kỳ lúc nào." },
  {
    Icon: Server,
    text: "Dữ liệu nằm trên máy chủ ở Singapore; chúng tôi không giữ bản sao lưu riêng.",
  },
];

// Describes what the code stores and shares as of LEGAL_EFFECTIVE_DATE; a feature that collects,
// keeps or sends personal data differently must update this page in the same change.
const SECTIONS: LegalSection[] = [
  {
    id: "operator",
    title: "1. Ai chịu trách nhiệm",
    Icon: BadgeCheck,
    body: (
      <>
        <p>
          Reng do {LEGAL_OPERATOR} vận hành (sau đây gọi là “chúng tôi”). Mọi câu hỏi và yêu cầu về
          dữ liệu cá nhân gửi về <ContactEmail />.
        </p>
      </>
    ),
  },
  {
    id: "data-collected",
    title: "2. Dữ liệu chúng tôi thu thập",
    Icon: Database,
    body: (
      <>
        <ul>
          <li>
            <strong>Tài khoản:</strong> email, họ tên hiển thị, mật khẩu. Mật khẩu được dịch vụ đăng
            nhập lưu ở dạng mã hóa một chiều; chúng tôi không đọc được. Khi bạn đăng nhập bằng
            Google, chúng tôi nhận email và tên từ tài khoản Google, không nhận mật khẩu Google.
          </li>
          <li>
            <strong>Vai trò:</strong> học viên hoặc giáo viên, yêu cầu giảng dạy và trạng thái
            duyệt.
          </li>
          <li>
            <strong>Việc học:</strong> lớp đã tham gia, ngày vào và rời lớp, bài đã đánh dấu đọc
            xong, bài làm và câu trả lời (kể cả đề thi thử JLPT), điểm, lịch ôn thẻ từ vựng, sổ lỗi,
            các lần nhập mã lớp (để chặn việc dò mã).
          </li>
          <li>
            <strong>Việc dạy:</strong> bài học, slide và câu hỏi giáo viên soạn; lớp, lịch học, link
            Google Meet, nhật ký buổi dạy và điểm danh học viên.
          </li>
          <li>
            <strong>Lịch sử học tập nhập từ Google Sheet</strong> (chỉ khi giáo viên nhập): tên,
            email và kết quả cũ của học viên.
          </li>
          <li>
            <strong>Nhắc học</strong> (chỉ khi bạn bật): lựa chọn nhận nhắc. Với thông báo trên
            trình duyệt: địa chỉ nhận thông báo và khóa mã hóa mà trình duyệt cấp cho thiết bị, tên
            trình duyệt, ngày đã gửi nhắc. Với email nhắc học: nhật ký gửi thư (thời điểm gửi, đã mở
            thư hay chưa).
          </li>
          <li>
            <strong>Dữ liệu kỹ thuật:</strong> cookie giữ phiên đăng nhập; bộ nhớ của trình duyệt
            (localStorage) giữ bản nháp chưa lưu của bài đang soạn và bài đang làm, ghi nhớ trình
            duyệt này đã đăng nhập để hiện đúng menu, và các lựa chọn hiển thị (nền sáng hoặc tối,
            âm thanh khi trả lời, cách hiện câu hỏi) — các lựa chọn này nằm trên máy bạn, không gửi
            về máy chủ; nhật ký máy chủ của nhà cung cấp hạ tầng, có thể gồm địa chỉ IP và thời điểm
            truy cập.
          </li>
        </ul>
        <p>
          Reng không dùng công cụ phân tích truy cập hay quảng cáo, không thu phí trên trang và
          không lưu thông tin thanh toán.
        </p>
      </>
    ),
  },
  {
    id: "data-use",
    title: "3. Chúng tôi dùng dữ liệu để làm gì",
    Icon: Target,
    body: (
      <>
        <ul>
          <li>
            Vận hành lớp học: cho học viên vào lớp, đọc bài, làm bài, chấm điểm và ôn tập; cho giáo
            viên theo dõi tiến độ lớp của mình.
          </li>
          <li>
            Bảo mật và chống lạm dụng: giới hạn số lần nhập mã lớp, ghi nhật ký thao tác quản trị.
          </li>
          <li>
            Gửi thư cần thiết (xác nhận email, đặt lại mật khẩu) và nhắc học bằng thông báo trên
            trình duyệt hoặc email khi bạn bật.
          </li>
          <li>Hỗ trợ khi bạn liên hệ.</li>
        </ul>
        <p>Chúng tôi không bán dữ liệu và không dùng dữ liệu của bạn cho quảng cáo.</p>
      </>
    ),
  },
  {
    id: "who-sees",
    title: "4. Ai xem được dữ liệu của bạn",
    Icon: Eye,
    body: (
      <>
        <ul>
          <li>
            <strong>Giáo viên của lớp bạn tham gia:</strong> họ tên, email, kết quả, tiến độ và điểm
            danh của bạn trong lớp đó. Giáo viên khác không xem được.
          </li>
          <li>
            <strong>Học viên khác cùng lớp:</strong> không xem được email hay kết quả của bạn.
          </li>
          <li>
            <strong>Quản trị viên nền tảng:</strong> số liệu tổng hợp và thông tin tài khoản giáo
            viên để duyệt; trang quản trị không cho đọc bài làm hay email của học viên.
          </li>
          <li>
            <strong>Nhà cung cấp xử lý dữ liệu thay chúng tôi:</strong> Supabase (cơ sở dữ liệu và
            đăng nhập, máy chủ ở Singapore), Vercel (máy chủ web, khu vực Singapore), Google (khi
            bạn đăng nhập bằng Google), dịch vụ thông báo của trình duyệt bạn dùng (Google, Apple,
            Mozilla hoặc Microsoft; chỉ chuyển thông báo đã được mã hóa) và Resend (gửi email nhắc
            học, khi tính năng này được bật). Giọng đọc mẫu trong bài được tạo trước bằng Unreal
            Speech chỉ từ chữ trong bài học, không kèm dữ liệu của bạn. Dữ liệu được lưu trữ và xử
            lý ở ngoài Việt Nam.
          </li>
          <li>
            <strong>Cơ quan nhà nước</strong> khi pháp luật yêu cầu.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "5. Lưu trữ bao lâu",
    Icon: Clock,
    body: (
      <>
        <ul>
          <li>
            Khi bạn rời lớp hoặc được giáo viên xóa khỏi lớp, kết quả đã nộp vẫn được giữ để giáo
            viên xem báo cáo và để khôi phục nếu bạn vào lại lớp.
          </li>
          <li>
            Tài khoản và dữ liệu được giữ cho tới khi bạn xóa tài khoản. Khi xóa, họ tên, email,
            cách đăng nhập, cài đặt nhắc học, thiết bị nhận thông báo, nhật ký nhắc học đã gửi và
            lịch sử học được giáo viên nhập vào bị xóa ngay; bài đã nộp, điểm, lịch sử ôn và điểm
            danh ở lại trong thống kê của lớp dưới tên “Học viên đã xóa”, không còn gắn với bạn.
          </li>
          <li>
            Chúng tôi không tạo bản sao lưu riêng của cơ sở dữ liệu, nên dữ liệu đã xóa không còn ở
            bản sao nào do chúng tôi giữ.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "6. Quyền của bạn",
    Icon: Scale,
    body: (
      <>
        <p>
          Bạn có quyền được biết, xem, sửa dữ liệu của mình, yêu cầu xóa, rút lại sự đồng ý, phản
          đối hoặc yêu cầu hạn chế xử lý theo quy định pháp luật.
        </p>
        <ul>
          <li>
            Sửa họ tên và mật khẩu: <Link href="/settings/account">trang Tài khoản</Link>.
          </li>
          <li>
            Xem và tải dữ liệu của bạn: trang Tài khoản, mục Tải dữ liệu của tôi (một tệp JSON).
          </li>
          <li>
            Tắt nhắc học: <Link href="/settings/notifications">mục Nhắc học</Link> của trang Tài
            khoản, hoặc link cuối mỗi email nhắc học, bất kỳ lúc nào.
          </li>
          <li>
            Xóa tài khoản học viên: tự làm ở trang Tài khoản, mục Xóa tài khoản (gõ XÓA để xác
            nhận); không khôi phục được. Tài khoản giáo viên và quản trị viên có lớp, bài học phụ
            thuộc nên gửi yêu cầu về <ContactEmail />.
          </li>
          <li>
            Các yêu cầu khác: gửi về <ContactEmail />; chúng tôi trả lời trong vòng{" "}
            {DATA_REQUEST_DAYS} ngày kể từ khi nhận được thư.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "under-16",
    title: "7. Người chưa đủ 16 tuổi",
    Icon: Users,
    body: (
      <>
        <p>
          Reng không đặt giới hạn độ tuổi. Người chưa đủ 16 tuổi nên dùng Reng khi cha mẹ hoặc người
          giám hộ biết và đồng ý; cha mẹ có thể gửi thư về <ContactEmail /> để xem hoặc xóa tài
          khoản của con.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "8. Bảo mật",
    Icon: Lock,
    body: (
      <>
        <p>
          Kết nối được mã hóa (HTTPS). Cookie đăng nhập không đọc được bằng JavaScript trên trang.
          Quyền đọc dữ liệu được kiểm tra ở máy chủ và bằng chính sách truy cập theo từng dòng của
          cơ sở dữ liệu. Khóa truy cập dịch vụ chỉ nằm ở máy chủ, không gửi xuống trình duyệt.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "9. Thay đổi chính sách",
    Icon: History,
    body: (
      <>
        <p>
          Khi thay đổi quan trọng, chúng tôi thông báo trên trang trước khi áp dụng và ghi ngày có
          hiệu lực ở đầu chính sách. Đọc cùng <Link href="/terms">Điều khoản sử dụng</Link>.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      path="/privacy"
      title="Chính sách quyền riêng tư"
      lead="Reng thu thập những gì, dùng vào việc gì, ai xem được, lưu bao lâu và bạn có quyền gì với dữ liệu của mình."
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}

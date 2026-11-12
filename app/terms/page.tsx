import {
  Ban,
  CirclePause,
  Copyright,
  Gift,
  GraduationCap,
  Info,
  Mail,
  Presentation,
  Scale,
  ShieldAlert,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { ContactEmail } from "@/components/legal/contact-email";
import { LegalDocument } from "@/components/legal/legal-document";
import { LEGAL_OPERATOR } from "@/lib/legal";

import type { LegalSection, LegalSummaryPoint } from "@/components/legal/legal-document";
import type { Metadata } from "next";

const DESCRIPTION =
  "Điều khoản dùng Reng cho giáo viên và học viên: tài khoản, nội dung, hành vi không được phép, giới hạn trách nhiệm và liên hệ.";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: { title: "Điều khoản sử dụng Reng", description: DESCRIPTION, url: "/terms" },
};

const SUMMARY: LegalSummaryPoint[] = [
  { Icon: Gift, text: "Reng miễn phí và đang thử nghiệm; tính năng có thể thay đổi." },
  {
    Icon: Copyright,
    text: "Giáo viên giữ quyền với bài mình soạn và chịu trách nhiệm về nội dung đưa lên.",
  },
  { Icon: Ban, text: "Không dò mã lớp, không truy cập tài khoản hay dữ liệu của người khác." },
  {
    Icon: ShieldAlert,
    text: "Dịch vụ cung cấp theo hiện trạng, không có bản sao lưu riêng: hãy giữ bản riêng của tài liệu quan trọng.",
  },
];

const SECTIONS: LegalSection[] = [
  {
    id: "service",
    title: "1. Dịch vụ",
    Icon: Info,
    body: (
      <>
        <p>
          Reng là nền tảng lớp học online do {LEGAL_OPERATOR} vận hành (sau đây gọi là “chúng tôi”).
          Giáo viên tạo lớp, soạn bài, giao bài tập và theo dõi tiến độ; học viên vào lớp bằng mã
          của giáo viên; ai cũng dùng được phần tự học miễn phí. Reng đang ở giai đoạn thử nghiệm,
          tính năng có thể thay đổi.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "2. Tài khoản",
    Icon: UserRound,
    body: (
      <>
        <ul>
          <li>
            Thông tin đăng ký phải đúng; bạn giữ bí mật mật khẩu và chịu trách nhiệm về hoạt động
            dưới tài khoản của mình.
          </li>
          <li>
            Một tài khoản có thể vừa học vừa dạy. Quyền giảng dạy có thể cần quản trị viên duyệt.
          </li>
          <li>
            Báo ngay cho chúng tôi qua <ContactEmail /> nếu nghi tài khoản bị dùng trái phép.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "teachers",
    title: "3. Giáo viên",
    Icon: Presentation,
    body: (
      <>
        <ul>
          <li>
            Bạn chịu trách nhiệm về nội dung mình soạn và đưa lên. Không đưa lên nguyên văn sách,
            tranh, bản ghi âm hay tài liệu có bản quyền khi bạn không có quyền dùng. Bài mẫu của
            Reng do Reng tự biên soạn; bạn được sửa và dùng cho lớp của mình.
          </li>
          <li>Chỉ dùng dữ liệu học viên (họ tên, email, kết quả) cho việc dạy lớp đó.</li>
          <li>
            Link Google Meet và các dịch vụ bên ngoài bạn dùng trong buổi dạy thuộc tài khoản của
            bạn và theo điều khoản của nhà cung cấp đó.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "learners",
    title: "4. Học viên",
    Icon: GraduationCap,
    body: (
      <>
        <ul>
          <li>Tự làm bài tập và bài kiểm tra theo yêu cầu của giáo viên.</li>
          <li>Tôn trọng giáo viên và học viên khác.</li>
        </ul>
      </>
    ),
  },
  {
    id: "not-allowed",
    title: "5. Hành vi không được phép",
    Icon: Ban,
    body: (
      <>
        <ul>
          <li>
            Đăng hoặc phát tán nội dung vi phạm pháp luật, xúc phạm, quấy rối, lừa đảo hoặc spam.
          </li>
          <li>Dò mã lớp, truy cập trái phép vào tài khoản, lớp hay dữ liệu của người khác.</li>
          <li>
            Làm gián đoạn dịch vụ, dùng công cụ tự động để tải hàng loạt hoặc thu thập dữ liệu.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    title: "6. Nội dung và quyền sử dụng",
    Icon: Copyright,
    body: (
      <>
        <ul>
          <li>
            Giáo viên giữ quyền đối với bài mình soạn. Khi đưa bài lên, bạn cho phép Reng lưu trữ và
            hiển thị bài cho học viên trong lớp của bạn, cho giáo viên bạn chia sẻ, và cho mọi người
            nếu bạn đặt bài ở chế độ công khai, nhằm vận hành dịch vụ.
          </li>
          <li>
            Câu trả lời và kết quả của học viên được dùng để chấm điểm, ôn tập và báo cáo cho giáo
            viên của lớp.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "suspension",
    title: "7. Tạm dừng và chấm dứt",
    Icon: CirclePause,
    body: (
      <>
        <ul>
          <li>
            Chúng tôi có thể tạm dừng hoặc chấm dứt tài khoản vi phạm điều khoản, sau khi thông báo
            khi có thể.
          </li>
          <li>
            Bạn có thể ngừng dùng bất kỳ lúc nào và xóa tài khoản theo{" "}
            <Link href="/privacy">Chính sách quyền riêng tư</Link>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "liability",
    title: "8. Giới hạn trách nhiệm",
    Icon: ShieldAlert,
    body: (
      <>
        <p>
          Trong giai đoạn thử nghiệm, dịch vụ được cung cấp theo hiện trạng. Chúng tôi cố gắng giữ
          dịch vụ ổn định nhưng không bảo đảm dịch vụ không gián đoạn hay không mất dữ liệu, và hiện
          không giữ bản sao lưu riêng của dữ liệu. Giáo viên nên giữ bản riêng của tài liệu quan
          trọng. Chúng tôi không chịu trách nhiệm về dịch vụ của bên thứ ba như Google Meet.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    title: "9. Phí",
    Icon: Wallet,
    body: (
      <>
        <p>
          Reng hiện miễn phí. Nếu thu phí, chúng tôi sẽ thông báo trước và áp dụng điều khoản riêng
          cho phần có phí.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "10. Luật áp dụng",
    Icon: Scale,
    body: (
      <>
        <p>
          Điều khoản này theo pháp luật Việt Nam. Tranh chấp được ưu tiên giải quyết bằng thương
          lượng; nếu không được, đưa ra cơ quan có thẩm quyền theo quy định.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "11. Liên hệ và thay đổi",
    Icon: Mail,
    body: (
      <>
        <p>
          Liên hệ: <ContactEmail />. Khi điều khoản thay đổi quan trọng, chúng tôi thông báo trên
          trang trước khi áp dụng và ghi ngày có hiệu lực ở đầu trang.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      path="/terms"
      title="Điều khoản sử dụng"
      lead="Những điều giáo viên và học viên đồng ý khi dùng Reng: tài khoản, nội dung, việc không được làm và giới hạn trách nhiệm."
      summary={SUMMARY}
      sections={SECTIONS}
    />
  );
}

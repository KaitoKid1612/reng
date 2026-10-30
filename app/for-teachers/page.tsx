import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { absoluteUrl, serializeJsonLd, SITE_NAME } from "@/lib/site";

import type { Metadata } from "next";

const TITLE = "Dạy tiếng Nhật và tiếng Trung online cho học viên Việt Nam";
const DESCRIPTION =
  "Tạo lớp tiếng Nhật hoặc tiếng Trung, soạn slide theo mẫu, dạy qua Google Meet, giao bài tập tự chấm và theo dõi tiến độ từng học viên.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for-teachers" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/for-teachers" },
};

const FEATURES = [
  {
    title: "Lớp học riêng",
    body: "Mã tham gia cho từng lớp, giới hạn sĩ số tùy chọn và link Google Meet chỉ học viên trong lớp nhìn thấy.",
  },
  {
    title: "Soạn bài theo mẫu",
    body: "Tiếng Nhật có bài mẫu theo trình tự Minna no Nihongo để sửa theo lớp; tiếng Trung có mẫu chữ Hán, pinyin, nghĩa Việt và dựng slide từ bảng từ.",
  },
  {
    title: "Trình chiếu khi dạy",
    body: "Slide 16:9 để chia sẻ tab qua Google Meet, cửa sổ presenter có ghi chú riêng của giáo viên và bản in PDF.",
  },
  {
    title: "Bài tập tự chấm",
    body: "Trắc nghiệm và điền từ tiếng Nhật hoặc tiếng Trung; hỗ trợ gõ romaji sang kana, chấm pinyin đúng thanh điệu và phân biệt giản thể, phồn thể. Giáo viên duyệt đáp án trước khi giao.",
  },
  {
    title: "Theo dõi và nhắc học",
    body: "Báo cáo điểm theo lớp, câu sai nhiều, sổ lỗi và thẻ ôn tập của học viên; email nhắc bài khi học viên bật nhận thư.",
  },
  {
    title: "Chia sẻ với đồng nghiệp",
    body: "Chia sẻ đúng một phiên bản bài để đồng nghiệp xem hoặc sao chép; ghi chú riêng và dữ liệu lớp không đi kèm.",
  },
];

const STEPS = [
  "Tạo tài khoản và xác minh email.",
  "Gửi yêu cầu giảng dạy; trong giai đoạn thử nghiệm, quản trị viên mở quyền cho từng giáo viên.",
  "Tạo lớp, dán link Google Meet và soạn bài đầu tiên theo mẫu.",
  "Gửi mã lớp cho học viên, trình chiếu khi dạy và giao bài tập sau buổi học.",
];

const QUESTIONS = [
  {
    question: "Reng có thay thế Google Meet không?",
    answer:
      "Không. Bạn dạy video bằng Google Meet như thường lệ; Reng lưu link Meet của lớp và cung cấp slide, bài tập, chấm điểm và tiến độ học viên.",
  },
  {
    question: "Học viên cần cài ứng dụng không?",
    answer:
      "Không cần. Học viên dùng trình duyệt trên điện thoại hoặc máy tính, đăng ký bằng email rồi nhập mã lớp bạn gửi.",
  },
  {
    question: "Bài giảng của tôi có bị công khai không?",
    answer:
      "Không. Bài mới chỉ bạn và lớp được giao xem được. Công khai trên website hoặc chia sẻ cho đồng nghiệp là thao tác riêng do bạn chọn.",
  },
  {
    question: "Tôi có thể dạy tiếng Nhật trên Reng không?",
    answer:
      "Có. Pilot hiện tại ưu tiên tiếng Nhật cho người Việt theo trình tự Minna no Nihongo. Bạn có thể tạo bài 11 từ mẫu tự biên soạn, sửa rồi xuất bản riêng cho lớp; luồng tiếng Trung vẫn được hỗ trợ.",
  },
];

export default function ForTeachersPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: absoluteUrl("/for-teachers"),
        inLanguage: "vi-VN",
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
      },
      {
        "@type": "FAQPage",
        mainEntity: QUESTIONS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
  return (
    <article className="landing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <section className="landing-hero">
        <p className="hero-intro">Dành cho giáo viên tiếng Nhật và tiếng Trung</p>
        <h1>{TITLE}</h1>
        <p className="hero-description">
          Reng gom lớp học, slide, bài tập và tiến độ vào một nơi để bạn tập trung vào giờ dạy qua
          Google Meet. Soạn một bài nhập môn chỉ từ một mục tiêu nhỏ và bảng từ bạn đã có.
        </p>
        <div className="button-row">
          <Link href="/sign-up/teacher" className={buttonVariants()}>
            Đăng ký giáo viên
          </Link>
          <Link href="/lessons" className={buttonVariants({ variant: "outline" })}>
            Xem bài học mẫu
          </Link>
        </div>
      </section>
      <section className="landing-section" aria-labelledby="features-title">
        <h2 id="features-title">Bạn làm được gì trên Reng</h2>
        <div className="landing-features">
          {FEATURES.map((feature) => (
            <article key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-section" aria-labelledby="steps-title">
        <h2 id="steps-title">Bắt đầu trong bốn bước</h2>
        <ol className="landing-steps">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section className="landing-section" aria-labelledby="faq-title">
        <h2 id="faq-title">Câu hỏi thường gặp</h2>
        <dl className="landing-faq">
          {QUESTIONS.map((item) => (
            <div key={item.question}>
              <dt>{item.question}</dt>
              <dd>{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="landing-section landing-cta">
        <h2>Sẵn sàng mở lớp đầu tiên?</h2>
        <p>Đăng ký bằng email, gửi yêu cầu giảng dạy và bắt đầu soạn bài sau khi được mở quyền.</p>
        <Link href="/sign-up/teacher" className={buttonVariants()}>
          Đăng ký giáo viên
        </Link>
      </section>
    </article>
  );
}

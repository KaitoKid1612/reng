import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { hasPublicLessons } from "@/lib/lesson-repository";
import { absoluteUrl, serializeJsonLd, SITE_NAME } from "@/lib/site";

import type { Metadata } from "next";

const TITLE = "Mở lớp dạy online cho học viên Việt Nam";
const DESCRIPTION =
  "Mở lớp riêng, soạn slide theo mẫu, dạy qua Google Meet, giao bài tập tự chấm và theo dõi tiến độ từng học viên.";

// Rebuilt at most hourly, and right away when a teacher changes who can read a lesson, so the
// sample button never leads to an empty catalog.
export const revalidate = 3600;

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
    body: "Bắt đầu từ bài mẫu hoặc khung bài có sẵn, sửa theo lớp rồi xuất bản. Một bài dùng cho trình chiếu, trang đọc và bài tập.",
  },
  {
    title: "Trình chiếu khi dạy",
    body: "Slide 16:9 để chia sẻ tab qua Google Meet, cửa sổ presenter có ghi chú riêng của giáo viên và bản in PDF.",
  },
  {
    title: "Bài tập tự chấm",
    body: "Trắc nghiệm, điền đáp án, sắp xếp câu, nghe và đọc hiểu. Bạn duyệt đáp án trước khi giao, và sau khi chấm vẫn chấp nhận thêm được đáp án đúng.",
  },
  {
    title: "Theo dõi và nhắc học",
    body: "Báo cáo điểm theo lớp, câu sai nhiều, bài luyện hằng ngày tự giao, sổ lỗi và thẻ ôn tập của học viên; email nhắc bài khi học viên bật nhận thư.",
  },
  {
    title: "Chia sẻ với đồng nghiệp",
    body: "Chia sẻ đúng một phiên bản bài để đồng nghiệp xem hoặc sao chép; ghi chú riêng và dữ liệu lớp không đi kèm.",
  },
];

// Classes, slides, assignments and reports are shared by every subject; authoring and grading
// are built per subject, so the page says which subjects have them today.
const SUBJECTS = [
  {
    title: "Tiếng Nhật",
    body: "Bài mẫu tự biên soạn theo trình tự Minna no Nihongo để sửa theo lớp; học viên gõ romaji, hệ thống đổi sang kana.",
  },
  {
    title: "Tiếng Trung",
    body: "Soạn từ bảng chữ Hán – pinyin – nghĩa Việt và dựng slide tự động; chấm pinyin đúng thanh điệu, phân biệt giản thể và phồn thể.",
  },
];

const STEPS = [
  "Tạo tài khoản (nếu Reng gửi thư xác nhận, mở thư và bấm liên kết).",
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
    question: "Reng dạy được những môn nào?",
    answer:
      "Hiện có công cụ soạn bài và chấm điểm cho tiếng Nhật và tiếng Trung. Lớp học, trình chiếu, giao bài và theo dõi tiến độ được làm chung để bổ sung môn khác về sau.",
  },
];

// Without a public lesson to open, the guide shows how teaching works instead of an empty list.
async function loadHasSamples() {
  try {
    return await hasPublicLessons();
  } catch {
    return false;
  }
}

export default async function ForTeachersPage() {
  const hasSamples = await loadHasSamples();
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
        <p className="hero-intro">Dành cho giáo viên</p>
        <h1>{TITLE}</h1>
        <p className="hero-description">
          Reng gom lớp học, slide, bài tập và tiến độ vào một nơi để bạn tập trung vào giờ dạy qua
          Google Meet. Bắt đầu từ bài mẫu hoặc tự soạn, rồi trình chiếu, giao bài và xem kết quả
          từng học viên.
        </p>
        <div className="button-row">
          <Link href="/sign-up/teacher" className={buttonVariants()}>
            Đăng ký giáo viên
          </Link>
          {hasSamples ? (
            <Link href="/lessons" className={buttonVariants({ variant: "outline" })}>
              Xem bài học mẫu
            </Link>
          ) : (
            <Link href="/guide#teacher-title" className={buttonVariants({ variant: "outline" })}>
              Xem hướng dẫn cho giáo viên
            </Link>
          )}
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
      <section className="landing-section" aria-labelledby="subjects-title">
        <h2 id="subjects-title">Môn học hiện có</h2>
        <p className="muted">
          Lớp học, trình chiếu, giao bài và theo dõi tiến độ dùng chung; công cụ soạn bài và chấm
          điểm làm riêng cho từng môn.
        </p>
        <div className="landing-features">
          {SUBJECTS.map((subject) => (
            <article key={subject.title}>
              <h3>{subject.title}</h3>
              <p>{subject.body}</p>
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

import Link from "next/link";

import { HomeAgenda } from "@/components/classroom/home-agenda";
import { buttonVariants } from "@/components/ui/button";
import {
  absoluteUrl,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
  alternates: { canonical: "/" },
};

// A class on Reng in the order a lesson happens; nothing here assumes a subject.
const CLASS_STEPS = [
  { title: "Trước buổi học", body: "Học viên đọc bài và xem slide giáo viên đã mở cho lớp." },
  {
    title: "Trong buổi học",
    body: "Giáo viên trình chiếu qua Google Meet; buổi sau dạy tiếp đúng chỗ.",
  },
  {
    title: "Sau buổi học",
    body: "Làm bài tập tự chấm, xem điểm ngay khi nộp hoặc sau hạn (tùy giáo viên đặt) và ôn lại câu sai.",
  },
] as const;

const FEATURES = [
  {
    title: "Trình chiếu khi dạy",
    body: "Slide 16:9 để chia sẻ qua Google Meet, ghi chú riêng cho giáo viên và nhật ký từng buổi dạy.",
  },
  {
    title: "Bài tập tự chấm",
    body: "Trắc nghiệm, điền đáp án, sắp xếp, nghe hiểu. Học viên làm trên điện thoại và biết kết quả ngay.",
  },
  {
    title: "Theo dõi và ôn lại",
    body: "Giáo viên thấy câu cả lớp sai nhiều; học viên có bài luyện hằng ngày, sổ lỗi và lịch ôn tập.",
  },
] as const;

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description: SITE_DESCRIPTION,
      },
      { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/"), inLanguage: "vi-VN" },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <HomeAgenda />
      <section className="home-hero">
        <div className="hero-copy">
          <p className="hero-intro">Dạy và học online trên Reng</p>
          <h1>
            Vào lớp,
            <br />
            học mỗi ngày.
          </h1>
          <p className="hero-description">
            Giáo viên mở lớp, dạy qua Google Meet và giao bài tập tự chấm. Học viên vào lớp bằng mã
            để đọc bài, làm bài và ôn lại câu sai, ngay trên điện thoại.
          </p>
          <div className="button-row">
            <Link href="/join-class" className={buttonVariants()}>
              Vào lớp bằng mã
            </Link>
            <Link href="/classes" className={buttonVariants({ variant: "outline" })}>
              Mở lớp của tôi
            </Link>
          </div>
          <p className="hero-note">
            <Link href="/self-study">Tự học miễn phí, chưa cần tài khoản</Link>
          </p>
          <p className="hero-note">
            Lần đầu vào lớp? Mở link mời hoặc nhập mã, tạo tài khoản học viên rồi bấm Vào lớp.
          </p>
        </div>
        <div className="hero-paper">
          <p className="paper-caption">Một buổi học trên Reng</p>
          <ol className="class-steps">
            {CLASS_STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="class-step-number writing-square" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <p className="class-step-title">{step.title}</p>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="small muted">Chuông reng là vào lớp.</p>
        </div>
      </section>
      <section className="home-start" aria-labelledby="start-title">
        <h2 id="start-title">Bạn muốn bắt đầu từ đâu?</h2>
        <div className="learning-columns">
          <article>
            <h3>Tôi có mã lớp</h3>
            <p>
              Nhập mã giáo viên gửi. Sau khi đăng nhập, bạn trở lại trang vào lớp với mã đã nhập.
            </p>
            <Link href="/join-class" className={buttonVariants({ variant: "outline" })}>
              Nhập mã lớp
            </Link>
          </article>
          <article>
            <h3>Tôi muốn giảng dạy</h3>
            <p>
              Mở lớp riêng, soạn bài và slide, dạy qua Google Meet rồi giao bài tập tự chấm. Reng
              cho bạn biết ai đã nộp, ai cần nhắc.
            </p>
            <div className="button-row">
              <Link href="/for-teachers" className={buttonVariants({ variant: "outline" })}>
                Tìm hiểu cách dạy trên Reng
              </Link>
              <Link href="/sign-up/teacher">Đăng ký giáo viên</Link>
            </div>
          </article>
          <article>
            <h3>Tôi muốn tự học</h3>
            <p>Đọc bài học công khai và luyện tập với công cụ của từng môn, chưa cần tài khoản.</p>
            <div className="button-row">
              <Link href="/self-study" className={buttonVariants({ variant: "outline" })}>
                Xem các môn tự học
              </Link>
              <Link href="/lessons">Bài học công khai</Link>
            </div>
          </article>
        </div>
      </section>
      <section className="home-features" aria-labelledby="features-title">
        <h2 id="features-title">Mọi việc của lớp học, ở một nơi</h2>
        <div className="learning-columns">
          {FEATURES.map((feature) => (
            <article key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

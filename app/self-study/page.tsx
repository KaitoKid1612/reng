import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SELF_STUDY_SUBJECTS } from "@/lib/self-study";

import type { Metadata } from "next";

const DESCRIPTION =
  "Bài học công khai và công cụ luyện tập theo từng môn trên Reng, dùng miễn phí và chưa cần tài khoản.";

export const metadata: Metadata = {
  title: "Tự học miễn phí",
  description: DESCRIPTION,
  alternates: { canonical: "/self-study" },
  openGraph: { title: "Tự học miễn phí trên Reng", description: DESCRIPTION, url: "/self-study" },
};

export default function SelfStudyPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Tự học miễn phí</h1>
          <p>
            Bài học công khai và công cụ luyện tập của từng môn, chưa cần tài khoản. Bài của lớp bạn
            nằm ở <Link href="/classes">Lớp của tôi</Link>.
          </p>
        </div>
        <Link href="/join-class" className={buttonVariants({ variant: "outline" })}>
          Vào lớp bằng mã
        </Link>
      </div>
      <section className="study-subject" aria-labelledby="public-lessons-title">
        <h2 id="public-lessons-title">Bài học công khai</h2>
        <p>Đọc bài và xem slide các bài giáo viên đã công khai trên Reng.</p>
        <Link href="/lessons" className={buttonVariants()}>
          Xem bài học công khai
        </Link>
      </section>
      {SELF_STUDY_SUBJECTS.map((subject) => (
        <section
          key={subject.id}
          className="study-subject"
          aria-labelledby={`subject-${subject.id}`}
        >
          <h2 id={`subject-${subject.id}`}>{subject.name}</h2>
          <p>{subject.summary}</p>
          <div className="landing-features">
            {subject.tools.map((tool) => (
              <article key={tool.href}>
                <h3>
                  <Link href={tool.href}>{tool.label}</Link>
                </h3>
                <p>{tool.description}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

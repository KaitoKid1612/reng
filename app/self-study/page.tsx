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
        <p>
          Đọc bài, xem slide, lật flashcard từ vựng và luyện nghe ở các bài giáo viên đã công khai
          trên Reng.
        </p>
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
          <ul className="link-cards tool-cards">
            {subject.tools.map((tool, index) => {
              // The card is one link named by its title; the line of help is its description.
              const id = `${subject.id}-tool-${index}`;
              return (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="link-card"
                    aria-labelledby={`${id}-title`}
                    aria-describedby={`${id}-description`}
                  >
                    <span className="tool-glyph" lang={tool.glyph.lang} aria-hidden="true">
                      {tool.glyph.text}
                    </span>
                    <span id={`${id}-title`} className="link-card-title">
                      {tool.label}
                    </span>
                    <span id={`${id}-description`} className="small muted">
                      {tool.description}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

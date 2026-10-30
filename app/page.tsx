import Link from "next/link";

import { HomeAgenda } from "@/components/classroom/home-agenda";
import { buttonVariants } from "@/components/ui/button";
import { kanaItems } from "@/lib/data";
import { absoluteUrl, serializeJsonLd, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Reng — Lớp học ngoại ngữ online cho giáo viên và học viên" },
  alternates: { canonical: "/" },
};

const homeKanaSamples = kanaItems
  .filter((item) => item.script === "hiragana" && item.group === "basic")
  .slice(0, 9);

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
      <section className="home-hero">
        <div className="hero-copy">
          <p className="hero-intro">Học và dạy ngoại ngữ trên Reng</p>
          <h1>
            Vào lớp,
            <br />
            học mỗi ngày.
          </h1>
          <p className="hero-description">
            Vào lớp bằng mã giáo viên gửi để đọc bài, làm bài tập và ôn lại câu sai. Nếu mới bắt đầu
            tiếng Nhật, bạn có thể tự học bảng chữ cái miễn phí, chưa cần tài khoản.
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
            <Link href="/kana">Tự học tiếng Nhật, chưa cần tài khoản</Link>
          </p>
          <p className="hero-note">
            Lần đầu vào lớp? Mở link mời hoặc nhập mã, tạo tài khoản học viên rồi bấm Vào lớp.
          </p>
        </div>
        <div className="hero-paper" aria-label="Mẫu chữ Hiragana: a, i, u, e, o, ka, ki, ku, ke">
          <div className="paper-caption">
            Hiragana <span lang="ja">ひらがな</span>
          </div>
          <div className="sample-grid">
            {homeKanaSamples.map((item) => (
              <div key={item.id} className="sample-cell writing-square">
                <span className="kana-font" lang="ja">
                  {item.kana}
                </span>
                <span>{item.acceptedRomaji[0]}</span>
              </div>
            ))}
          </div>
          <p className="small muted">Một âm, một ô. Cứ thế bắt đầu.</p>
        </div>
      </section>
      <HomeAgenda />
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
            <h3>Tôi muốn tự học tiếng Nhật</h3>
            <p>Học Hiragana, Katakana và luyện đọc từng phiên ngắn. Không cần tạo tài khoản.</p>
            <div className="button-row">
              <Link href="/kana" className={buttonVariants({ variant: "outline" })}>
                Học bảng chữ cái
              </Link>
              <Link href="/kana/practice">Luyện đọc ngay</Link>
              <Link href="/lessons">Xem bài học mẫu</Link>
            </div>
          </article>
          <article>
            <h3>Tôi muốn giảng dạy</h3>
            <p>
              Mở lớp tiếng Nhật hoặc tiếng Trung, soạn slide, dạy qua Google Meet và giao bài tập tự
              chấm. Pilot tiếng Nhật có bài mẫu theo trình tự Minna no Nihongo.
            </p>
            <div className="button-row">
              <Link href="/for-teachers" className={buttonVariants({ variant: "outline" })}>
                Tìm hiểu cách dạy trên Reng
              </Link>
              <Link href="/sign-up/teacher">Đăng ký giáo viên</Link>
            </div>
          </article>
        </div>
      </section>
      <section className="home-learning" aria-labelledby="learning-title">
        <h2 id="learning-title">Học theo nhịp của bạn</h2>
        <div className="learning-columns">
          <article>
            <h3>Nhìn để nhận mặt chữ</h3>
            <p>Hai bảng chữ đầy đủ, từ âm cơ bản đến âm ghép. Chọn một chữ để xem cách đọc.</p>
          </article>
          <article>
            <h3>Nghe để quen với âm</h3>
            <p>Bấm vào từng chữ để nghe. Có thể nghe lại bất cứ khi nào bạn cần.</p>
          </article>
          <article>
            <h3>Thử để nhớ lâu hơn</h3>
            <p>Luyện từng phiên ngắn. Xem ngay kết quả và quay lại những chữ còn nhầm.</p>
          </article>
        </div>
      </section>
    </>
  );
}

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
          <p className="hero-intro">Tiếng Nhật cho người mới bắt đầu</p>
          <h1>
            Mỗi ngày,
            <br />
            thêm một chữ mới.
          </h1>
          <p className="hero-description">
            Làm quen với Hiragana và Katakana. Nhìn chữ, nghe cách đọc rồi tự thử lại — bắt đầu từ
            những điều nhỏ nhất.
          </p>
          <div className="button-row">
            <Link href="/kana" className={buttonVariants()}>
              Học bảng chữ cái
            </Link>
            <Link href="/kana/practice" className={buttonVariants({ variant: "outline" })}>
              Luyện đọc ngay
            </Link>
          </div>
          <p className="hero-note">Mở ra là học. Bạn chưa cần tạo tài khoản.</p>
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
      <section className="home-teachers" aria-labelledby="teachers-title">
        <h2 id="teachers-title">Bạn là giáo viên tiếng Trung?</h2>
        <p className="hero-description">
          Tạo lớp riêng, soạn slide từ bảng chữ Hán – pinyin – nghĩa Việt, dạy qua Google Meet và
          giao bài tập tự chấm cho học viên.
        </p>
        <div className="button-row">
          <Link href="/for-teachers" className={buttonVariants()}>
            Tìm hiểu cách dạy trên Reng
          </Link>
          <Link href="/sign-up/teacher" className={buttonVariants({ variant: "outline" })}>
            Đăng ký giáo viên
          </Link>
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

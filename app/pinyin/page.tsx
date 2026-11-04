import Link from "next/link";

import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { buttonVariants } from "@/components/ui/button";
import { PINYIN_FINAL_GROUPS, PINYIN_INITIALS, PINYIN_TONES } from "@/lib/pinyin-study";

import type { Metadata } from "next";

const DESCRIPTION =
  "Bảng pinyin cho người Việt mới học tiếng Trung: bốn thanh điệu và thanh nhẹ, thanh mẫu, vận mẫu, cách đặt dấu thanh và cách gõ số thanh.";

export const metadata: Metadata = {
  title: "Bảng pinyin tiếng Trung",
  description: DESCRIPTION,
  alternates: { canonical: "/pinyin" },
  openGraph: {
    title: "Bảng pinyin tiếng Trung trên Reng",
    description: DESCRIPTION,
    url: "/pinyin",
  },
};

export default function PinyinPage() {
  return (
    <>
      <SubjectStudyNav subjectId="chinese" currentHref="/pinyin" />
      <div className="page-heading">
        <div>
          <h1>Bảng pinyin</h1>
          <p>
            Pinyin ghi cách đọc chữ Hán bằng chữ Latinh. Mỗi âm tiết gồm thanh mẫu (phụ âm đầu), vận
            mẫu (phần vần) và thanh điệu. Cách so sánh với tiếng Việt dưới đây chỉ là gần đúng để
            bắt đầu; hãy nghe giáo viên đọc mẫu.
          </p>
        </div>
        <Link href="/pinyin/practice" className={buttonVariants()}>
          Luyện gõ pinyin
        </Link>
      </div>
      <section className="section-block" aria-labelledby="tones-title">
        <h2 id="tones-title">Thanh điệu</h2>
        <table className="data-table pinyin-tones">
          <thead>
            <tr>
              <th scope="col">Thanh</th>
              <th scope="col">Ví dụ</th>
              <th scope="col">Cách đọc</th>
            </tr>
          </thead>
          <tbody>
            {PINYIN_TONES.map((tone) => (
              <tr key={tone.tone}>
                <td data-label="Thanh">{tone.tone ? `Thanh ${tone.tone}` : "Thanh nhẹ"}</td>
                <td data-label="Ví dụ">
                  <span lang="zh-Latn-pinyin" className="pinyin-syllable">
                    {tone.syllable}
                  </span>{" "}
                  <span lang="zh-Hans">{tone.hanzi}</span> ({tone.meaning})
                </td>
                <td data-label="Cách đọc">{tone.hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="section-block" aria-labelledby="initials-title">
        <h2 id="initials-title">Thanh mẫu (phụ âm đầu)</h2>
        <ul className="pinyin-grid">
          {PINYIN_INITIALS.map((initial) => (
            <li key={initial.sound}>
              <span lang="zh-Latn-pinyin" className="pinyin-syllable">
                {initial.sound}
              </span>
              <span className="small">{initial.hint}</span>
            </li>
          ))}
        </ul>
        <p className="small muted">
          y và w đứng đầu âm tiết thay cho i và u: yi, wu, yu (ü). Sau j, q, x, y, ü viết thành u:
          qù (đi), yú (cá).
        </p>
      </section>
      <section className="section-block" aria-labelledby="finals-title">
        <h2 id="finals-title">Vận mẫu (phần vần)</h2>
        {PINYIN_FINAL_GROUPS.map((group) => (
          <div key={group.title} className="pinyin-final-group">
            <h3>{group.title}</h3>
            <p lang="zh-Latn-pinyin" className="pinyin-finals">
              {group.finals.join("  ·  ")}
            </p>
          </div>
        ))}
      </section>
      <section className="section-block" aria-labelledby="marks-title">
        <h2 id="marks-title">Đặt dấu thanh và gõ trên Reng</h2>
        <ul>
          <li>
            Dấu đặt trên a hoặc e nếu có (hǎo, xiè); với ou đặt trên o (gǒu); còn lại đặt trên
            nguyên âm cuối (shuǐ, liù).
          </li>
          <li>
            Bàn phím không có dấu thì gõ số thanh ngay sau âm tiết: ni3 hao3 → nǐ hǎo; v thay cho ü:
            nv3 → nǚ; số 5 hoặc 0 là thanh nhẹ: xie4xie5 → xièxie.
          </li>
          <li>
            Cách gõ này dùng được cả trong bài tập của lớp tiếng Trung, ở các ô yêu cầu nhập pinyin.
          </li>
        </ul>
      </section>
    </>
  );
}

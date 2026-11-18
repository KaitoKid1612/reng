import Link from "next/link";

import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { buttonVariants } from "@/components/ui/button";
import { summarizeHanVietRules } from "@/lib/han-viet-rules";
import { KANJI_LEVEL_DATA } from "@/lib/kanji-data";

import type { HanVietRuleSummary } from "@/lib/han-viet-rules";
import type { JlptKanji } from "@/lib/jlpt-kanji";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đoán âm On của kanji từ âm Hán Việt",
  description:
    "Quy luật giữa âm Hán Việt và âm On cho người Việt học kanji N5, N4: âm cuối -c, -t, -p, -ng, -n và phụ âm đầu, kèm tỉ lệ đúng và ngoại lệ.",
  alternates: { canonical: "/jlpt-kanji/han-viet" },
};

const EXAMPLE_COUNT = 4;

function KanjiReading({ item }: { item: JlptKanji }) {
  return (
    <span className="han-viet-example">
      <Link
        href={`/jlpt-kanji/${KANJI_LEVEL_DATA.n5.items.includes(item) ? "n5" : "n4"}#kanji-${item.kanji}`}
        lang="ja"
      >
        {item.kanji}
      </Link>{" "}
      <span className="han-viet-syllable">{item.hanViet}</span> →{" "}
      <span lang="ja">{item.on.join("・")}</span>
    </span>
  );
}

function RuleTable({ rows, caption }: { rows: HanVietRuleSummary[]; caption: string }) {
  return (
    <div className="han-viet-table-wrap">
      <table className="han-viet-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Hán Việt</th>
            <th scope="col">Âm On</th>
            <th scope="col">Ví dụ</th>
            <th scope="col">Đúng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rule, followers, exceptions }) => (
            <tr key={`${rule.part}-${rule.id}`}>
              <th scope="row">{rule.hanViet}</th>
              <td>
                <span lang="ja">{rule.on}</span>
              </td>
              <td>
                <ul className="han-viet-examples">
                  {followers.slice(0, EXAMPLE_COUNT).map((item) => (
                    <li key={item.kanji}>
                      <KanjiReading item={item} />
                    </li>
                  ))}
                </ul>
                {exceptions.length > 0 && (
                  <p className="han-viet-exceptions">
                    Ngoại lệ:{" "}
                    {exceptions.map((item, index) => (
                      <span key={item.kanji}>
                        {index > 0 && ", "}
                        <KanjiReading item={item} />
                      </span>
                    ))}
                  </p>
                )}
              </td>
              <td className="han-viet-rate">
                {followers.length}/{followers.length + exceptions.length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A Vietnamese learner's shortcut: the Hán Việt reading predicts the start and the end of the
// on reading. The rates are counted on Reng's N5 and N4 kanji at build time.
export default function HanVietRulesPage() {
  const items = [...KANJI_LEVEL_DATA.n5.items, ...KANJI_LEVEL_DATA.n4.items];
  const summaries = summarizeHanVietRules(items).filter(
    (summary) => summary.followers.length + summary.exceptions.length > 0,
  );
  const endings = summaries.filter((summary) => summary.rule.part === "ending");
  const starts = summaries.filter((summary) => summary.rule.part === "start");
  return (
    <>
      <SubjectStudyNav subjectId="japanese" currentHref="/jlpt-kanji/n5" />
      <div className="page-heading">
        <div>
          <h1>Đoán âm On từ âm Hán Việt</h1>
          <p>
            Âm Hán Việt và âm On của kanji cùng gốc tiếng Hán cổ, nên biết âm Hán Việt là đoán được
            đuôi và đầu của âm On. Cột Đúng đếm trên {items.length} chữ N5 và N4 của Reng; chữ không
            theo quy luật được ghi ở dòng Ngoại lệ.
          </p>
        </div>
        <Link href="/jlpt-kanji/n5" className={buttonVariants({ variant: "outline" })}>
          Về danh sách kanji
        </Link>
      </div>

      <section className="han-viet-section" aria-labelledby="endings">
        <h2 id="endings">1. Âm cuối: chắc nhất, học trước</h2>
        <p>
          Nhìn chữ cái cuối của âm Hán Việt (bỏ dấu thanh). Quy luật này còn cho biết âm On có
          trường âm hay không, đúng chỗ đề <span lang="ja">もんだい1</span> hay gài bẫy (
          <span lang="ja">せんしゅう</span> hay <span lang="ja">せんしゅ</span>): CHU có âm cuối là
          nguyên âm nhưng 週 vẫn là <span lang="ja">しゅう</span>, nên vẫn phải nhớ từ.
        </p>
        <RuleTable rows={endings} caption="Âm cuối Hán Việt → đuôi âm On" />
      </section>

      <section className="han-viet-section" aria-labelledby="starts">
        <h2 id="starts">2. Phụ âm đầu: đoán hàng kana</h2>
        <p>
          Phụ âm đầu cho biết âm On bắt đầu bằng hàng kana nào. Âm đục hay trong (
          <span lang="ja">か</span> hay <span lang="ja">が</span>) thì không đoán được: 学 HỌC là{" "}
          <span lang="ja">がく</span>, 高 CAO là <span lang="ja">こう</span>. Chưa đưa vào bảng các
          phụ âm d, v, g, n, r vì trên dữ liệu chúng không theo một hàng ổn định.
        </p>
        <RuleTable rows={starts} caption="Phụ âm đầu Hán Việt → hàng kana đầu âm On" />
      </section>

      <section className="han-viet-section" aria-labelledby="joining">
        <h2 id="joining">3. Khi ghép hai chữ</h2>
        <ul className="han-viet-joining">
          <li>
            Đuôi <span lang="ja">つ</span>/<span lang="ja">ち</span> (âm cuối -t, -p) gặp âm k, s,
            t, h phía sau thường thành <span lang="ja">っ</span>, và h thành p:{" "}
            <span lang="ja">一回 いっかい</span>, <span lang="ja">一歩 いっぽ</span>,{" "}
            <span lang="ja">出発 しゅっぱつ</span>, <span lang="ja">八百 はっぴゃく</span>.
          </li>
          <li>
            Đuôi <span lang="ja">く</span> (âm cuối -c) chỉ hay thành <span lang="ja">っ</span>{" "}
            trước âm k: <span lang="ja">学校 がっこう</span>, <span lang="ja">六百 ろっぴゃく</span>
            ; còn <span lang="ja">学生</span> vẫn là <span lang="ja">がくせい</span>.
          </li>
          <li>
            Sau <span lang="ja">ん</span> (âm cuối -n, -m), âm h hay thành b hoặc p, âm s có khi
            thành z: <span lang="ja">三百 さんびゃく</span>, <span lang="ja">三千 さんぜん</span>.
          </li>
        </ul>
        <p>
          Đây là quy luật thường gặp, không phải luật tuyệt đối. Khi học từ mới, đoán trước bằng quy
          luật rồi đối chiếu với cách đọc thật: chữ nào lệch thì đó là chữ cần nhớ kỹ.
        </p>
      </section>
    </>
  );
}

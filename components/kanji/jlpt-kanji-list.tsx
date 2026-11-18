import Link from "next/link";

import { JapaneseText } from "@/components/lessons/japanese-text";

import type { JlptKanji, JlptKanjiLevelData } from "@/lib/jlpt-kanji";

interface JlptKanjiListProps {
  data: JlptKanjiLevelData;
  practiceHref: string;
}

function KanjiCard({ item }: { item: JlptKanji }) {
  return (
    <li className="kanji-card" id={`kanji-${item.kanji}`}>
      <div className="kanji-card-head">
        <span className="kanji-glyph" lang="ja">
          {item.kanji}
        </span>
        <div className="kanji-card-title">
          <p className="kanji-han-viet">{item.hanViet}</p>
          <p className="kanji-meaning">{item.meaning}</p>
        </div>
        {item.paper && <span className="kanji-paper-badge">Đã ra đề</span>}
      </div>
      <dl className="kanji-readings">
        <div>
          <dt>Âm On</dt>
          <dd lang="ja">{item.on.join("、") || "—"}</dd>
        </div>
        <div>
          <dt>Âm Kun</dt>
          <dd lang="ja">{item.kun.join("、") || "—"}</dd>
        </div>
      </dl>
      <ul className="kanji-words" aria-label={`Từ có chữ ${item.kanji}`}>
        {item.words.map((word) => (
          <li key={word.written}>
            <span lang="ja" className="kanji-word">
              {word.written}
            </span>{" "}
            <span lang="ja" className="kanji-word-reading">
              {word.reading}
            </span>{" "}
            <span className="kanji-word-meaning">{word.meaning}</span>
          </li>
        ))}
      </ul>
      <p className="kanji-tip">
        <strong>Mẹo nhớ:</strong> <JapaneseText text={item.tip} />
      </p>
      {item.paper && (
        <p className="kanji-paper">
          Đề mẫu chính thức đã hỏi:{" "}
          {item.paper.map((paper, index) => (
            <span key={`${paper.year}-${paper.word}`}>
              {index > 0 && ", "}
              <span lang="ja">{paper.word}</span> ({paper.year})
            </span>
          ))}
        </p>
      )}
    </li>
  );
}

// Every kanji of a level, group by group, each group with a link to practise just its words.
export function JlptKanjiList({ data, practiceHref }: JlptKanjiListProps) {
  return (
    <>
      <nav className="kanji-group-nav" aria-label="Nhóm chữ">
        <ul>
          {data.groups.map((group) => (
            <li key={group.id}>
              <a href={`#${group.id}`}>
                {group.title}{" "}
                <span className="kanji-count">
                  ({data.items.filter((item) => item.group === group.id).length})
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {data.groups.map((group) => {
        const items = data.items.filter((item) => item.group === group.id);
        return (
          <section
            className="kanji-group"
            id={group.id}
            key={group.id}
            aria-labelledby={`${group.id}-title`}
          >
            <div className="kanji-group-head">
              <h2 id={`${group.id}-title`}>{group.title}</h2>
              <span className="kanji-count">{items.length} chữ</span>
              <Link href={`${practiceHref}?group=${group.id}`} className="kanji-group-practice">
                Luyện nhóm này
              </Link>
            </div>
            <ul className="kanji-cards">
              {items.map((item) => (
                <KanjiCard item={item} key={item.kanji} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

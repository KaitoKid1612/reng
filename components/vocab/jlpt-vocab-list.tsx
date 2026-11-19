import Link from "next/link";

import { VOCAB_POS_LABELS } from "@/lib/jlpt-vocab";

import type { JlptVocab, JlptVocabLevelData } from "@/lib/jlpt-vocab";

interface JlptVocabListProps {
  data: JlptVocabLevelData;
  practiceHref: string;
}

// The example with the word marked, as a learner would underline it in a textbook.
function Example({ sentence }: { sentence: string }) {
  const parts = sentence.split(/\[\[(.+?)\]\]/u);
  return (
    <span lang="ja">
      {parts.map((part, index) =>
        index % 2 ? (
          <strong className="vocab-target" key={index}>
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </span>
  );
}

function VocabRow({ item }: { item: JlptVocab }) {
  return (
    <li className="vocab-entry" id={`vocab-${item.reading}`}>
      <div className="vocab-head">
        <span className="vocab-word" lang="ja">
          {item.word}
        </span>
        {item.word !== item.reading && (
          <span className="vocab-reading" lang="ja">
            {item.reading}
          </span>
        )}
        {item.paper && <span className="kanji-paper-badge">Đã ra đề {item.paper.join(", ")}</span>}
      </div>
      <p className="vocab-meaning">
        {item.meaning} <span className="vocab-pos">({VOCAB_POS_LABELS[item.pos]})</span>
      </p>
      {item.hanViet && <p className="vocab-han-viet">Hán Việt: {item.hanViet}</p>}
      <p className="vocab-example">
        <Example sentence={item.example.ja} />
        <br />
        <span className="muted">{item.example.vi}</span>
      </p>
      {item.similar && (
        <p className="vocab-similar">
          Gần nghĩa: <span lang="ja">{item.similar}</span>
        </p>
      )}
      {item.tip && <p className="vocab-tip">{item.tip}</p>}
    </li>
  );
}

// Every word of a level, topic by topic, each topic with a link to practise just its words.
export function JlptVocabList({ data, practiceHref }: JlptVocabListProps) {
  return (
    <>
      <nav className="kanji-group-nav" aria-label="Chủ đề">
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
              <span className="kanji-count">{items.length} từ</span>
              <Link href={`${practiceHref}?group=${group.id}`} className="kanji-group-practice">
                Luyện chủ đề này
              </Link>
            </div>
            <ul className="vocab-list">
              {items.map((item) => (
                <VocabRow item={item} key={`${item.word}|${item.reading}`} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

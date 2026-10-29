import Link from "next/link";

import { AudioStatus } from "@/components/audio-provider";
import { buttonVariants } from "@/components/ui/button";
import { JapaneseText } from "@/components/lessons/japanese-text";
import { LessonProgressButton } from "@/components/lessons/lesson-progress-button";
import { PronunciationButton } from "@/components/lessons/pronunciation-button";
import { toPlainJapanese, toSpeechText } from "@/lib/japanese-text";

import type { PublicLesson, PublicSlide } from "@/lib/lesson-schema";

interface LessonReaderProps {
  lesson: PublicLesson;
  progress: { completedAt: string | null } | null;
}

interface ReaderTableProps {
  slide: Extract<PublicSlide, { type: "table" }>;
}

// Drill answers stay folded so learners can test themselves before looking.
function ReaderTable({ slide }: ReaderTableProps) {
  const answerColumn = slide.revealLastColumn ? slide.columns.length - 1 : -1;
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label={toPlainJapanese(slide.title)}
      tabIndex={0}
    >
      <table className="reader-table">
        <thead>
          <tr>
            {slide.columns.map((column, index) => (
              <th key={index} scope="col">
                <JapaneseText text={column} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slide.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  {cellIndex === answerColumn ? (
                    <details>
                      <summary>Xem câu mẫu</summary>
                      <JapaneseText text={cell} />
                    </details>
                  ) : (
                    <JapaneseText text={cell} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LessonReader({ lesson, progress }: LessonReaderProps) {
  const listeningCount = lesson.content.questions.filter(
    (question) => question.type === "listen" || question.type === "dictation",
  ).length;
  const dialogues = lesson.content.slides.filter((slide) => slide.type === "dialogue");
  const tables = lesson.content.slides.filter((slide) => slide.type === "table");
  return (
    <article className="lesson-reader">
      <div className="page-heading">
        <div>
          <p lang="ja" className="lesson-japanese-title">
            {lesson.titleJa}
          </p>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
        </div>
        <Link
          href={`/lessons/${lesson.lessonId}/slide?version=${lesson.id}#1`}
          className={buttonVariants()}
        >
          Trình chiếu
        </Link>
      </div>
      {lesson.isSample && (
        <p className="sample-notice">
          Bài mẫu tự biên soạn, đang chờ giảng viên duyệt nội dung và phát âm.
        </p>
      )}
      <AudioStatus />
      <section aria-labelledby="vocabulary-title">
        <h2 id="vocabulary-title">Từ vựng</h2>
        <ul className="vocabulary-list">
          {lesson.content.vocab.map((item) => (
            <li key={item.id}>
              <div>
                <span className="japanese-text" lang="ja">
                  {item.kanji || item.jp}
                </span>
                {item.kanji && item.kanji !== item.jp && (
                  <span className="reading-text" lang="ja">
                    {item.jp}
                  </span>
                )}
                <span className="small muted">{item.romaji}</span>
              </div>
              <span>
                {item.vi}
                {item.note && (
                  <span className="vocab-note small muted">
                    <JapaneseText text={item.note} />
                  </span>
                )}
              </span>
              <PronunciationButton
                id={`${lesson.lessonId}:${item.id}`}
                text={toSpeechText(item.jp)}
                label={item.romaji}
                audio={item.audio}
              />
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="grammar-title">
        <h2 id="grammar-title">Mẫu câu</h2>
        {lesson.content.grammar.map((grammar) => (
          <article className="grammar-block" id={grammar.id} key={grammar.id}>
            <h3 lang="ja" className="japanese-text">
              <JapaneseText text={grammar.pattern} />
            </h3>
            <p>
              <strong>{grammar.vi}</strong>
            </p>
            <p>
              <JapaneseText text={grammar.explain} />
            </p>
            {grammar.examples.map((example, index) => (
              <div key={`${grammar.id}-${index}`} className="example-block">
                <p lang="ja" className="japanese-text">
                  <JapaneseText text={example.jp} />
                </p>
                <p>{example.vi}</p>
                <PronunciationButton
                  id={`${lesson.lessonId}:${grammar.id}:${index}`}
                  text={toSpeechText(example.jp)}
                  label={toPlainJapanese(example.jp)}
                  audio={example.audio}
                />
              </div>
            ))}
            {grammar.viMistake && (
              <p className="grammar-caution">
                <strong>Dễ nhầm:</strong> <JapaneseText text={grammar.viMistake} />
              </p>
            )}
          </article>
        ))}
      </section>
      {dialogues.length > 0 && (
        <section aria-labelledby="dialogue-title">
          <h2 id="dialogue-title">Hội thoại</h2>
          {dialogues.map((slide) => (
            <article key={slide.id} className="grammar-block">
              <h3>
                <JapaneseText text={slide.title} />
              </h3>
              <ol className="dialogue-list">
                {slide.lines.map((line, index) => (
                  <li key={index}>
                    <span className="dialogue-speaker">
                      <JapaneseText text={line.speaker} />
                    </span>
                    <div>
                      <p lang="ja" className="japanese-text">
                        <JapaneseText text={line.jp} />
                      </p>
                      <p>{line.vi}</p>
                    </div>
                    <PronunciationButton
                      id={`${lesson.lessonId}:${slide.id}:${index}`}
                      text={toSpeechText(line.jp)}
                      label={toPlainJapanese(line.jp)}
                      audio={null}
                    />
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </section>
      )}
      {tables.length > 0 && (
        <section aria-labelledby="table-title">
          <h2 id="table-title">Bảng và luyện tập</h2>
          {tables.map((slide) => (
            <article key={slide.id} className="grammar-block">
              <h3>
                <JapaneseText text={slide.title} />
              </h3>
              <ReaderTable slide={slide} />
            </article>
          ))}
        </section>
      )}
      {progress && (
        <LessonProgressButton
          lessonId={lesson.lessonId}
          versionId={lesson.id}
          completedAt={progress.completedAt}
        />
      )}
      <div className="button-row">
        <Link
          href={`/lessons/${lesson.lessonId}/slide?version=${lesson.id}#1`}
          className={buttonVariants()}
        >
          Ôn lại bằng slide
        </Link>
        <Link
          href={`/vocabulary/${lesson.lessonId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Flashcard từ vựng
        </Link>
        {listeningCount > 0 && (
          <Link
            href={`/listening/${lesson.lessonId}?version=${lesson.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Luyện nghe ({listeningCount} câu)
          </Link>
        )}
        <Link href="/lessons" className={buttonVariants({ variant: "outline" })}>
          Các bài học
        </Link>
      </div>
    </article>
  );
}

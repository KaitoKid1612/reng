import Link from "next/link";

import { AudioStatus } from "@/components/audio-provider";
import { buttonVariants } from "@/components/ui/button";
import { LessonProgressButton } from "@/components/lessons/lesson-progress-button";
import { PronunciationButton } from "@/components/lessons/pronunciation-button";

import type { PublicLesson } from "@/lib/lesson-schema";

interface LessonReaderProps {
  lesson: PublicLesson;
  progress: { completedAt: string | null } | null;
}

export function LessonReader({ lesson, progress }: LessonReaderProps) {
  const listeningCount = lesson.content.questions.filter(
    (question) => question.type === "listen" || question.type === "dictation",
  ).length;
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
              <span>{item.vi}</span>
              <PronunciationButton
                id={`${lesson.lessonId}:${item.id}`}
                text={item.jp}
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
              {grammar.pattern}
            </h3>
            <p>
              <strong>{grammar.vi}</strong>
            </p>
            <p>{grammar.explain}</p>
            {grammar.examples.map((example, index) => (
              <div key={`${grammar.id}-${index}`} className="example-block">
                <p lang="ja" className="japanese-text">
                  {example.jp}
                </p>
                <p>{example.vi}</p>
                <PronunciationButton
                  id={`${lesson.lessonId}:${grammar.id}:${index}`}
                  text={example.jp}
                  label={example.jp}
                  audio={example.audio}
                />
              </div>
            ))}
            {grammar.viMistake && (
              <p className="grammar-caution">
                <strong>Dễ nhầm:</strong> {grammar.viMistake}
              </p>
            )}
          </article>
        ))}
      </section>
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

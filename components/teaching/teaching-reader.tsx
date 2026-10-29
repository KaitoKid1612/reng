import Link from "next/link";

import { AudioStatus } from "@/components/audio-provider";
import { LessonProgressButton } from "@/components/lessons/lesson-progress-button";
import { PronunciationButton } from "@/components/lessons/pronunciation-button";
import { buttonVariants } from "@/components/ui/button";
import { LANGUAGE_LABELS } from "@/lib/teaching-content";

import type { PublicTeachingLesson } from "@/lib/teaching-content";

interface TeachingReaderProps {
  lesson: PublicTeachingLesson;
  progress: { completedAt: string | null } | null;
  // The editor preview has no published version yet, so version links are hidden.
  isPreview?: boolean;
}

export function TeachingReader({ lesson, progress, isPreview = false }: TeachingReaderProps) {
  const { context, objectives, vocab, grammar, dialogue } = lesson.content;
  const slideHref = `/lessons/${lesson.lessonId}/slide?version=${lesson.id}#1`;
  return (
    <article className="lesson-reader">
      <div className="page-heading">
        <div>
          <p className="lesson-language">{LANGUAGE_LABELS[context.languageTag]}</p>
          <h1>{lesson.title}</h1>
        </div>
        {!isPreview && (
          <Link href={slideHref} className={buttonVariants()}>
            Trình chiếu
          </Link>
        )}
      </div>
      <AudioStatus />
      <section aria-labelledby="objectives-title">
        <h2 id="objectives-title">Mục tiêu buổi học</h2>
        <ul className="lesson-objectives">
          {objectives.map((objective, index) => (
            <li key={index}>{objective}</li>
          ))}
        </ul>
      </section>
      {vocab.length > 0 && (
        <section aria-labelledby="vocabulary-title">
          <h2 id="vocabulary-title">Từ vựng</h2>
          <ul className="vocabulary-list">
            {vocab.map((item) => (
              <li key={item.id}>
                <div>
                  <span lang={context.languageTag} className="chinese-text">
                    {item.text}
                  </span>
                  {item.reading && <span className="pinyin-text">{item.reading}</span>}
                </div>
                <span>{item.meaning}</span>
                <PronunciationButton
                  id={`${lesson.lessonId}:${item.id}`}
                  text={item.text}
                  label={item.reading || item.text}
                  audio={item.audio}
                  locale={context.locale}
                />
              </li>
            ))}
          </ul>
          {vocab
            .filter((item) => item.examples.length)
            .map((item) => (
              <div key={item.id}>
                {item.examples.map((example, index) => (
                  <div key={index} className="example-block">
                    <p lang={context.languageTag} className="chinese-text">
                      {example.text}
                    </p>
                    {example.reading && <p className="pinyin-text">{example.reading}</p>}
                    <p>{example.meaning}</p>
                  </div>
                ))}
              </div>
            ))}
        </section>
      )}
      {grammar.length > 0 && (
        <section aria-labelledby="grammar-title">
          <h2 id="grammar-title">Mẫu câu</h2>
          {grammar.map((item) => (
            <article className="grammar-block" id={item.id} key={item.id}>
              <h3 lang={context.languageTag} className="chinese-text">
                {item.pattern}
              </h3>
              <p>
                <strong>{item.meaning}</strong>
              </p>
              {item.explain && <p>{item.explain}</p>}
              {item.examples.map((example, index) => (
                <div key={index} className="example-block">
                  <p lang={context.languageTag} className="chinese-text">
                    {example.text}
                  </p>
                  {example.reading && <p className="pinyin-text">{example.reading}</p>}
                  <p>{example.meaning}</p>
                </div>
              ))}
            </article>
          ))}
        </section>
      )}
      {dialogue.length > 0 && (
        <section aria-labelledby="dialogue-title">
          <h2 id="dialogue-title">Hội thoại</h2>
          <ol className="dialogue-list">
            {dialogue.map((line) => (
              <li key={line.id}>
                <span className="dialogue-speaker">{line.speaker}</span>
                <div>
                  <p lang={context.languageTag} className="chinese-text">
                    {line.text}
                  </p>
                  {line.reading && <p className="pinyin-text">{line.reading}</p>}
                  <p>{line.meaning}</p>
                </div>
                <PronunciationButton
                  id={`${lesson.lessonId}:${line.id}`}
                  text={line.text}
                  label={line.reading || line.text}
                  audio={line.audio}
                  locale={context.locale}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
      {progress && (
        <LessonProgressButton
          lessonId={lesson.lessonId}
          versionId={lesson.id}
          completedAt={progress.completedAt}
        />
      )}
      {!isPreview && (
        <div className="button-row">
          <Link href={slideHref} className={buttonVariants()}>
            Ôn lại bằng slide
          </Link>
          <Link href="/classes" className={buttonVariants({ variant: "outline" })}>
            Lớp của tôi
          </Link>
        </div>
      )}
    </article>
  );
}

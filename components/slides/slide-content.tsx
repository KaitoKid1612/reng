import Image from "next/image";

import { PronunciationButton } from "@/components/lessons/pronunciation-button";
import { SlideQuiz } from "@/components/slides/slide-quiz";

import type { PublicLesson, PublicSlide } from "@/lib/lesson-schema";

interface SlideContentProps {
  slide: PublicSlide;
  lesson: PublicLesson;
  staticMode?: boolean;
}

function TitleSlide({ slide }: SlideContentProps) {
  if (slide.type !== "title") {
    return null;
  }
  return (
    <div className="slide-title">
      <p lang="ja" className="slide-japanese">
        {slide.jp}
      </p>
      <h1>{slide.vi}</h1>
      <p>Nhìn, nghe và cùng nói một câu.</p>
    </div>
  );
}

function VocabularySlide({ slide, lesson }: SlideContentProps) {
  if (slide.type !== "vocab") {
    return null;
  }
  return (
    <div>
      <h2>Từ vựng</h2>
      <div className="slide-vocabulary">
        {slide.refs.map((id) => {
          const item = lesson.content.vocab.find((entry) => entry.id === id);
          if (!item) {
            return null;
          }
          return (
            <div key={id}>
              <div className="slide-word">
                <span lang="ja" className="slide-japanese">
                  {item.kanji || item.jp}
                </span>
                {item.kanji && item.kanji !== item.jp && (
                  <span lang="ja" className="slide-reading">
                    {item.jp}
                  </span>
                )}
              </div>
              <span>{item.vi}</span>
              <PronunciationButton
                id={`${lesson.lessonId}:${id}`}
                text={item.jp}
                label={item.romaji}
                audio={item.audio}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrammarSlide({ slide, lesson }: SlideContentProps) {
  if (slide.type !== "grammar") {
    return null;
  }
  const grammar = lesson.content.grammar.find((entry) => entry.id === slide.ref);
  if (!grammar) {
    return null;
  }
  return (
    <div>
      <h2>Mẫu câu</h2>
      <p lang="ja" className="slide-japanese">
        {grammar.pattern}
      </p>
      <p className="slide-translation">{grammar.vi}</p>
      <p className="slide-explanation">{grammar.explain}</p>
    </div>
  );
}

function ExampleSlide({ slide, lesson, staticMode }: SlideContentProps) {
  if (slide.type !== "example") {
    return null;
  }
  const grammar = lesson.content.grammar.find((entry) => entry.id === slide.ref);
  if (!grammar) {
    return null;
  }
  return (
    <div>
      <h2>Câu ví dụ</h2>
      {grammar.examples.map((example, index) => (
        <div key={index}>
          <p lang="ja" className="slide-japanese">
            {example.jp}
          </p>
          <p
            className={
              slide.reveal && !staticMode ? "fragment slide-translation" : "slide-translation"
            }
          >
            {example.vi}
          </p>
          <PronunciationButton
            id={`${lesson.lessonId}:${grammar.id}:${index}`}
            text={example.jp}
            label={example.jp}
            audio={example.audio}
          />
        </div>
      ))}
    </div>
  );
}

function QuizSlide({ slide, lesson, staticMode }: SlideContentProps) {
  return slide.type === "quiz" ? (
    <SlideQuiz lesson={lesson} questionId={slide.ref} staticMode={staticMode} />
  ) : null;
}

function NoteSlide({ slide }: SlideContentProps) {
  return slide.type === "note" ? (
    <div>
      <h2>{slide.title}</h2>
      <p className="slide-explanation">{slide.body}</p>
    </div>
  ) : null;
}

function ImageSlide({ slide }: SlideContentProps) {
  return slide.type === "image" ? (
    <figure>
      <Image
        src={slide.src}
        alt={slide.alt}
        width={1000}
        height={480}
        unoptimized
        style={{ objectFit: "contain" }}
      />
      <figcaption>{slide.caption}</figcaption>
    </figure>
  ) : null;
}

const SLIDE_RENDERERS = {
  title: TitleSlide,
  vocab: VocabularySlide,
  grammar: GrammarSlide,
  example: ExampleSlide,
  quiz: QuizSlide,
  note: NoteSlide,
  image: ImageSlide,
};

export function SlideContent(props: SlideContentProps) {
  const Renderer = SLIDE_RENDERERS[props.slide.type];
  return <Renderer {...props} />;
}

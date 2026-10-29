import Image from "next/image";

import { JapaneseText } from "@/components/lessons/japanese-text";
import { PronunciationButton } from "@/components/lessons/pronunciation-button";
import { SlideQuiz } from "@/components/slides/slide-quiz";
import { toPlainJapanese, toSpeechText } from "@/lib/japanese-text";
import { cn } from "@/lib/utils";

import type { PublicLesson, PublicSlide } from "@/lib/lesson-schema";

interface SlideContentProps {
  slide: PublicSlide;
  lesson: PublicLesson;
  staticMode?: boolean;
}

// Beyond these counts a slide switches to a denser layout so it stays within 1280×720.
const COMPACT_VOCAB_ITEMS = 3;
const COMPACT_EXAMPLES = 1;
const COMPACT_DIALOGUE_LINES = 5;
const COMPACT_TABLE_ROWS = 8;

function TitleSlide({ slide }: SlideContentProps) {
  if (slide.type !== "title") {
    return null;
  }
  return (
    <div className="slide-title">
      <p lang="ja" className="slide-japanese">
        <JapaneseText text={slide.jp} />
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
      <div
        className="slide-vocabulary"
        data-size={slide.refs.length > COMPACT_VOCAB_ITEMS ? "compact" : undefined}
      >
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
                text={toSpeechText(item.jp)}
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
        <JapaneseText text={grammar.pattern} />
      </p>
      <p className="slide-translation">{grammar.vi}</p>
      <p className="slide-explanation">
        <JapaneseText text={grammar.explain} />
      </p>
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
      <div
        className="slide-examples"
        data-size={grammar.examples.length > COMPACT_EXAMPLES ? "compact" : undefined}
      >
        {grammar.examples.map((example, index) => (
          <div key={index}>
            <p lang="ja" className="slide-japanese">
              <JapaneseText text={example.jp} />
            </p>
            <div className="slide-example-meaning">
              <p
                className={
                  slide.reveal && !staticMode ? "fragment slide-translation" : "slide-translation"
                }
              >
                {example.vi}
              </p>
              <PronunciationButton
                id={`${lesson.lessonId}:${grammar.id}:${index}`}
                text={toSpeechText(example.jp)}
                label={toPlainJapanese(example.jp)}
                audio={example.audio}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DialogueSlide({ slide, lesson, staticMode }: SlideContentProps) {
  if (slide.type !== "dialogue") {
    return null;
  }
  const isCompact = slide.lines.length > COMPACT_DIALOGUE_LINES;
  return (
    <div>
      <h2>
        <JapaneseText text={slide.title} />
      </h2>
      <ol className={cn("slide-dialogue slide-dialogue-ja", isCompact && "is-compact")}>
        {slide.lines.map((line, index) => (
          <li key={index}>
            <span className="dialogue-speaker">
              <JapaneseText text={line.speaker} />
            </span>
            <div>
              <p lang="ja" className="slide-dialogue-line">
                <JapaneseText text={line.jp} />
              </p>
              <p
                className={
                  slide.reveal && !staticMode ? "fragment slide-translation" : "slide-translation"
                }
              >
                {line.vi}
              </p>
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
    </div>
  );
}

function TableSlide({ slide, staticMode }: SlideContentProps) {
  if (slide.type !== "table") {
    return null;
  }
  const answerColumn = slide.revealLastColumn && !staticMode ? slide.columns.length - 1 : -1;
  return (
    <div>
      <h2>
        <JapaneseText text={slide.title} />
      </h2>
      <table
        className="slide-table"
        data-size={slide.rows.length > COMPACT_TABLE_ROWS ? "compact" : undefined}
      >
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
                <td key={cellIndex} className={cellIndex === answerColumn ? "fragment" : undefined}>
                  <JapaneseText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
      <h2>
        <JapaneseText text={slide.title} />
      </h2>
      <p className="slide-explanation slide-note-body">
        <JapaneseText text={slide.body} />
      </p>
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
  dialogue: DialogueSlide,
  table: TableSlide,
  quiz: QuizSlide,
  note: NoteSlide,
  image: ImageSlide,
};

export function SlideContent(props: SlideContentProps) {
  const Renderer = SLIDE_RENDERERS[props.slide.type];
  return <Renderer {...props} />;
}

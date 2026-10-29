import { PronunciationButton } from "@/components/lessons/pronunciation-button";
import { SlideQuiz } from "@/components/slides/slide-quiz";

import type { PublicTeachingLesson, PublicTeachingSlide } from "@/lib/teaching-content";

interface TeachingSlideContentProps {
  slide: PublicTeachingSlide;
  lesson: PublicTeachingLesson;
  staticMode?: boolean;
}

function VocabularySlide({ slide, lesson }: TeachingSlideContentProps) {
  if (slide.type !== "vocab") {
    return null;
  }
  const { languageTag, locale } = lesson.content.context;
  return (
    <div>
      <h2>Từ vựng</h2>
      <div className="slide-chinese-words">
        {slide.refs.map((id) => {
          const item = lesson.content.vocab.find((entry) => entry.id === id);
          if (!item) {
            return null;
          }
          return (
            <div key={id}>
              <div>
                <p lang={languageTag} className="slide-chinese">
                  {item.text}
                </p>
                {item.reading && <p className="slide-pinyin">{item.reading}</p>}
                <p className="slide-translation">{item.meaning}</p>
              </div>
              <PronunciationButton
                id={`${lesson.lessonId}:${id}`}
                text={item.text}
                label={item.reading || item.text}
                audio={item.audio}
                locale={locale}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SentenceProps {
  lesson: PublicTeachingLesson;
  sentence: { text: string; reading: string; meaning: string };
  audioId: string;
  hideMeaning: boolean;
}

function Sentence({ lesson, sentence, audioId, hideMeaning }: SentenceProps) {
  const { languageTag, locale } = lesson.content.context;
  return (
    <div>
      <p lang={languageTag} className="slide-chinese-sentence">
        {sentence.text}
      </p>
      {sentence.reading && <p className="slide-pinyin">{sentence.reading}</p>}
      <p className={hideMeaning ? "fragment slide-translation" : "slide-translation"}>
        {sentence.meaning}
      </p>
      <PronunciationButton
        id={audioId}
        text={sentence.text}
        label={sentence.reading || sentence.text}
        audio={null}
        locale={locale}
      />
    </div>
  );
}

function ExampleSlide({ slide, lesson, staticMode }: TeachingSlideContentProps) {
  if (slide.type !== "examples") {
    return null;
  }
  const item = lesson.content.vocab.find((entry) => entry.id === slide.ref);
  const example = item?.examples[slide.index];
  if (!item || !example) {
    return null;
  }
  return (
    <div>
      <h2>Câu ví dụ với {item.text}</h2>
      <Sentence
        lesson={lesson}
        sentence={example}
        audioId={`${lesson.lessonId}:${item.id}:${slide.index}`}
        hideMeaning={!staticMode}
      />
    </div>
  );
}

function GrammarSlide({ slide, lesson }: TeachingSlideContentProps) {
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
      <p lang={lesson.content.context.languageTag} className="slide-chinese-sentence">
        {grammar.pattern}
      </p>
      <p className="slide-translation">{grammar.meaning}</p>
      {grammar.explain && <p className="slide-explanation">{grammar.explain}</p>}
      {grammar.examples.slice(0, 2).map((example, index) => (
        <Sentence
          key={index}
          lesson={lesson}
          sentence={example}
          audioId={`${lesson.lessonId}:${grammar.id}:${index}`}
          hideMeaning={false}
        />
      ))}
    </div>
  );
}

function DialogueSlide({ slide, lesson, staticMode }: TeachingSlideContentProps) {
  if (slide.type !== "dialogue") {
    return null;
  }
  const lines = slide.refs.flatMap((id) => {
    const line = lesson.content.dialogue.find((entry) => entry.id === id);
    return line ? [line] : [];
  });
  return (
    <div>
      <h2>Hội thoại</h2>
      <ol className="slide-dialogue">
        {lines.map((line) => (
          <li key={line.id}>
            <span className="dialogue-speaker">{line.speaker}</span>
            <div>
              <p lang={lesson.content.context.languageTag} className="slide-chinese-sentence">
                {line.text}
              </p>
              {line.reading && <p className="slide-pinyin">{line.reading}</p>}
              <p className={staticMode ? "slide-translation" : "fragment slide-translation"}>
                {line.meaning}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TeachingSlideContent(props: TeachingSlideContentProps) {
  const { slide, lesson, staticMode } = props;
  switch (slide.type) {
    case "title":
      return (
        <div className="slide-title">
          <h1>{slide.text}</h1>
          <p>Nhìn, nghe và cùng nói theo.</p>
        </div>
      );
    case "note":
      return (
        <div>
          <h2>{slide.title}</h2>
          <p className="slide-explanation slide-note-body">{slide.body}</p>
        </div>
      );
    case "vocab":
      return <VocabularySlide {...props} />;
    case "examples":
      return <ExampleSlide {...props} />;
    case "grammar":
      return <GrammarSlide {...props} />;
    case "dialogue":
      return <DialogueSlide {...props} />;
    case "quiz":
      return <SlideQuiz lesson={lesson} questionId={slide.ref} staticMode={staticMode} lang="vi" />;
  }
}

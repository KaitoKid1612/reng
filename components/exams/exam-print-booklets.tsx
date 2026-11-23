import Image from "next/image";

import { TranscriptText } from "@/components/classroom/transcript-text";
import { FuriganaText, JapaneseText } from "@/components/lessons/japanese-text";
import { QrCode } from "@/components/ui/qr-code";

import type {
  AnswerKeyRow,
  AnswerSheetRow,
  PrintBlock,
  PrintQuestion,
  PrintSection,
  ScriptRow,
} from "@/lib/exam-print";

// The four printed booklets of a JLPT exam (lib/exam-print.ts). Each section starts a page and no
// question or passage breaks across pages; app/styles/exam-print.css holds the paper layout.

interface SectionHeadProps {
  section: PrintSection<unknown>;
  runningTitle: string;
}

function SectionHead({ section, runningTitle }: SectionHeadProps) {
  return (
    <header className="exam-print-section-head">
      <h2 lang="ja">{section.title}</h2>
      <p>
        {section.minutes} phút · {runningTitle}
      </p>
    </header>
  );
}

interface MondaiHeadProps {
  heading: string;
  instruction: string | null;
}

// An instruction that already starts with its もんだい number is printed as it stands.
function MondaiHead({ heading, instruction }: MondaiHeadProps) {
  const repeatsHeading = instruction?.startsWith(heading.replace(/（.*$/u, ""));
  return (
    <div className="exam-print-mondai-head" lang="ja">
      {!repeatsHeading && <h3>{heading}</h3>}
      {instruction && (
        <p className="exam-print-instruction">
          <FuriganaText text={instruction} />
        </p>
      )}
    </div>
  );
}

interface AudioLinkProps {
  url: string;
  label: string;
}

function AudioQr({ url, label }: AudioLinkProps) {
  return <QrCode text={url} label={label} className="exam-print-qr" />;
}

interface PrintImageProps {
  src: string;
  alt: string;
}

function PrintImage({ src, alt }: PrintImageProps) {
  return (
    // Eager: a lazy picture below the fold may still be blank when the print dialog lays out pages.
    <Image
      src={src}
      alt={alt}
      width={900}
      height={600}
      unoptimized
      loading="eager"
      className="exam-print-image"
    />
  );
}

interface QuestionProps {
  question: PrintQuestion;
  audioUrl: (hash: string) => string;
}

function Question({ question, audioUrl }: QuestionProps) {
  const audio = question.audio ? audioUrl(question.audio) : null;
  return (
    <li className="exam-print-question" lang="ja">
      <div className="exam-print-question-main">
        <p className="exam-print-prompt">
          <span className="exam-print-number">{question.label}</span>
          {question.prompt && <FuriganaText text={question.prompt} />}
        </p>
        {question.image && <PrintImage src={question.image} alt={`Hình câu ${question.label}`} />}
        {question.options.length > 0 && (
          <ol className={`exam-print-options exam-print-options-${question.optionColumns}`}>
            {question.options.map((option, index) => (
              <li key={index}>
                <span className="exam-print-option-number">{index + 1}</span>
                <FuriganaText text={option} />
              </li>
            ))}
          </ol>
        )}
      </div>
      {audio && <AudioQr url={audio} label={`Mã QR audio câu ${question.label}`} />}
    </li>
  );
}

interface BlockProps {
  block: PrintBlock;
  audioUrl: (hash: string) => string;
}

function Block({ block, audioUrl }: BlockProps) {
  const questions = block.questions.map((question) => (
    <Question key={question.key} question={question} audioUrl={audioUrl} />
  ));
  if (!block.passage && !block.image) {
    return <>{questions}</>;
  }
  return (
    <li className="exam-print-passage-block">
      {block.passage && (
        <div className="exam-print-passage" lang="ja">
          <FuriganaText text={block.passage} />
        </div>
      )}
      {block.image && <PrintImage src={block.image} alt="Hình của đoạn đọc" />}
      <ol className="exam-print-questions">{questions}</ol>
    </li>
  );
}

interface QuestionBookletProps {
  sections: PrintSection<PrintBlock>[];
  runningTitle: string;
  audioUrl: (hash: string) => string;
}

export function QuestionBooklet({ sections, runningTitle, audioUrl }: QuestionBookletProps) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.section} className="exam-print-section">
          <SectionHead section={section} runningTitle={runningTitle} />
          {section.section === "listening" && (
            <p className="exam-print-note">
              Quét mã QR cạnh mỗi câu để nghe audio của câu đó (mỗi câu nghe một lần như đề thật).
            </p>
          )}
          {section.mondai.map((mondai) => (
            <div key={mondai.heading} className="exam-print-mondai">
              <MondaiHead heading={mondai.heading} instruction={mondai.instruction} />
              <ol className="exam-print-questions">
                {mondai.items.map((block) => (
                  <Block key={block.questions[0].key} block={block} audioUrl={audioUrl} />
                ))}
              </ol>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

interface AnswerSheetProps {
  sections: PrintSection<AnswerSheetRow>[];
  runningTitle: string;
}

export function AnswerSheet({ sections, runningTitle }: AnswerSheetProps) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.section} className="exam-print-section exam-print-sheet">
          <SectionHead section={section} runningTitle={runningTitle} />
          <p className="exam-print-note">
            Tô kín một ô cho mỗi câu: ●. Sai thì tẩy sạch rồi tô lại.
          </p>
          <div className="exam-print-sheet-grid">
            {section.mondai.map((mondai) => (
              <table key={mondai.heading} className="exam-print-sheet-table">
                <caption lang="ja">{mondai.heading}</caption>
                <tbody>
                  {mondai.items.map((row) => (
                    <tr key={row.key}>
                      <th scope="row" lang="ja">
                        {row.label}
                      </th>
                      {Array.from({ length: row.optionCount }, (_, index) => (
                        <td key={index}>
                          <span className="exam-print-bubble">{index + 1}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

interface AnswerKeyProps {
  sections: PrintSection<AnswerKeyRow>[];
  runningTitle: string;
}

export function AnswerKey({ sections, runningTitle }: AnswerKeyProps) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.section} className="exam-print-section">
          <SectionHead section={section} runningTitle={runningTitle} />
          <p className="exam-print-key-summary" lang="ja">
            {section.mondai.map((mondai) => (
              <span key={mondai.heading}>
                <strong>{mondai.heading}</strong>{" "}
                {mondai.items.map((row) => `${row.label}→${row.answer}`).join("  ")}
              </span>
            ))}
          </p>
          {section.mondai.map((mondai) => (
            <div key={mondai.heading} className="exam-print-mondai">
              <h3 lang="ja">{mondai.heading}</h3>
              <ol className="exam-print-key">
                {mondai.items.map((row) => (
                  <li key={row.key} className="exam-print-key-row">
                    <span className="exam-print-number" lang="ja">
                      {row.label}
                    </span>
                    <span className="exam-print-key-answer">Đáp án {row.answer}</span>
                    <span className="exam-print-key-explain">
                      <JapaneseText text={row.explain} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

interface ListeningScriptProps {
  sections: PrintSection<ScriptRow>[];
  runningTitle: string;
  audioUrl: (hash: string) => string;
}

export function ListeningScript({ sections, runningTitle, audioUrl }: ListeningScriptProps) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.section} className="exam-print-section">
          <SectionHead section={section} runningTitle={runningTitle} />
          {section.mondai.map((mondai) => {
            const original = mondai.items.find((row) => row.originalAudioUrl)?.originalAudioUrl;
            return (
              <div key={mondai.heading} className="exam-print-mondai">
                <h3 lang="ja">{mondai.heading}</h3>
                {original && (
                  <p className="exam-print-note">
                    Bản ghi âm gốc của もんだい này trên jlpt.jp: {original}
                  </p>
                )}
                <ol className="exam-print-questions">
                  {mondai.items.map((row) => {
                    const audio = row.audio ? audioUrl(row.audio) : null;
                    return (
                      <li key={row.key} className="exam-print-question exam-print-script">
                        <div className="exam-print-question-main">
                          <p className="exam-print-prompt">
                            <span className="exam-print-number" lang="ja">
                              {row.label}
                            </span>
                            <span className="exam-print-key-answer">Đáp án {row.answer}</span>
                          </p>
                          <p className="exam-print-transcript" lang="ja">
                            <TranscriptText text={row.transcript} />
                          </p>
                          {audio && <p className="exam-print-link">{audio}</p>}
                        </div>
                        {audio && <AudioQr url={audio} label={`Mã QR audio câu ${row.label}`} />}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

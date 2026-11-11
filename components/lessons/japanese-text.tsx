import { Fragment } from "react";

import { parseFurigana, splitJapaneseRuns, splitUnderlines } from "@/lib/japanese-text";

import type { JapaneseSegment } from "@/lib/japanese-text";
import type { ReactNode } from "react";

interface JapaneseTextProps {
  text: string;
}

interface RubyProps {
  segment: Required<JapaneseSegment>;
}

// The parentheses only show where ruby is unsupported.
function Ruby({ segment }: RubyProps) {
  return (
    <ruby lang="ja">
      {segment.text}
      <rp>(</rp>
      <rt>{segment.reading}</rt>
      <rp>)</rp>
    </ruby>
  );
}

function hasReading(segment: JapaneseSegment): segment is Required<JapaneseSegment> {
  return segment.reading !== undefined;
}

// An exam's underlined word ([[雨]]) keeps its underline wherever the text is shown.
function Underlined({ text, render }: { text: string; render: (text: string) => ReactNode }) {
  return (
    <>
      {splitUnderlines(text).map((segment, index) =>
        segment.underline ? (
          <u key={index} className="exam-underline">
            {render(segment.text)}
          </u>
        ) : (
          <Fragment key={index}>{render(segment.text)}</Fragment>
        ),
      )}
    </>
  );
}

function japaneseRuns(text: string) {
  return (
    <>
      {parseFurigana(text).map((segment, index) =>
        hasReading(segment) ? (
          <Ruby key={index} segment={segment} />
        ) : (
          <Fragment key={index}>
            {splitJapaneseRuns(segment.text).map((run, runIndex) =>
              run.isJapanese ? (
                <span key={runIndex} lang="ja">
                  {run.text}
                </span>
              ) : (
                <Fragment key={runIndex}>{run.text}</Fragment>
              ),
            )}
          </Fragment>
        ),
      )}
    </>
  );
}

function furiganaOnly(text: string) {
  return (
    <>
      {parseFurigana(text).map((segment, index) =>
        hasReading(segment) ? (
          <Ruby key={index} segment={segment} />
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

// Renders {漢字|かんじ} as ruby and marks Japanese runs inside Vietnamese text as lang="ja", so
// they use the Japanese font.
export function JapaneseText({ text }: JapaneseTextProps) {
  return <Underlined text={text} render={japaneseRuns} />;
}

// Exercise text: only {漢字|かんじ} becomes ruby and everything else stays as written, because the
// container already sets the language and Chinese questions must not be marked as Japanese.
export function FuriganaText({ text }: JapaneseTextProps) {
  return <Underlined text={text} render={furiganaOnly} />;
}

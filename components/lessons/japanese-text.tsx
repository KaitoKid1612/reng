import { Fragment } from "react";

import { parseFurigana, splitJapaneseRuns } from "@/lib/japanese-text";

import type { JapaneseSegment } from "@/lib/japanese-text";

interface JapaneseTextProps {
  text: string;
}

// The parentheses only show where ruby is unsupported.
function Ruby({ segment }: { segment: Required<JapaneseSegment> }) {
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

// Renders {漢字|かんじ} as ruby and marks Japanese runs inside Vietnamese text as lang="ja", so
// they use the Japanese font.
export function JapaneseText({ text }: JapaneseTextProps) {
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

// Exercise text: only {漢字|かんじ} becomes ruby and everything else stays as written, because the
// container already sets the language and Chinese questions must not be marked as Japanese.
export function FuriganaText({ text }: JapaneseTextProps) {
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

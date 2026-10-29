import { Fragment } from "react";

import { parseFurigana, splitJapaneseRuns } from "@/lib/japanese-text";

interface JapaneseTextProps {
  text: string;
}

// Renders {漢字|かんじ} as ruby and marks Japanese runs inside Vietnamese text as lang="ja", so
// they use the Japanese font. The parentheses only show where ruby is unsupported.
export function JapaneseText({ text }: JapaneseTextProps) {
  return (
    <>
      {parseFurigana(text).map((segment, index) =>
        segment.reading ? (
          <ruby key={index} lang="ja">
            {segment.text}
            <rp>(</rp>
            <rt>{segment.reading}</rt>
            <rp>)</rp>
          </ruby>
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

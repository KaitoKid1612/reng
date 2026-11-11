import assert from "node:assert/strict";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import rawDraft from "../content/lessons/lesson-01.json";
import { FuriganaText } from "../components/lessons/japanese-text";
import { audioHash, canonicalAudio } from "../lib/audio-config";
import {
  hasBrokenFurigana,
  listFuriganaMarks,
  splitUnderlines,
  toPlainJapanese,
  toSpeechText,
} from "../lib/japanese-text";
import { planContentAudio } from "../lib/lesson-audio";
import {
  findFuriganaProblems,
  findPublishProblems,
  parseLessonDraftState,
} from "../lib/lesson-draft";

import type { DraftQuestion } from "../lib/lesson-draft";

const base = { explain: "Giải thích.", points: 1, tags: [] as string[] };

function choice(prompt: string, options: string[], answer = [0], tags: string[] = []) {
  return {
    ...base,
    id: "q-furigana",
    type: "choice",
    prompt,
    options,
    multiple: false,
    answer,
    tags,
  } satisfies DraftQuestion;
}

function fill(prompt: string, answer: string[], tags: string[] = []) {
  return {
    ...base,
    id: "q-furigana",
    type: "fill",
    prompt,
    inputMode: "hiragana",
    kanjiStrict: false,
    answer,
    tags,
  } satisfies DraftQuestion;
}

function messages(question: DraftQuestion) {
  return findFuriganaProblems([question]).map((problem) => problem.message);
}

test("furigana marks are listed in order and a broken mark is noticed", () => {
  assert.deepEqual(listFuriganaMarks("{昨日|きのう}、{学校|がっこう}へ{行|い}きました。"), [
    { base: "昨日", reading: "きのう" },
    { base: "学校", reading: "がっこう" },
    { base: "行", reading: "い" },
  ]);
  assert.equal(hasBrokenFurigana("{昨日|きのう}、学校へ行きました。"), false);
  assert.equal(hasBrokenFurigana("{昨日|きのう、学校へ行きました。"), true);
  assert.equal(hasBrokenFurigana("{昨日}、学校へ行きました。"), true);
});

test("exercise text draws furigana as ruby and leaves other text as written", () => {
  const html = renderToStaticMarkup(
    createElement(FuriganaText, { text: "{昨日|きのう}、{学校|がっこう}へ行きました。" }),
  );
  assert.equal(
    html,
    '<ruby lang="ja">昨日<rp>(</rp><rt>きのう</rt><rp>)</rp></ruby>、' +
      '<ruby lang="ja">学校<rp>(</rp><rt>がっこう</rt><rp>)</rp></ruby>へ行きました。',
  );
  // Chinese questions never carry the mark and must not be marked as Japanese.
  assert.equal(renderToStaticMarkup(createElement(FuriganaText, { text: "你好吗？" })), "你好吗？");
});

test("an exam's underlined word keeps its underline and furigana, and is read without marks", () => {
  assert.deepEqual(splitUnderlines("あしたは [[雨]]ですか。"), [
    { text: "あしたは ", underline: false },
    { text: "雨", underline: true },
    { text: "ですか。", underline: false },
  ]);
  assert.deepEqual(splitUnderlines("[[ ]] なし"), [
    { text: " ", underline: true },
    { text: " なし", underline: false },
  ]);
  assert.equal(
    renderToStaticMarkup(
      createElement(FuriganaText, { text: "[[{今日|きょう}]]は いい 天気です。" }),
    ),
    '<u class="exam-underline"><ruby lang="ja">今日<rp>(</rp><rt>きょう</rt><rp>)</rp></ruby></u>は いい 天気です。',
  );
  assert.equal(toPlainJapanese("この [[{不便|ふべん}]]な 町"), "この 不便な 町");
  assert.equal(toSpeechText("この [[{不便|ふべん}]]な 町"), "この ふべんな 町");
  // A lone bracket is ordinary text.
  assert.equal(
    renderToStaticMarkup(createElement(FuriganaText, { text: "[1] と [[2]" })),
    "[1] と [[2]",
  );
});

test("furigana in exercises publishes when it helps and is refused when it breaks or shows the answer", () => {
  assert.deepEqual(
    messages(
      choice("{昨日|きのう}、{学校|がっこう}へ（　）。", ["{行|い}きました", "{来|き}ました"]),
    ),
    [],
  );
  // Counters are read as written: {8つ|やっつ}.
  assert.deepEqual(
    messages(fill("いすが {8つ|やっつ} あります。（　）がありますか。", ["いす"])),
    [],
  );

  assert.match(messages(fill("{昨日|きのう、（　）へ行きました。", ["がっこう"]))[0], /dạng/);
  assert.match(messages(fill("{昨日|kinou}（　）へ行きました。", ["がっこう"]))[0], /bằng kana/);
  assert.match(messages(fill("{きのう|きのう}（　）へ行きました。", ["がっこう"]))[0], /chữ Hán/);
  assert.match(
    messages(fill("{学校|がっこう}へ（　）きます。", ["{行|い}"]))[0],
    /đáp án học viên gõ/,
  );
  assert.match(
    messages(fill("Viết cách đọc bằng hiragana: {私|わたし}", ["わたし"], ["kanji"]))[0],
    /câu luyện kanji/,
  );
  assert.match(
    messages(fill("Viết cách đọc bằng hiragana: {私|わたし}", ["わたし"]))[0],
    /trùng đáp án/,
  );
  assert.match(
    messages(choice("{昨日|きのう} đọc là gì?", ["きのう", "あした"]))[0],
    /trùng đáp án/,
  );
  assert.match(
    messages(
      choice("「がっこう」 viết bằng kanji là chữ nào?", ["{学校|がっこう}", "{学生|がくせい}"]),
    )[0],
    /đáp án đúng trùng chữ trong đề/,
  );
});

test("the editor refuses to publish a lesson whose question shows its answer in furigana", () => {
  const state = parseLessonDraftState({
    metadata: {
      title: rawDraft.title,
      titleJa: rawDraft.titleJa,
      summary: rawDraft.summary,
      order: rawDraft.order,
      courseId: rawDraft.courseId,
    },
    content: rawDraft.content,
  });
  state.content.questions.push(fill("Viết cách đọc bằng hiragana: {私|わたし}", ["わたし"]));
  const problems = findPublishProblems(state).filter((problem) => problem.itemId === "q-furigana");
  assert.equal(problems.length, 1);
  assert.match(problems[0].message, /^Câu luyện \d+: furigana trên đề trùng đáp án/);
});

test("listening audio reads furigana as its reading and keeps the hash of plain transcripts", () => {
  const dictation = (id: string, transcript: string) =>
    ({
      ...base,
      id,
      type: "dictation",
      prompt: "Nghe và viết lại.",
      inputMode: "hiragana",
      kanjiStrict: false,
      answer: ["きのう"],
      audio: null,
      transcript,
      maxListens: null,
    }) satisfies DraftQuestion;
  const [ruby, plain] = planContentAudio(
    "lesson",
    {
      vocab: [],
      grammar: [],
      questions: [
        dictation("q-ruby", "{昨日|きのう}、{学校|がっこう}へ{行|い}きました。"),
        dictation("q-plain", "きのう がっこうへ いきました。"),
      ],
    },
    "ja-JP-NanamiNeural",
  );
  assert.equal(
    ruby.hash,
    audioHash(canonicalAudio("きのう、がっこうへいきました。", "ja-JP-NanamiNeural")),
  );
  assert.equal(
    plain.hash,
    audioHash(canonicalAudio("きのう がっこうへ いきました。", "ja-JP-NanamiNeural")),
  );
});

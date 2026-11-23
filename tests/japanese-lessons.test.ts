import assert from "node:assert/strict";
import { test } from "node:test";

import rawStarter from "../content/starters/minna-1-11.json";
import rawStarter12 from "../content/starters/minna-1-12.json";
import rawDraft from "../content/lessons/lesson-01.json";
import n4DailyBank from "../content/review-banks/n4-daily-with-listening.json";
import { audioHash, canonicalAudio } from "../lib/audio-config";
import { grammarRefs } from "../lib/grammar-links";
import {
  parseFurigana,
  splitJapaneseRuns,
  toPlainJapanese,
  toSpeechText,
} from "../lib/japanese-text";
import { planContentAudio } from "../lib/lesson-audio";
import {
  createSlide,
  findPublishProblems,
  parseLessonDraftState,
  toPublishableContent,
} from "../lib/lesson-draft";
import { lessonContentSchema, lessonDraftSchema, toPublicLesson } from "../lib/lesson-schema";
import { formatSlideTable, parseSlideTable } from "../lib/slide-table";
import { findStarterLesson, STARTER_LESSONS } from "../lib/starter-lessons";

import type { LessonDraft } from "../lib/lesson-schema";

function toDraftState(draft: LessonDraft | typeof rawDraft) {
  return parseLessonDraftState({
    metadata: {
      title: draft.title,
      titleJa: draft.titleJa,
      summary: draft.summary,
      order: draft.order,
      courseId: draft.courseId,
    },
    content: draft.content,
  });
}

test("furigana markup renders as ruby segments, speaks the reading and keeps plain text intact", () => {
  assert.deepEqual(parseFurigana("{教室|きょうしつ}に つくえが あります。"), [
    { text: "教室", reading: "きょうしつ" },
    { text: "に つくえが あります。" },
  ]);
  assert.equal(toSpeechText("{１週間|いっしゅうかん}に {２回|にかい}"), "いっしゅうかんに にかい");
  assert.equal(toPlainJapanese("{１週間|いっしゅうかん}に {２回|にかい}"), "１週間に ２回");
  // Unbalanced or empty markup is left as written instead of guessing.
  assert.equal(toSpeechText("{教室きょうしつ} {|かな}"), "{教室きょうしつ} {|かな}");
  assert.deepEqual(parseFurigana("わたしは がくせいです。"), [{ text: "わたしは がくせいです。" }]);
  // 〜 only shows where a word attaches, so voices skip it.
  assert.equal(toSpeechText("〜にん"), "にん");
  assert.deepEqual(splitJapaneseRuns("Đếm người: 〜人・〜台 (máy)"), [
    { text: "Đếm người: ", isJapanese: false },
    { text: "〜人・〜台", isJapanese: true },
    { text: " (máy)", isJapanese: false },
  ]);
});

test("example audio uses the furigana reading while plain sentences keep their hash", () => {
  const content = {
    vocab: [],
    grammar: [
      {
        id: "g1",
        pattern: "N",
        vi: "N",
        explain: "N",
        examples: [
          { jp: "{教室|きょうしつ}です。", vi: "Là phòng học.", audio: null },
          { jp: "わたしは がくせいです。", vi: "Tôi là sinh viên.", audio: null },
        ],
      },
    ],
    questions: [],
  };
  const [ruby, plain] = planContentAudio("lesson", content, "ja-JP-NanamiNeural");
  assert.equal(ruby.hash, audioHash(canonicalAudio("きょうしつです。", "ja-JP-NanamiNeural")));
  assert.equal(
    plain.hash,
    audioHash(canonicalAudio("わたしは がくせいです。", "ja-JP-NanamiNeural")),
  );
});

test("pasted or typed tables parse within the slide limits and round-trip", () => {
  const pasted = parseSlideTable("Số\t〜つ\t〜人\n1\tひとつ\tひとり\n\n2\tふたつ\tふたり\n");
  assert.ok("table" in pasted);
  assert.deepEqual(pasted.table, {
    columns: ["Số", "〜つ", "〜人"],
    rows: [
      ["1", "ひとつ", "ひとり"],
      ["2", "ふたつ", "ふたり"],
    ],
  });
  assert.equal(
    formatSlideTable(pasted.table),
    "Số\t〜つ\t〜人\n1\tひとつ\tひとり\n2\tふたつ\tふたり",
  );
  const typed = parseSlideTable("Gợi ý | Câu mẫu\nみかん・３ | みかんを みっつ かいました。");
  assert.ok("table" in typed);
  assert.deepEqual(typed.table.rows, [["みかん・３", "みかんを みっつ かいました。"]]);
  assert.deepEqual(parseSlideTable(""), { table: { columns: [], rows: [] } });
  assert.ok("error" in parseSlideTable("a|b|c|d|e|f|g"));
  assert.ok("error" in parseSlideTable(["A", ...Array.from({ length: 13 }, () => "x")].join("\n")));
});

test("dialogue and table slides explain what is missing before publishing", () => {
  const draft = toDraftState(rawDraft);
  const dialogue = createSlide("dialogue", "s-dialogue");
  const table = createSlide("table", "s-table");
  assert.ok(dialogue.type === "dialogue" && table.type === "table");
  assert.deepEqual(
    dialogue.lines.map((line) => line.speaker),
    ["A", "B"],
  );
  draft.content.slides.push(dialogue, table);
  const messages = () => findPublishProblems(draft).map((problem) => problem.message);
  assert.ok(messages().includes("Slide 10: nhập tiêu đề hội thoại."));
  assert.ok(messages().includes("Slide 11: nhập tiêu đề bảng."));
  dialogue.title = "Hội thoại";
  dialogue.lines[0].jp = "こんにちは。";
  table.title = "Bảng đếm";
  table.columns = ["Số", "〜つ"];
  table.rows = [["1", "ひとつ"], ["2"]];
  assert.ok(
    messages().includes(
      "Slide 10: mỗi lượt thoại cần người nói, câu tiếng Nhật và nghĩa tiếng Việt.",
    ),
  );
  assert.ok(messages().includes("Slide 11: mỗi hàng cần đúng 2 ô như dòng tiêu đề."));
  dialogue.lines = [{ speaker: "A", jp: "こんにちは。", vi: "Xin chào." }];
  table.rows = [
    ["1", "ひとつ"],
    ["2", "ふたつ"],
  ];
  assert.deepEqual(findPublishProblems(draft), []);
  const published = toPublishableContent(draft.content);
  assert.equal(published.slides.at(-1)?.type, "table");
  const ragged = structuredClone(published);
  const raggedTable = ragged.slides.at(-1);
  assert.ok(raggedTable?.type === "table");
  raggedTable.rows[1] = ["2"];
  assert.equal(lessonContentSchema.safeParse(ragged).success, false);
});

test("the Minna starters are registered in lesson order", () => {
  assert.deepEqual(
    STARTER_LESSONS.map((starter) => [starter.id, starter.draft.courseId, starter.draft.order]),
    [
      ["minna-1-01", "minna-1", 1],
      ["minna-1-02", "minna-1", 2],
      ["minna-1-03", "minna-1", 3],
      ["minna-1-04", "minna-1", 4],
      ["minna-1-05", "minna-1", 5],
      ["minna-1-06", "minna-1", 6],
      ["minna-1-07", "minna-1", 7],
      ["minna-1-08", "minna-1", 8],
      ["minna-1-09", "minna-1", 9],
      ["minna-1-10", "minna-1", 10],
      ["minna-1-11", "minna-1", 11],
      ["minna-1-12", "minna-1", 12],
      ["minna-1-13", "minna-1", 13],
      ["minna-1-14", "minna-1", 14],
      ["minna-1-15", "minna-1", 15],
      ["minna-1-16", "minna-1", 16],
      ["minna-1-17", "minna-1", 17],
      ["minna-1-18", "minna-1", 18],
      ["minna-1-19", "minna-1", 19],
      ["minna-1-20", "minna-1", 20],
      ["minna-1-21", "minna-1", 21],
      ["minna-1-22", "minna-1", 22],
      ["minna-1-23", "minna-1", 23],
      ["minna-1-24", "minna-1", 24],
      ["minna-1-25", "minna-1", 25],
      ["minna-2-26", "minna-2", 26],
      ["minna-2-27", "minna-2", 27],
      ["minna-2-28", "minna-2", 28],
      ["minna-2-29", "minna-2", 29],
      ["minna-2-30", "minna-2", 30],
      ["minna-2-31", "minna-2", 31],
      ["minna-2-32", "minna-2", 32],
      ["minna-2-33", "minna-2", 33],
      ["minna-2-34", "minna-2", 34],
      ["n4-grammar-map", "n4-grammar", 1],
      ["n4-grammar-1", "n4-grammar", 2],
      ["n4-grammar-2", "n4-grammar", 3],
      ["n4-grammar-3", "n4-grammar", 4],
      ["n4-grammar-4", "n4-grammar", 5],
      ["n4-grammar-5", "n4-grammar", 6],
      ["n4-grammar-6", "n4-grammar", 7],
      ["n4-grammar-7", "n4-grammar", 8],
      ["n4-grammar-8", "n4-grammar", 9],
      ["n4-tips-1", "n4-tips", 1],
      ["n4-tips-2", "n4-tips", 2],
      ["n4-tips-3", "n4-tips", 3],
      ["n4-tips-4", "n4-tips", 4],
      ["n4-tips-5", "n4-tips", 5],
      ["n4-tips-6", "n4-tips", 6],
      ["n4-tips-7", "n4-tips", 7],
    ],
  );
  assert.deepEqual(findStarterLesson("minna-1-11")?.draft, lessonDraftSchema.parse(rawStarter));
  assert.deepEqual(findStarterLesson("minna-1-12")?.draft, lessonDraftSchema.parse(rawStarter12));
});

for (const starter of STARTER_LESSONS) {
  test(`the ${starter.id} starter is a complete original lesson a teacher can publish as is`, () => {
    const { content } = starter.draft;
    const draft = toDraftState(starter.draft);
    assert.deepEqual(findPublishProblems(draft), []);
    assert.deepEqual(toPublishableContent(draft.content), content);
    // A Minna lesson has every kind of slide; an N4 review deck has no words, and its map is
    // tables of every pattern with no questions of its own.
    const isMap = starter.id === "n4-grammar-map";
    let required = ["vocab", "table", "grammar", "example", "dialogue", "quiz", "note"];
    if (starter.draft.courseId === "n4-grammar") {
      required = isMap ? ["title", "note", "table"] : required.slice(1);
    }
    // A tips deck is notes and tables with questions that apply them.
    if (starter.draft.courseId === "n4-tips") {
      required = ["title", "note", "table", "quiz"];
    }
    for (const type of required) {
      assert.ok(
        content.slides.some((slide) => slide.type === type),
        `missing a ${type} slide`,
      );
    }
    // Options keep their authored order on screen, so each position holds about a quarter of
    // the keys (the rule of the N4 bank): guessing one letter gives nothing away.
    const positions = [0, 0, 0, 0];
    for (const question of content.questions) {
      if (question.type === "choice" && question.answer.length === 1) {
        positions[question.answer[0]] += 1;
      }
    }
    const keys = positions.reduce((sum, count) => sum + count, 0);
    assert.ok(keys > 0 || isMap, "a lesson starter needs choice questions");
    assert.ok(
      positions.every((count) => count >= keys * 0.18 && count <= keys * 0.32),
      `answer positions ${positions.join("/")}`,
    );
    for (const question of content.questions) {
      if (question.type === "fill") {
        assert.equal(question.inputMode, "hiragana");
        assert.ok(question.answer.every((answer) => /^[\p{Script=Hiragana}ー]+$/u.test(answer)));
      }
    }
    const serialized = JSON.stringify(
      toPublicLesson({
        ...starter.draft,
        id: "6f4c2f9a-3f61-4c56-9d0f-2b8f3a6a9e11",
        lessonId: starter.id,
        versionNo: 1,
        publishedAt: "2026-10-29T00:00:00.000Z",
      }),
    );
    assert.equal(serialized.includes("teacherNotes"), false);
    assert.equal(serialized.includes('"answer"'), false);
  });
}

test("the N4 review decks tag every question with a point they explain, and the map lists all", () => {
  const decks = STARTER_LESSONS.filter(
    (starter) => starter.draft.courseId === "n4-grammar" && starter.id !== "n4-grammar-map",
  );
  const map = findStarterLesson("n4-grammar-map")?.draft.content;
  assert.ok(map);
  const mapped = new Set(
    map.slides.flatMap((slide) => (slide.type === "table" ? slide.rows.map((row) => row[0]) : [])),
  );
  const seen = new Set<string>();
  for (const deck of decks) {
    const { grammar, questions } = deck.draft.content;
    for (const point of grammar) {
      assert.equal(seen.has(point.id), false, `${point.id} is in two decks`);
      seen.add(point.id);
      assert.ok(mapped.has(point.pattern), `the map misses ${point.pattern}`);
    }
    for (const question of questions) {
      const refs = grammarRefs(question.tags);
      assert.ok(refs.length > 0, `${question.id} names no grammar point`);
      assert.ok(
        refs.every((ref) => grammar.some((point) => point.id === ref)),
        `${question.id} names a point outside ${deck.id}`,
      );
    }
  }
  assert.equal(decks.length, 8);
  // Việt's daily N4 bank links its grammar questions to these points after an answer.
  const bankRefs = n4DailyBank.content.questions.flatMap((question) => grammarRefs(question.tags));
  assert.ok(bankRefs.length >= 100);
  assert.deepEqual(
    bankRefs.filter((ref) => !seen.has(ref)),
    [],
  );
});

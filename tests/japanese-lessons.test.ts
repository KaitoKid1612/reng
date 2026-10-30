import assert from "node:assert/strict";
import { test } from "node:test";

import rawStarter from "../content/starters/minna-1-11.json";
import rawStarter12 from "../content/starters/minna-1-12.json";
import rawDraft from "../content/lessons/lesson-01.json";
import { audioHash, canonicalAudio } from "../lib/audio-config";
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
      ["minna-1-11", "minna-1", 11],
      ["minna-1-12", "minna-1", 12],
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
    for (const type of ["vocab", "table", "grammar", "example", "dialogue", "quiz", "note"]) {
      assert.ok(
        content.slides.some((slide) => slide.type === type),
        `missing a ${type} slide`,
      );
    }
    // Options keep their authored order on screen, so answers must not sit in one position.
    const positions = content.questions.flatMap((question) =>
      question.type === "choice" ? question.answer : [],
    );
    assert.ok(new Set(positions).size > 2);
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

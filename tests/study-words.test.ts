import assert from "node:assert/strict";
import { test } from "node:test";

import rawCatalog from "../content/lesson-catalog.json";
import { lessonCatalogSchema } from "../lib/lesson-schema";
import { toStudyWords } from "../lib/study-words";
import { createTeachingDraft, teachingVersionSchema } from "../lib/teaching-content";

test("Japanese words keep the kanji, kana, romaji and voice they showed before", () => {
  const [version] = lessonCatalogSchema.parse(rawCatalog).versions;
  const words = toStudyWords(version);
  const watashi = words.find((word) => word.id === "v0103");
  assert.deepEqual(watashi, {
    id: "v0103",
    front: "私",
    lang: "ja",
    reading: "わたし",
    readingLang: "ja",
    romanization: "watashi",
    meaning: "tôi",
    spokenText: "わたし",
    audioLabel: "watashi",
    audio: watashi?.audio ?? null,
    locale: "ja-JP",
  });
  const greeting = words.find((word) => word.id === "v0101");
  assert.equal(greeting?.front, "こんにちは");
  assert.equal(greeting?.reading, "", "kana written the same as the kanji field shows once");
});

test("Chinese words use characters, pinyin and the lesson's voice locale", () => {
  const draft = createTeachingDraft("Chào hỏi", "starter", "zh-Hant", "Chào");
  const version = teachingVersionSchema.parse({
    id: "00000000-0000-4000-8000-000000000031",
    lessonId: "lesson-trad",
    versionNo: 1,
    publishedAt: "2026-10-29T03:00:00.000+00:00",
    title: "Chào hỏi",
    summary: "Chào",
    order: 1,
    courseId: "chinese",
    isSample: false,
    content: {
      ...draft.content,
      vocab: [
        {
          id: "vocab-1",
          text: "謝謝",
          reading: "xièxie",
          meaning: "cảm ơn",
          examples: [],
          audio: null,
        },
      ],
      slides: [{ id: "g-title", type: "title", text: "Chào hỏi" }],
    },
  });
  assert.deepEqual(toStudyWords(version), [
    {
      id: "vocab-1",
      front: "謝謝",
      lang: "zh-Hant",
      reading: "xièxie",
      romanization: "",
      meaning: "cảm ơn",
      spokenText: "謝謝",
      audioLabel: "xièxie",
      audio: null,
      locale: "zh-TW",
    },
  ]);
});

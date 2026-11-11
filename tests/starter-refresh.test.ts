import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLessonDraftState } from "../lib/lesson-draft";
import {
  canonicalJson,
  compareWithStarter,
  findStarterForLesson,
  findStarterLesson,
} from "../lib/starter-lessons";

test("only a lesson created from a known starter can be refreshed from it", () => {
  assert.equal(findStarterForLesson("starter:minna-1-12")?.id, "minna-1-12");
  assert.equal(findStarterForLesson("starter:minna-9-99"), undefined);
  assert.equal(findStarterForLesson("0f3c2a"), undefined, "a shared copy or a new lesson");
  assert.equal(findStarterForLesson(null), undefined);
});

function sectionOf(sections: ReturnType<typeof compareWithStarter>, label: string) {
  const section = sections.find((item) => item.label === label);
  assert.ok(section, label);
  return section;
}

const METADATA = { title: "Bài 12 — lớp tối", titleJa: "", summary: "", order: 12, courseId: "n5" };

test("a draft still equal to the latest starter has nothing to refresh, whatever its key order", () => {
  const starter = findStarterLesson("minna-1-12");
  assert.ok(starter);
  // Postgres jsonb hands objects back with their keys reordered.
  const reordered = JSON.parse(
    JSON.stringify(starter.draft.content, (_key, value: unknown) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    ),
  ) as unknown;
  const draft = parseLessonDraftState({ metadata: METADATA, content: reordered });
  const latest = parseLessonDraftState({ metadata: METADATA, content: starter.draft.content });
  assert.ok(compareWithStarter(draft.content, latest.content).every((section) => section.isSame));
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 3, c: undefined }] }), '{"a":[2,{"d":3}],"b":1}');
});

test("the comparison names which parts differ from the starter and counts their items", () => {
  const starter = findStarterLesson("minna-1-12");
  assert.ok(starter);
  const latest = starter.draft.content;
  // A draft made before the pictures existed: same text, no picture fields.
  const older = parseLessonDraftState({
    metadata: METADATA,
    content: {
      ...latest,
      vocab: latest.vocab.map((item) => ({ ...item, image: undefined })),
      slides: latest.slides
        .filter((slide) => slide.type !== "image")
        .map((slide) => (slide.type === "title" ? { ...slide, image: undefined } : slide)),
    },
  });
  const sections = compareWithStarter(older.content, latest);
  assert.deepEqual(
    sections.map((section) => [section.label, section.isSame]),
    [
      ["Từ vựng", false],
      ["Mẫu câu", true],
      ["Slide", false],
      ["Câu luyện", true],
      ["Hình minh họa", false],
    ],
  );
  const pictures = sectionOf(sections, "Hình minh họa");
  assert.equal(pictures.draftCount, 0);
  assert.ok(pictures.starterCount > 40, "lesson 12 has vocabulary pictures and picture slides");
  const slides = sectionOf(sections, "Slide");
  assert.equal(slides.starterCount, latest.slides.length);
  assert.ok(slides.draftCount < slides.starterCount);
  assert.equal(sectionOf(sections, "Câu luyện").draftCount, latest.questions.length);
});

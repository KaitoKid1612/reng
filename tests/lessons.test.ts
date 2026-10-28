import assert from "node:assert/strict";
import { test } from "node:test";

import rawCatalog from "../content/lesson-catalog.json";
import rawDraft from "../content/lessons/lesson-01.json";
import {
  applyContentAudio,
  applyLessonAudio,
  planContentAudio,
  planLessonAudio,
} from "../lib/lesson-audio";
import { findPublicVersion, publishLocalLesson } from "../lib/lesson-catalog";
import { lessonCatalogSchema, lessonDraftSchema, toPublicLesson } from "../lib/lesson-schema";
import { parseSlideHash, slideMessageSchema } from "../lib/slide-navigation";

const catalog = lessonCatalogSchema.parse(rawCatalog);
const draft = lessonDraftSchema.parse(rawDraft);

test("validates five original sample lessons and removes private/public-feedback fields from DTOs", () => {
  assert.equal(catalog.lessons.length, 5);
  for (const version of catalog.versions) {
    const serialized = JSON.stringify(toPublicLesson(version));
    assert.equal(serialized.includes("teacherNotes"), false);
    assert.equal(serialized.includes("PRIVATE_TEACHER_NOTE"), false);
    assert.equal(serialized.includes('"answer"'), false);
    assert.equal(serialized.includes('"transcript"'), false);
  }
});

test("rejects dangling references, duplicate identifiers, unsafe media and invalid answers", () => {
  const dangling = structuredClone(rawDraft);
  const vocabSlide = dangling.content.slides.find((slide) => slide.type === "vocab");
  assert.ok(vocabSlide);
  vocabSlide.refs = ["missing-item"];
  assert.equal(lessonDraftSchema.safeParse(dangling).success, false);
  const duplicate = structuredClone(rawDraft);
  duplicate.content.vocab[1].id = duplicate.content.vocab[0].id;
  assert.equal(lessonDraftSchema.safeParse(duplicate).success, false);
  const invalidAnswer = structuredClone(rawDraft);
  invalidAnswer.content.questions[0].answer = [99];
  assert.equal(lessonDraftSchema.safeParse(invalidAnswer).success, false);
  const unsafeImage = {
    ...rawDraft,
    content: {
      ...rawDraft.content,
      slides: [{ id: "image-slide", type: "image", src: "javascript:alert(1)", alt: "Unsafe" }],
    },
  };
  assert.equal(lessonDraftSchema.safeParse(unsafeImage).success, false);
});

test("publishing preserves old versions and rejects stale revisions", () => {
  const previous = findPublicVersion(catalog, draft.id);
  assert.ok(previous);
  const next = publishLocalLesson(catalog, { ...draft, title: "Updated title" }, 1);
  assert.equal(findPublicVersion(next, draft.id)?.versionNo, 2);
  assert.equal(findPublicVersion(next, draft.id, previous.id)?.title, previous.title);
  assert.equal(findPublicVersion(catalog, draft.id)?.versionNo, 1);
  assert.throws(() => publishLocalLesson(next, draft, 1), /Revision conflict/);
  assert.equal(findPublicVersion(next, draft.id, catalog.versions[1].id), undefined);
});

test("class-only content cannot be obtained through public version lookup", () => {
  const privateCatalog = structuredClone(catalog);
  privateCatalog.lessons[0].visibility = "class";
  assert.equal(findPublicVersion(privateCatalog, privateCatalog.lessons[0].id), undefined);
});

test("lesson audio updates only cloned drafts and leaves published snapshots unchanged", () => {
  const plan = planLessonAudio([draft], "ja-JP-NanamiNeural");
  assert.equal(
    plan.length,
    draft.content.vocab.length +
      draft.content.grammar.flatMap((grammar) => grammar.examples).length,
  );
  const next = applyLessonAudio(
    draft,
    Object.fromEntries(plan.map((asset) => [asset.itemId, asset.hash])),
  );
  assert.ok(next.content.vocab[0].audio);
  assert.equal(draft.content.vocab[0].audio, null);
  assert.equal(catalog.versions[0].content.vocab[0].audio, null);
});

test("listening transcripts get audio plans while unfinished text is skipped", () => {
  const content = {
    vocab: [{ id: "v-blank", jp: " ", romaji: "", vi: "", audio: null }],
    grammar: [],
    questions: [
      {
        id: "q-listen",
        type: "listen" as const,
        prompt: "Nghe",
        explain: "Giải thích",
        points: 1,
        tags: [],
        transcript: "がっこうへいきます。",
        audio: null,
        maxListens: null,
        responseType: "fill" as const,
        answer: ["がっこう"],
      },
      {
        id: "q-empty",
        type: "dictation" as const,
        prompt: "Nghe",
        explain: "Giải thích",
        points: 1,
        tags: [],
        transcript: "",
        audio: null,
        maxListens: null,
        inputMode: "hiragana" as const,
        kanjiStrict: false,
        answer: [],
      },
    ],
  };
  const plan = planContentAudio("lesson-09", content, "ja-JP-NanamiNeural");
  assert.deepEqual(
    plan.map((asset) => [asset.itemId, asset.config.text]),
    [["lesson-09:question:q-listen", "がっこうへいきます。"]],
  );
  const next = applyContentAudio("lesson-09", content, { [plan[0].itemId]: plan[0].hash });
  assert.equal(next.questions[0].audio, plan[0].hash);
  assert.equal(next.questions[1].audio, null);
  assert.equal(content.questions[0].audio, null, "the input draft is not mutated");
});

test("slide hash and presenter messages reject invalid indices and unexpected fields", () => {
  assert.deepEqual(parseSlideHash("#5", 9), { index: 4, isValid: true });
  assert.deepEqual(parseSlideHash("#0", 9), { index: 0, isValid: false });
  assert.equal(parseSlideHash("#999", 9).isValid, false);
  assert.equal(
    slideMessageSchema.safeParse({ type: "position", index: -1, fragment: 0 }).success,
    false,
  );
  assert.equal(
    slideMessageSchema.safeParse({ type: "command", command: "next", notes: "private" }).success,
    false,
  );
});

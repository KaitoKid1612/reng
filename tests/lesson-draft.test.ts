import assert from "node:assert/strict";
import { test } from "node:test";

import rawDraft from "../content/lessons/lesson-01.json";
import {
  AUDIO_COMMAND,
  countMissingAudio,
  countMissingListeningAudio,
  createItemId,
  createSlide,
  EMPTY_DRAFT_CONTENT,
  findPublishProblems,
  findReferencingSlides,
  listAudioHashes,
  parseLessonDraftState,
  toPublishableContent,
} from "../lib/lesson-draft";
import { lessonContentSchema } from "../lib/lesson-schema";

const sample = parseLessonDraftState({
  metadata: {
    title: rawDraft.title,
    titleJa: rawDraft.titleJa,
    summary: rawDraft.summary,
    order: rawDraft.order,
    courseId: rawDraft.courseId,
  },
  content: rawDraft.content,
});

test("published lessons load as drafts and publish to the same strict content", () => {
  assert.deepEqual(findPublishProblems(sample), []);
  assert.deepEqual(
    toPublishableContent(sample.content),
    lessonContentSchema.parse(rawDraft.content),
  );
  assert.equal(countMissingAudio(sample.content), 8);
});

test("unfinished drafts save but publishing explains every missing piece in Vietnamese", () => {
  const empty = parseLessonDraftState({
    metadata: { title: "", titleJa: "", summary: "", order: 6, courseId: "n5" },
    content: EMPTY_DRAFT_CONTENT,
  });
  assert.deepEqual(
    findPublishProblems(empty).map((problem) => problem.message),
    [
      "Nhập tiêu đề tiếng Việt.",
      "Nhập tiêu đề tiếng Nhật.",
      "Nhập tóm tắt bài.",
      "Bài cần ít nhất một slide.",
    ],
  );
  const broken = structuredClone(sample);
  broken.content.vocab[0].vi = " ";
  broken.content.slides.push({ id: "s-extra", type: "vocab", refs: ["v-missing"] });
  broken.content.slides.push(createSlide("image", "s-image"));
  const choice = broken.content.questions[0];
  assert.ok(choice.type === "choice");
  choice.answer = [];
  const messages = findPublishProblems(broken).map((problem) => problem.message);
  assert.ok(messages.includes("Từ vựng 1 (こんにちは): thiếu nghĩa tiếng Việt."));
  assert.ok(messages.includes("Câu luyện 1: chọn đáp án đúng trong các lựa chọn."));
  assert.ok(messages.some((message) => message.endsWith("có từ vựng không còn trong bài.")));
  assert.ok(messages.some((message) => message.includes("đường dẫn ảnh")));
});

test("references, identifiers and optional fields follow the content contract", () => {
  const vocabId = sample.content.vocab[0].id;
  assert.deepEqual(
    findReferencingSlides(sample.content, vocabId).map((slide) => slide.type),
    ["vocab"],
  );
  let call = 0;
  const repeating = () => [0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5][call++ % 12];
  const withFirst = structuredClone(sample.content);
  const firstId = createItemId("vocab", withFirst, repeating);
  withFirst.vocab.push({ ...withFirst.vocab[0], id: firstId });
  call = 0;
  const secondId = createItemId("vocab", withFirst, repeating);
  assert.match(firstId, /^v-[a-z2-9]{6}$/);
  assert.notEqual(secondId, firstId, "an existing ID is never handed out again");
  const blankOptional = structuredClone(sample);
  blankOptional.content.vocab[0].kanji = "";
  assert.equal("kanji" in toPublishableContent(blankOptional.content).vocab[0], false);
  assert.throws(() =>
    parseLessonDraftState({ ...sample, content: { ...sample.content, extra: true } }),
  );
});

test("listening questions publish only with a transcript, valid answers and generated audio", () => {
  const draft = parseLessonDraftState({
    ...sample,
    content: {
      ...sample.content,
      questions: [
        ...sample.content.questions,
        {
          id: "q-listen",
          type: "listen",
          prompt: "Người nói đi đâu?",
          explain: "がっこう là trường học.",
          points: 1,
          tags: [],
          transcript: "",
          audio: null,
          maxListens: 2,
          responseType: "choice",
          options: ["がっこう", "えき"],
          answer: [],
        },
        {
          id: "q-dictation",
          type: "dictation",
          prompt: "Nghe và viết lại",
          explain: "Câu giới thiệu.",
          points: 2,
          tags: [],
          transcript: "わたしはがくせいです。",
          audio: null,
          maxListens: null,
          inputMode: "hiragana",
          kanjiStrict: false,
          answer: ["わたしはがくせいです", " "],
        },
      ],
    },
  });
  const messages = () => findPublishProblems(draft).map((problem) => problem.message);
  assert.ok(messages().includes("Câu luyện 2: nhập transcript tiếng Nhật để tạo audio."));
  assert.ok(messages().includes(`Câu luyện 3: chưa có audio. Lưu nháp rồi chạy ${AUDIO_COMMAND}.`));
  assert.equal(countMissingListeningAudio(draft.content), 2);

  const [, listen, dictation] = draft.content.questions;
  assert.ok(listen.type === "listen" && dictation.type === "dictation");
  listen.transcript = "がっこうへいきます。";
  assert.ok(messages().includes("Câu luyện 2: chọn đáp án đúng trong các lựa chọn."));
  listen.answer = [0];
  listen.audio = "a".repeat(32);
  dictation.audio = "b".repeat(32);
  assert.deepEqual(messages(), []);
  assert.deepEqual(listAudioHashes(draft.content).slice(-2), ["a".repeat(32), "b".repeat(32)]);
  const published = toPublishableContent(draft.content);
  assert.deepEqual(published.questions[2].answer, ["わたしはがくせいです"]);

  const quizSlide = { ...createSlide("quiz", "s-listen-quiz"), ref: "q-listen" };
  draft.content.slides.push(quizSlide);
  assert.ok(
    messages().some((message) => message.endsWith("chọn câu luyện trắc nghiệm hoặc điền từ.")),
  );
  draft.content.slides.pop();

  // Switching to a typed answer leaves stale options behind; they never reach the snapshot.
  listen.responseType = "fill";
  listen.answer = ["がっこう", ""];
  assert.deepEqual(messages(), []);
  const typed = toPublishableContent(draft.content).questions[1];
  assert.equal("options" in typed && typed.options !== undefined, false);
  assert.deepEqual(typed.answer, ["がっこう"]);
});

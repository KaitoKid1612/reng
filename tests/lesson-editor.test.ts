import assert from "node:assert/strict";
import { test } from "node:test";

import rawDraft from "../content/lessons/lesson-01.json";
import { parseLessonDraftState } from "../lib/lesson-draft";
import { createEditorState, editorReducer, moveItem } from "../lib/lesson-editor";

import type { DraftQuestion } from "../lib/lesson-draft";

const initial = createEditorState(
  parseLessonDraftState({
    metadata: {
      title: rawDraft.title,
      titleJa: rawDraft.titleJa,
      summary: rawDraft.summary,
      order: rawDraft.order,
      courseId: rawDraft.courseId,
    },
    content: {
      ...rawDraft.content,
      vocab: rawDraft.content.vocab.map((item, index) =>
        index === 0 ? { ...item, audio: "a".repeat(32) } : item,
      ),
    },
  }),
);

test("items used by a slide cannot be removed until the slide changes", () => {
  const vocabId = initial.draft.content.vocab[0].id;
  assert.equal(editorReducer(initial, { type: "removeVocab", id: vocabId }), initial);
  const unused = editorReducer(initial, { type: "addVocab", id: "v-unused" });
  const removed = editorReducer(unused, { type: "removeVocab", id: "v-unused" });
  assert.equal(removed.draft.content.vocab.length, initial.draft.content.vocab.length);
  assert.equal(removed.changeCount, 2);
});

test("editing Japanese text clears audio that no longer matches it", () => {
  const vocabId = initial.draft.content.vocab[0].id;
  const meaningOnly = editorReducer(initial, {
    type: "updateVocab",
    id: vocabId,
    patch: { vi: "chào bạn" },
  });
  assert.equal(meaningOnly.draft.content.vocab[0].audio, "a".repeat(32));
  const reading = editorReducer(meaningOnly, {
    type: "updateVocab",
    id: vocabId,
    patch: { jp: "こんばんは" },
  });
  assert.equal(reading.draft.content.vocab[0].audio, null);
});

test("editing a listening transcript clears audio generated from the old text", () => {
  const question: DraftQuestion = {
    id: "q-dictation",
    type: "dictation",
    prompt: "Nghe và viết lại",
    explain: "Câu giới thiệu.",
    points: 1,
    tags: [],
    transcript: "わたしはがくせいです。",
    audio: "c".repeat(32),
    maxListens: null,
    inputMode: "hiragana",
    kanjiStrict: false,
    answer: ["わたしはがくせいです"],
  };
  const audioOf = (state: typeof initial) => {
    const item = state.draft.content.questions.find((entry) => entry.id === question.id);
    return item && "audio" in item ? item.audio : undefined;
  };
  const added = editorReducer(initial, { type: "addQuestion", question });
  const prompt = editorReducer(added, {
    type: "updateQuestion",
    question: { ...question, prompt: "Nghe kỹ rồi viết" },
  });
  assert.equal(audioOf(prompt), "c".repeat(32));
  const transcript = editorReducer(prompt, {
    type: "updateQuestion",
    question: { ...question, transcript: "わたしはせんせいです。" },
  });
  assert.equal(audioOf(transcript), null);
});

test("slides are inserted after the selection, reordered and removed predictably", () => {
  const selected = editorReducer(initial, {
    type: "selectSlide",
    id: initial.draft.content.slides[1].id,
  });
  const added = editorReducer(selected, { type: "addSlide", slideType: "note", id: "s-new" });
  assert.equal(added.draft.content.slides[2].id, "s-new");
  assert.equal(added.selectedSlideId, "s-new");
  const moved = editorReducer(added, { type: "moveSlide", from: 2, to: 0 });
  assert.equal(moved.draft.content.slides[0].id, "s-new");
  const removed = editorReducer(moved, { type: "removeSlide", id: "s-new" });
  assert.equal(removed.selectedSlideId, initial.draft.content.slides[0].id);
  assert.deepEqual(moveItem([1, 2, 3], 0, 5), [1, 2, 3]);
});

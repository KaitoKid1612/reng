import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { editorDraftKey, keepEditorDraft, restoreEditorDraft } from "../lib/local-draft";

// The editor backup lives in localStorage; a Map stands in for the browser here.
const storage = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => void storage.set(key, value),
      removeItem: (key: string) => void storage.delete(key),
    },
  },
});

interface Draft {
  title: string;
  slides: string[];
}

const parse = (value: unknown) => value as Draft;
const LESSON = "lesson-12";

beforeEach(() => storage.clear());

test("edits made after a save whose reply was lost survive a reload", () => {
  const sent: Draft = { title: "Bài 12", slides: ["a"] };
  // The save reached the server (revision 4 → 5) but its reply was lost.
  keepEditorDraft(LESSON, 4, sent, sent);
  // The teacher keeps typing; the periodic backup must not forget what was sent.
  keepEditorDraft(LESSON, 4, { title: "Bài 12", slides: ["a", "b"] });
  // The server copy comes back with keys in another order, as from the database.
  const serverDraft = JSON.parse('{"slides":["a"],"title":"Bài 12"}') as Draft;
  const restored = restoreEditorDraft(LESSON, 5, parse, serverDraft);
  assert.deepEqual(restored?.draft, { title: "Bài 12", slides: ["a", "b"] });
});

test("a copy based on an older revision is dropped when another tab saved newer work", () => {
  keepEditorDraft(LESSON, 4, { title: "Bài 12", slides: ["a"] }, { title: "Bài 12", slides: [] });
  const fromOtherTab: Draft = { title: "Bài 12 – sửa ở máy khác", slides: ["z"] };
  assert.equal(restoreEditorDraft(LESSON, 5, parse, fromOtherTab), null);
  assert.equal(storage.has(editorDraftKey(LESSON)), false);
});

test("edits on the loaded revision restore as before, and a new base forgets old sends", () => {
  keepEditorDraft(LESSON, 7, { title: "x", slides: [] }, { title: "x", slides: [] });
  keepEditorDraft(LESSON, 8, { title: "y", slides: [] });
  const backup = JSON.parse(storage.get(editorDraftKey(LESSON)) ?? "{}") as {
    unconfirmed: unknown[];
  };
  assert.deepEqual(backup.unconfirmed, []);
  const restored = restoreEditorDraft(LESSON, 8, parse, { title: "server", slides: [] });
  assert.equal(restored?.draft.title, "y");
});

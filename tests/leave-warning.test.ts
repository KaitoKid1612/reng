import assert from "node:assert/strict";
import { test } from "node:test";

import { isInPlaceNavigation } from "../lib/leave-warning";

const EDITOR = "https://reng.example/teach/lessons/lesson-01/edit";
const PLAIN_CLICK = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

function link(href: string, target = "", hasDownload = false) {
  return { href, target, hasDownload };
}

test("a plain click on another page of the site leaves the editor in place", () => {
  assert.equal(isInPlaceNavigation(link("/teach"), PLAIN_CLICK, EDITOR), true);
  assert.equal(
    isInPlaceNavigation(link("/teach/lessons/lesson-01/edit?tab=slides"), PLAIN_CLICK, EDITOR),
    true,
  );
});

test("new tabs, downloads, anchors and other sites do not need the in-page prompt", () => {
  assert.equal(isInPlaceNavigation(link("/teach", "_blank"), PLAIN_CLICK, EDITOR), false);
  assert.equal(isInPlaceNavigation(link("/export.csv", "", true), PLAIN_CLICK, EDITOR), false);
  assert.equal(isInPlaceNavigation(link("#slides-title"), PLAIN_CLICK, EDITOR), false);
  // Leaving the site unloads the page, so the browser's own prompt covers it.
  assert.equal(isInPlaceNavigation(link("https://meet.google.com/x"), PLAIN_CLICK, EDITOR), false);
});

test("modified and non-left clicks open somewhere else", () => {
  for (const click of [
    { ...PLAIN_CLICK, metaKey: true },
    { ...PLAIN_CLICK, ctrlKey: true },
    { ...PLAIN_CLICK, shiftKey: true },
    { ...PLAIN_CLICK, button: 1 },
  ]) {
    assert.equal(isInPlaceNavigation(link("/teach"), click, EDITOR), false);
  }
});

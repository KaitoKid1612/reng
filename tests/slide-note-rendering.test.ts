import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SlideContent } from "../components/slides/slide-content";
import { lessonCatalogSchema, toPublicLesson } from "../lib/lesson-schema";

test("published note slides render escaped line breaks as separate lines", () => {
  const catalog = lessonCatalogSchema.parse(
    JSON.parse(readFileSync("content/lesson-catalog.json", "utf8")),
  );
  const version = catalog.versions[0];
  assert.ok(version);
  const lesson = toPublicLesson(version);
  const slide = {
    id: "legacy-note",
    type: "note" as const,
    title: "Mục tiêu",
    body: "Xin phép: Vてもいいですか。\\nCấm đoán: Vてはいけません。",
  };

  const html = renderToStaticMarkup(createElement(SlideContent, { slide, lesson }));

  assert.match(html, /\n/);
  assert.doesNotMatch(html, /\\n/);
});

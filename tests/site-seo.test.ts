import assert from "node:assert/strict";
import { test } from "node:test";

import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { loadPublicLesson } from "../lib/lesson-repository";
import { describeLessonForSearch, lessonJsonLd } from "../lib/lesson-seo";
import { serializeJsonLd, toMetaDescription } from "../lib/site";

test("robots keeps private and presentation routes out and points to the sitemap", () => {
  process.env.SITE_URL = "https://masu.example";
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  for (const path of ["/admin", "/teach", "/classes", "/assignments", "/lessons/*/slide"]) {
    assert.ok([rules.disallow].flat().includes(path), path);
  }
  assert.equal(rules.allow, "/");
  assert.equal(result.sitemap, "https://masu.example/sitemap.xml");
});

test("the sitemap lists public pages and public lessons without version parameters", async () => {
  process.env.SITE_URL = "https://masu.example";
  process.env.LESSON_SOURCE = "local";
  const urls = (await sitemap()).map((entry) => entry.url);
  assert.ok(urls.includes("https://masu.example/"));
  assert.ok(urls.includes("https://masu.example/for-teachers"));
  assert.ok(urls.includes("https://masu.example/lessons/lesson-01"));
  assert.ok(urls.every((url) => !url.includes("?") && !new URL(url).pathname.startsWith("/teach")));
});

test("lesson metadata is short, escaped and describes the lesson", async () => {
  process.env.LESSON_SOURCE = "local";
  const lesson = await loadPublicLesson("lesson-01");
  assert.ok(lesson);
  assert.ok(describeLessonForSearch(lesson).length <= 160);
  const jsonLd = lessonJsonLd(lesson);
  assert.equal(jsonLd["@type"], "LearningResource");
  assert.equal(jsonLd.inLanguage, "ja");
  assert.equal(toMetaDescription("a ".repeat(200)).length, 160);
  assert.equal(serializeJsonLd({ name: "</script><b>" }).includes("<"), false);
});

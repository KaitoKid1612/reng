import assert from "node:assert/strict";
import { test } from "node:test";

import { googleCallbackPath, safeNextPath, signInErrorPath } from "../lib/auth-paths";

test("keeps same-site paths with their query and hash", () => {
  assert.equal(safeNextPath("/classes", "/"), "/classes");
  assert.equal(safeNextPath("/join-class?code=ABCD2345", "/"), "/join-class?code=ABCD2345");
  assert.equal(
    safeNextPath("/lessons/lesson-01/presenter?version=1#3", "/"),
    "/lessons/lesson-01/presenter?version=1#3",
  );
});

test("rejects destinations a browser would resolve to another site", () => {
  for (const value of [
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example/login",
    "/\n/evil.example",
    "/\r/evil.example",
    "https://evil.example",
    "evil.example",
    "",
    null,
    ["/classes"],
    `/${"a".repeat(300)}`,
  ]) {
    assert.equal(safeNextPath(value, "/fallback"), "/fallback", JSON.stringify(value));
  }
});

test("Google sign-in returns to the callback with the page to open afterwards", () => {
  assert.equal(googleCallbackPath(""), "/auth/callback");
  assert.equal(
    googleCallbackPath("/join-class?code=ABCD2345"),
    "/auth/callback?next=%2Fjoin-class%3Fcode%3DABCD2345",
  );
  // The class code stays inside "next", so Supabase's own ?code= on the callback cannot clash.
  const callback = new URL(
    `${googleCallbackPath("/join-class?code=ABCD2345")}&code=oauth`,
    "https://reng.invalid",
  );
  assert.equal(callback.searchParams.get("code"), "oauth");
  assert.equal(callback.searchParams.get("next"), "/join-class?code=ABCD2345");
});

test("sign-in errors keep the page the person was heading to", () => {
  assert.equal(signInErrorPath("link", ""), "/sign-in?error=link");
  assert.equal(
    signInErrorPath("google-cancelled", "/teach/start"),
    "/sign-in?error=google-cancelled&next=%2Fteach%2Fstart",
  );
});

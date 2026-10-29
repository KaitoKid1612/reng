import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import {
  emailDateOf,
  emailIdempotencyKey,
  isDueSoon,
  nextRetryAt,
} from "../lib/notifications/schedule";
import {
  escapeHtml,
  renderDailyReminder,
  renderTeacherDigest,
  renderWeeklySummary,
} from "../lib/notifications/templates";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "../lib/notifications/unsubscribe";
import { verifyWebhookSignature } from "../lib/notifications/webhook-signature";

const USER = "00000000-0000-4000-8000-000000000001";
const footer = {
  reason: "Bạn nhận thư này vì đã bật nhắc học trên Reng.",
  settingsUrl: "https://reng.example/settings/notifications",
  unsubscribeUrl: "https://reng.example/unsubscribe/token",
};

test("reminder subjects name the learner and a concrete number, with escaped content", () => {
  const email = renderDailyReminder({
    ...footer,
    name: "Nguyễn Thu Hà",
    streak: 4,
    dueCards: 12,
    assignments: [{ title: '<script>alert("x")</script>', dueAt: "2026-10-29T13:00:00Z" }],
    word: { front: "行きます", reading: "いきます", meaning: "đi", lang: "ja" },
    reviewUrl: "https://reng.example/review",
    assignmentsUrl: "https://reng.example/classes",
  });
  assert.equal(email.subject, "Hà ơi, hôm nay có 12 thẻ cần ôn");
  assert.ok(email.text.includes("行きます (いきます): đi"), "the Japanese word line is unchanged");
  assert.ok(email.html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"));
  assert.equal(email.html.includes("<script>"), false);
  assert.ok(email.html.includes("Ôn 12 thẻ ngay"));
  assert.ok(email.text.includes("Hủy nhận email: https://reng.example/unsubscribe/token"));
  assert.equal(email.html.includes(" · "), false, "footer links are not joined with middle dots");
  const dueOnly = renderDailyReminder({
    ...footer,
    name: "",
    streak: 0,
    dueCards: 0,
    assignments: [{ title: "Bài 1", dueAt: "2026-10-29T13:00:00Z" }],
    word: null,
    reviewUrl: "r",
    assignmentsUrl: "a",
  });
  assert.equal(dueOnly.subject, "Bạn ơi, “Bài 1” sắp đến hạn");
  assert.equal(escapeHtml(`&'"`), "&amp;&#39;&quot;");
});

test("weekly and teacher summaries compare weeks and list classes needing attention", () => {
  const weekly = renderWeeklySummary({
    ...footer,
    name: "Bình",
    thisWeek: { reviews: 30, submissions: 2, averagePercent: 84.6 },
    lastWeek: { reviews: 20, submissions: 2, averagePercent: null },
    progressUrl: "p",
  });
  assert.equal(weekly.subject, "Bình ơi, tuần này bạn ôn 30 thẻ");
  assert.ok(weekly.text.includes("Lượt ôn thẻ: 30 (tăng 10 so với tuần trước)."));
  assert.ok(weekly.text.includes("Điểm trung bình tuần này: 85%."));
  const digest = renderTeacherDigest({
    ...footer,
    name: "Cô Lan",
    classes: [
      {
        name: "N5 tối",
        url: "u",
        newSubmissions: 3,
        attention: ["Lê Thu Hà"],
        hardQuestions: [{ prompt: "これは ___ですか。", wrong: 4, total: 6 }],
      },
    ],
  });
  assert.equal(digest.subject, "Tóm tắt lớp sáng nay: 3 bài nộp mới, 1 học viên cần chú ý");
  assert.ok(digest.text.includes("Câu sai nhiều: これは ___ですか。 (4/6 học viên)."));
});

test("unsubscribe tokens are scoped signatures that reject tampering", () => {
  const token = createUnsubscribeToken(USER, "secret-one");
  assert.equal(verifyUnsubscribeToken(token, "secret-one"), USER);
  assert.equal(verifyUnsubscribeToken(token, "secret-two"), null);
  const other = createUnsubscribeToken("00000000-0000-4000-8000-000000000002", "secret-one");
  const forged = `${token.split(".")[0]}.${other.split(".")[1]}`;
  assert.equal(verifyUnsubscribeToken(forged, "secret-one"), null);
  assert.equal(verifyUnsubscribeToken(`${token}.extra`, "secret-one"), null);
  assert.equal(verifyUnsubscribeToken(USER, "secret-one"), null);
});

test("webhook signatures follow the Svix scheme with a five-minute window", () => {
  const secret = `whsec_${Buffer.from("webhook-key").toString("base64")}`;
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "abc" } });
  const now = new Date("2026-10-28T12:00:00Z");
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const signature = createHmac("sha256", Buffer.from("webhook-key"))
    .update(`msg_1.${timestamp}.${body}`)
    .digest("base64");
  const headers = { id: "msg_1", timestamp, signature: `v1,invalid v1,${signature}` };
  assert.equal(verifyWebhookSignature(body, headers, secret, now), true);
  assert.equal(verifyWebhookSignature(`${body} `, headers, secret, now), false);
  assert.equal(
    verifyWebhookSignature(body, headers, secret, new Date(now.getTime() + 6 * 60_000)),
    false,
  );
  assert.equal(verifyWebhookSignature(body, { ...headers, signature: null }, secret, now), false);
});

test("jobs use Vietnam dates, stable keys, bounded retries and a 24-hour due window", () => {
  const now = new Date("2026-10-28T17:30:00Z");
  assert.equal(emailDateOf(now), "2026-10-29");
  assert.equal(
    emailIdempotencyKey("daily_reminder", USER, "2026-10-29"),
    `daily_reminder:${USER}:2026-10-29`,
  );
  assert.equal(nextRetryAt(1, now).getTime() - now.getTime(), 15 * 60_000);
  assert.equal(nextRetryAt(5, now).getTime() - now.getTime(), 60 * 60_000);
  assert.equal(isDueSoon("2026-10-29T17:30:00Z", now), true);
  assert.equal(isDueSoon("2026-10-29T17:30:01Z", now), false);
  assert.equal(isDueSoon("2026-10-28T17:00:00Z", now), false);
  assert.equal(isDueSoon(null, now), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import { encode } from "uqr";

import { buildSlideQrTargets } from "../lib/slide-qr";

const NOW = new Date("2026-11-18T05:00:00Z");
const ASSIGNMENT_ID = "6f1c2d3e-4b5a-4c6d-8e7f-901234567890";

test("work still open comes first, then the lesson, then the class invitation", () => {
  const targets = buildSlideQrTargets(
    {
      lessonId: "minna-1-17",
      joinCode: "BZA24935",
      lessonInClass: true,
      assignments: [
        {
          id: ASSIGNMENT_ID,
          title: "Luyện bài 17",
          dueAt: "2026-11-20T16:59:00Z",
          allowLate: false,
        },
      ],
    },
    NOW,
  );
  assert.deepEqual(
    targets.map((target) => [target.kind, target.path]),
    [
      ["assignment", `/assignments/${ASSIGNMENT_ID}`],
      ["lesson", "/lessons/minna-1-17"],
      ["invite", "/join-class?code=BZA24935"],
    ],
  );
  assert.equal(targets[0].detail, "Bài tập · hạn 23:59 20/11/2026");
  assert.equal(targets[2].detail, "Mã lớp BZA2-4935");
});

test("past-due work, a lesson the class cannot open yet and a closed class give no code", () => {
  const assignments = [
    { id: ASSIGNMENT_ID, title: "Đã hết hạn", dueAt: "2026-11-17T16:59:00Z", allowLate: false },
  ];
  assert.deepEqual(
    buildSlideQrTargets(
      { lessonId: "minna-1-17", joinCode: null, lessonInClass: false, assignments },
      NOW,
    ),
    [],
  );
  // Late hand-in is still allowed, so the code still helps.
  const late = buildSlideQrTargets(
    {
      lessonId: "minna-1-17",
      joinCode: null,
      lessonInClass: false,
      assignments: [{ ...assignments[0], allowLate: true }],
    },
    NOW,
  );
  assert.equal(late.length, 1);
});

test("a production assignment link fits a QR code a phone reads from a shared screen", () => {
  const url = `https://reng-class.vercel.app/assignments/${ASSIGNMENT_ID}`;
  const { size, data } = encode(url, { ecc: "L", border: 2 });
  // Low error correction, as on the panel: a screen is not scratched, and version 4 (33 modules
  // plus the border) keeps the modules large over a blurry video call.
  assert.ok(size <= 37, `size ${size}`);
  assert.equal(data.length, size);
});

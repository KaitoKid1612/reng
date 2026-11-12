import { hashText } from "@/lib/stable-hash";

// Authoring limits for matching questions. Published lessons keep the looser lesson contract.
export const MIN_MATCH_PAIRS = 2;
export const MAX_MATCH_PAIRS = 8;
export const MAX_MATCH_ITEM_LENGTH = 60;

export type MatchPair = [number, number];

interface MatchShape {
  left: readonly string[];
  right: readonly string[];
  answer: readonly (readonly [number, number])[];
}

// Editors write the pairs as two columns, one row per pair; a row of two blank lines is skipped.
export function filledMatchRows(left: readonly string[], right: readonly string[]) {
  const rows: { left: string; right: string }[] = [];
  for (let row = 0; row < Math.max(left.length, right.length); row += 1) {
    const pair = { left: (left[row] ?? "").trim(), right: (right[row] ?? "").trim() };
    if (pair.left || pair.right) {
      rows.push(pair);
    }
  }
  return rows;
}

/**
 * The stored question from rows in pair order. The right column is kept in a fixed shuffle so
 * the right-hand index a learner's browser sends is never the row number of its partner; the
 * shuffle follows the text, so publishing the same draft again gives the same question.
 */
export function toMatchQuestion(rows: readonly { left: string; right: string }[]) {
  const seed = hashText(rows.map((row) => `${row.left}\u0000${row.right}`).join("\u0001"));
  let order = rows
    .map((_, row) => row)
    .sort(
      (first, second) =>
        hashText(`${seed}:${first}:${rows[first]?.right}`) -
        hashText(`${seed}:${second}:${rows[second]?.right}`),
    );
  if (order.length > 1 && order.every((row, position) => row === position)) {
    order = [...order.slice(1), order[0] ?? 0];
  }
  return {
    left: rows.map((row) => row.left),
    right: order.map((row) => rows[row]?.right ?? ""),
    answer: rows.map((_, row): MatchPair => [row, order.indexOf(row)]),
  };
}

// The two columns in pair order, as the editors show them. A draft keeps the columns as typed,
// row by row, which pairs each row with the same row (even while one column is longer); a stored
// question is put back in pair order, and right items without a partner follow.
export function toMatchColumns(question: MatchShape) {
  const rows = Math.min(question.left.length, question.right.length);
  const isTyped =
    question.answer.length === rows &&
    question.answer.every(([left, right], row) => left === row && right === row);
  if (isTyped) {
    return { left: [...question.left], right: [...question.right] };
  }
  const right = question.left.map((_, row) => {
    const pair = question.answer.find(([left]) => left === row);
    return pair ? (question.right[pair[1]] ?? "") : "";
  });
  const paired = new Set(question.answer.map(([, partner]) => partner));
  return {
    left: [...question.left],
    right: [...right, ...question.right.filter((_, index) => !paired.has(index))],
  };
}

// The draft form of two typed columns: row n pairs with row n.
export function fromMatchColumns(left: readonly string[], right: readonly string[]) {
  const rows = Math.min(left.length, right.length);
  return {
    left: [...left],
    right: [...right],
    answer: Array.from({ length: rows }, (_, row): MatchPair => [row, row]),
  };
}

/**
 * The draft of two typed columns for an editor whose saved draft is published as it is (the Chinese
 * editor: publish_lesson requires the published content to be the reviewed draft). Once every
 * filled row has both sides, the question is stored as it will be published, blank rows dropped
 * and the right column in its fixed shuffle; until then the columns stay as typed, so the editor
 * can show them and say what is missing.
 */
export function toPublishableMatch(left: readonly string[], right: readonly string[]) {
  const rows = filledMatchRows(left, right);
  if (rows.length > 0 && rows.every((row) => row.left && row.right)) {
    return toMatchQuestion(rows);
  }
  return fromMatchColumns(left, right);
}

// True when the pairs still line up row by row, as typed; such a question must not be published.
export function isInPairOrder(question: Pick<MatchShape, "answer">) {
  return question.answer.length > 1 && question.answer.every(([left, right]) => left === right);
}

// A sentence fragment for the editors about the first problem, or null.
export function describeMatchProblem(left: readonly string[], right: readonly string[]) {
  const rows = filledMatchRows(left, right);
  if (rows.some((row) => !row.left || !row.right)) {
    return "mỗi dòng bên trái cần đúng một dòng bên phải, cùng thứ tự.";
  }
  if (rows.length < MIN_MATCH_PAIRS) {
    return `cần ít nhất ${MIN_MATCH_PAIRS} cặp, mỗi dòng một cặp.`;
  }
  if (rows.length > MAX_MATCH_PAIRS) {
    return `tối đa ${MAX_MATCH_PAIRS} cặp.`;
  }
  if (
    rows.some(
      (row) => row.left.length > MAX_MATCH_ITEM_LENGTH || row.right.length > MAX_MATCH_ITEM_LENGTH,
    )
  ) {
    return `mỗi vế tối đa ${MAX_MATCH_ITEM_LENGTH} ký tự.`;
  }
  if (
    new Set(rows.map((row) => row.left)).size !== rows.length ||
    new Set(rows.map((row) => row.right)).size !== rows.length
  ) {
    return "hai vế giống nhau thì học viên không phân biệt được; mỗi vế trong một cột phải khác nhau.";
  }
  return null;
}

// "名前 → tên · 学生 → học sinh" in left order, for results and answer feedback.
export function describeMatchPairs(
  question: Pick<MatchShape, "left" | "right">,
  pairs: readonly (readonly [number, number])[],
) {
  return [...pairs]
    .sort(([first], [second]) => first - second)
    .flatMap(([left, right]) => {
      const leftText = question.left[left];
      const rightText = question.right[right];
      return leftText === undefined || rightText === undefined
        ? []
        : [`${leftText} → ${rightText}`];
    })
    .join(" · ");
}

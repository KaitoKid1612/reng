import { createUniqueId } from "@/lib/item-ids";

import type { OrderToken } from "@/lib/assignment";

// Authoring limits for sentence-order questions and reading passages. Published lessons keep the
// looser lesson contract, so question banks written before these limits still load.
export const MIN_ORDER_PIECES = 2;
export const MAX_ORDER_PIECES = 10;
export const MAX_ORDER_PIECE_LENGTH = 60;
export const MAX_PASSAGE_LENGTH = 2000;

// Editors take the pieces in sentence order, one per line, so the written order is the answer.
// Piece IDs reach the learner's browser with the shuffled pieces, so they are random: IDs in
// sentence order would give the answer away to anyone reading the page.
export function toOrderTokens(pieces: readonly string[], random: () => number = Math.random) {
  const used = new Set<string>();
  const tokens: OrderToken[] = pieces.map((text) => {
    const id = createUniqueId("p", used, random);
    used.add(id);
    return { id, text };
  });
  return { tokens, answer: tokens.map((token) => token.id) };
}

// The pieces of a question in answer order, one per line in the editors.
export function toOrderPieces(question: {
  tokens: readonly OrderToken[];
  answer: readonly string[];
}) {
  return question.answer.flatMap((id) => {
    const token = question.tokens.find((item) => item.id === id);
    return token ? [token.text] : [];
  });
}

export function filledPieces(pieces: readonly string[]) {
  return pieces.map((piece) => piece.trim()).filter(Boolean);
}

// Blank lines are ignored. Learners cannot tell two equal pieces apart while grading compares the
// pieces themselves, so pieces must differ. Returns a sentence fragment for the editors.
export function describeOrderPiecesProblem(pieces: readonly string[]) {
  const filled = filledPieces(pieces);
  if (filled.length < MIN_ORDER_PIECES) {
    return `cần ít nhất ${MIN_ORDER_PIECES} mảnh, mỗi dòng một mảnh.`;
  }
  if (filled.length > MAX_ORDER_PIECES) {
    return `tối đa ${MAX_ORDER_PIECES} mảnh.`;
  }
  if (filled.some((piece) => piece.length > MAX_ORDER_PIECE_LENGTH)) {
    return `mỗi mảnh tối đa ${MAX_ORDER_PIECE_LENGTH} ký tự.`;
  }
  if (new Set(filled).size !== filled.length) {
    return "hai mảnh giống nhau thì học viên không phân biệt được; gộp mảnh trùng vào mảnh bên cạnh.";
  }
  return null;
}

export function describePassageProblem(passage: string | undefined) {
  return passage && passage.trim().length > MAX_PASSAGE_LENGTH
    ? `đoạn văn tối đa ${MAX_PASSAGE_LENGTH} ký tự.`
    : null;
}

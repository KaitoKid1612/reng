// Excludes look-alike characters (0/O, 1/I/L) so codes can be read aloud or copied from a board.
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 8;
export const JOIN_CODE_PATTERN = /^[A-HJKMNP-Z2-9]{8}$/;

export function createJoinCode(randomIndex: (size: number) => number) {
  let code = "";
  for (let index = 0; index < JOIN_CODE_LENGTH; index++) {
    code += JOIN_CODE_ALPHABET[randomIndex(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeJoinCode(input: string) {
  return input.normalize("NFKC").toUpperCase().replace(/[\s-]/g, "");
}

export function isJoinCode(value: string) {
  return JOIN_CODE_PATTERN.test(value);
}

export function formatJoinCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

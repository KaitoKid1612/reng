const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

// Random suffixes keep IDs from being reused for a different meaning after a deletion, which
// would silently repoint review cards keyed by lesson and item ID. Both lesson editors use it.
export function createUniqueId(
  prefix: string,
  usedIds: ReadonlySet<string>,
  random: () => number = Math.random,
) {
  for (;;) {
    let suffix = "";
    for (let index = 0; index < 6; index++) {
      suffix += ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)];
    }
    const id = `${prefix}-${suffix}`;
    if (!usedIds.has(id)) {
      return id;
    }
  }
}

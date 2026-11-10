// The word a learner types to confirm deleting their account (Settings › Account).
export const ACCOUNT_DELETION_WORD = "XÓA";

// "xóa", "XOA" and "Xoá" all count: the word is compared without case or accents.
export function isAccountDeletionWord(value: string) {
  const plain = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").trim().toUpperCase();
  return plain(value) === plain(ACCOUNT_DELETION_WORD);
}

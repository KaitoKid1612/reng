import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

// The operator's address as a mail link, wherever the policy or terms say where to write.
export function ContactEmail() {
  return <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;
}

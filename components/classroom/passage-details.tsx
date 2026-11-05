import { FuriganaText } from "@/components/lessons/japanese-text";

interface PassageDetailsProps {
  passage: string | undefined;
  lang: string;
}

// Answer reviews list many questions, so a reading passage stays folded until it is needed.
export function PassageDetails({ passage, lang }: PassageDetailsProps) {
  if (!passage) {
    return null;
  }
  return (
    <details className="result-passage">
      <summary>Xem đoạn văn</summary>
      <p lang={lang}>
        <FuriganaText text={passage} />
      </p>
    </details>
  );
}

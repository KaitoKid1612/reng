import Image from "next/image";

interface QuestionImageProps {
  src: string;
  position: number;
}

// A picture or printed table from an exam booklet, such as the four pictures a JLPT listening
// question chooses between. It scales to the card so the whole panel stays readable on a phone.
export function QuestionImage({ src, position }: QuestionImageProps) {
  return (
    <Image
      src={src}
      alt={`Hình của câu ${position}`}
      width={900}
      height={600}
      unoptimized
      className="question-image"
    />
  );
}

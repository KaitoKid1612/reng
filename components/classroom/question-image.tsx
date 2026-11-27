import Image from "next/image";

interface QuestionImageProps {
  src: string;
  position: number;
}

// A picture or printed table from an exam booklet, such as the four pictures a JLPT listening
// question chooses between. It scales to the card; a small table on a phone opens full size in a
// new tab, so the attempt keeps its place.
export function QuestionImage({ src, position }: QuestionImageProps) {
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="question-image-link">
      <Image
        src={src}
        alt={`Hình của câu ${position}`}
        width={900}
        height={600}
        unoptimized
        className="question-image"
      />
      <span className="question-image-hint">Chạm vào hình để xem cỡ lớn</span>
    </a>
  );
}

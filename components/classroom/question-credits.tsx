interface QuestionCreditsProps {
  credits: readonly (string | undefined)[];
}

// Reused material names its source next to the questions (jlpt.jp site policy §1(4)), once per
// page however many questions carry it; the Vietnamese explanations are Reng's own.
export function QuestionCredits({ credits }: QuestionCreditsProps) {
  const unique = [...new Set(credits.filter((credit): credit is string => Boolean(credit)))];
  if (!unique.length) {
    return null;
  }
  return (
    <p className="question-credit">
      Câu hỏi:{" "}
      {unique.map((credit, index) => (
        <span key={credit}>
          {index > 0 && "; "}
          <span lang="ja">{credit}</span>
        </span>
      ))}
      . Lời giải thích tiếng Việt do Reng biên soạn.
    </p>
  );
}

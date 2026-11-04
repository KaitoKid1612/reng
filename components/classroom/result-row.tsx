import { PassageDetails } from "@/components/classroom/passage-details";
import { answerLang } from "@/lib/assignment";

import type { ResultItem } from "@/lib/server/assignments";

interface ResultRowProps {
  item: ResultItem;
  /** The question's number in the whole attempt, kept when a filter hides other answers. */
  number: number;
}

/** One graded answer as the learner reviews it: on the results page and in the daily history. */
export function ResultRow({ item, number }: ResultRowProps) {
  return (
    <div className="result-row" data-correct={item.isCorrect}>
      <p className="result-row-meta">
        <span className={`status-badge ${item.isCorrect ? "status-correct" : "status-wrong"}`}>
          {item.isCorrect ? "Đúng" : "Sai"}
        </span>{" "}
        Câu {number} · {item.pointsEarned}/{item.view.points} điểm
      </p>
      <PassageDetails passage={item.view.passage} lang={item.view.lang} />
      <p lang={item.view.lang} className="question-prompt">
        {item.view.prompt}
      </p>
      <p>
        Bạn trả lời: <strong lang={answerLang(item.view)}>{item.answerText || "(bỏ trống)"}</strong>
      </p>
      {!item.isCorrect && (
        <p>
          Đáp án: <strong lang={answerLang(item.view)}>{item.correctText}</strong>
        </p>
      )}
      {item.transcript !== null && (
        <p className="transcript">
          Transcript: <span lang={item.view.lang}>{item.transcript}</span> (bạn đã nghe{" "}
          {item.listenCount} lần)
        </p>
      )}
      <p className="muted">{item.explain}</p>
    </div>
  );
}

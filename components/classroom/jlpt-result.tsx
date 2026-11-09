import {
  describeJlptCountdown,
  estimateJlptScore,
  JLPT_LANGUAGE_MAX,
  JLPT_LANGUAGE_MIN,
  JLPT_LISTENING_MAX,
  JLPT_LISTENING_MIN,
  JLPT_SECTION_LABELS,
  scoreJlptSections,
} from "@/lib/jlpt";
import { formatPercent, toPercent } from "@/lib/grading/grade";

import type { JlptLevel, JlptScoredItem } from "@/lib/jlpt";

interface JlptResultProps {
  level: JlptLevel;
  items: readonly JlptScoredItem[];
  now: Date;
}

// Shown once the results may be seen: each section, then the exam's two scored parts on the
// 180-point scale as an estimate.
export function JlptResult({ level, items, now }: JlptResultProps) {
  const scores = scoreJlptSections(items);
  const estimate = estimateJlptScore(level, scores);
  const countdown = describeJlptCountdown(now);
  return (
    <section className="section-block" aria-labelledby="jlpt-result-title">
      <h2 id="jlpt-result-title">Kết quả theo phần thi JLPT {level}</h2>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Phần</th>
              <th scope="col" className="numeric">
                Câu đúng
              </th>
              <th scope="col" className="numeric">
                Tỉ lệ
              </th>
            </tr>
          </thead>
          <tbody>
            {scores.map((score) => (
              <tr key={score.section}>
                <th scope="row">{JLPT_SECTION_LABELS[score.section]}</th>
                <td className="numeric" data-label="Câu đúng">
                  {score.correct}/{score.total}
                </td>
                <td className="numeric" data-label="Tỉ lệ">
                  {score.max ? formatPercent(toPercent(score.earned, score.max)) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {estimate ? (
        <div className="form-card">
          <p className="result-score">
            {estimate.total}
            <span> / 180 điểm (ước tính)</span>
          </p>
          <p>
            {estimate.isPassing ? (
              <span className="status-badge status-correct">Ước tính: đỗ</span>
            ) : (
              <span className="status-badge status-wrong">Ước tính: chưa đỗ</span>
            )}{" "}
            Kiến thức ngôn ngữ và đọc hiểu {estimate.language}/{JLPT_LANGUAGE_MAX}, nghe hiểu{" "}
            {estimate.listening}/{JLPT_LISTENING_MAX}.
          </p>
          <p className="small muted">
            Đỗ {level} cần tổng từ {estimate.passMark}/180, phần ngôn ngữ và đọc hiểu từ{" "}
            {JLPT_LANGUAGE_MIN}/{JLPT_LANGUAGE_MAX}, nghe hiểu từ {JLPT_LISTENING_MIN}/
            {JLPT_LISTENING_MAX}.
            {estimate.missesLanguageMinimum ? " Phần ngôn ngữ và đọc hiểu chưa qua điểm sàn." : ""}
            {estimate.missesListeningMinimum ? " Phần nghe hiểu chưa qua điểm sàn." : ""} Điểm quy
            đổi từ tỉ lệ đúng nên chỉ là ước tính; điểm JLPT thật tính theo độ khó từng câu.
          </p>
        </div>
      ) : (
        <p className="notice-panel">
          Đề này không có đủ phần nghe hiểu và phần ngôn ngữ nên chưa ước tính được điểm thang 180.
        </p>
      )}
      {countdown && <p className="small muted">{countdown}</p>}
    </section>
  );
}

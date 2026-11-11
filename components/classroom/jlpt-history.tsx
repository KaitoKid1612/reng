import Link from "next/link";

import { describeJlptCountdown, JLPT_LANGUAGE_MAX, JLPT_LISTENING_MAX } from "@/lib/jlpt";
import { describeJlptOutcome } from "@/lib/jlpt-history";
import { formatStudyDateTime } from "@/lib/study-days";

import type { JlptHistoryEntry } from "@/lib/jlpt-history";

interface JlptHistoryProps {
  entries: readonly JlptHistoryEntry[];
  // Where an exam's answers are read: the learner's result page, or the teacher's list below.
  hrefFor: (entry: JlptHistoryEntry) => string;
  now: Date;
}

function formatChange(change: number | null) {
  if (change === null) {
    return "";
  }
  if (change > 0) {
    return ` (+${change})`;
  }
  return change < 0 ? ` (${change})` : " (±0)";
}

// Every mock exam on one table, newest first, so a learner and their teacher see whether the
// 180-point estimate is moving toward the pass mark before the exam day.
export function JlptHistory({ entries, hrefFor, now }: JlptHistoryProps) {
  const countdown = describeJlptCountdown(now);
  return (
    <section className="section-block" aria-labelledby="jlpt-history-title">
      <h2 id="jlpt-history-title">Thi thử JLPT</h2>
      <p className="small muted">
        Điểm quy đổi thang 180 từ tỉ lệ đúng của lượt nộp mới nhất, chỉ là ước tính. Số trong ngoặc
        là thay đổi so với lần thi thử trước cùng cấp. {countdown}
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Đề</th>
              <th scope="col">Nộp lúc</th>
              <th scope="col" className="numeric">
                Ngôn ngữ và đọc hiểu
              </th>
              <th scope="col" className="numeric">
                Nghe hiểu
              </th>
              <th scope="col" className="numeric">
                Tổng
              </th>
              <th scope="col">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.assignmentId}>
                <th scope="row">
                  <Link href={hrefFor(entry)}>{entry.title}</Link> ({entry.level})
                </th>
                <td data-label="Nộp lúc">{formatStudyDateTime(entry.submittedAt)}</td>
                <td className="numeric" data-label="Ngôn ngữ và đọc hiểu">
                  {entry.estimate ? `${entry.estimate.language}/${JLPT_LANGUAGE_MAX}` : "—"}
                </td>
                <td className="numeric" data-label="Nghe hiểu">
                  {entry.estimate ? `${entry.estimate.listening}/${JLPT_LISTENING_MAX}` : "—"}
                </td>
                <td className="numeric" data-label="Tổng">
                  {entry.estimate
                    ? `${entry.estimate.total}/180${formatChange(entry.change)}`
                    : "—"}
                </td>
                <td data-label="Kết quả">{describeJlptOutcome(entry.estimate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

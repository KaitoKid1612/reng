import { JLPT_SECTION_LABELS } from "@/lib/jlpt";

import type { JlptLevel } from "@/lib/jlpt";
import type { JlptDailyCoverage } from "@/lib/jlpt-parts";

interface DailyJlptCoverageProps {
  level: JlptLevel;
  rows: JlptDailyCoverage[];
}

// Days a part lasts before its questions come back: the rotation skips questions of the last
// 14 days, so a part that lasts fewer days repeats within two weeks.
function describeDays(row: JlptDailyCoverage) {
  if (!row.count) {
    return "—";
  }
  if (row.available < row.count) {
    return "Thiếu câu";
  }
  return `${Math.floor(row.available / row.count)} ngày`;
}

/** The parts of the test a JLPT-format daily set takes, with how long each part's bank lasts. */
export function DailyJlptCoverage({ level, rows }: DailyJlptCoverageProps) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const shortParts = rows.filter((row) => row.count > 0 && row.available < row.count);
  return (
    <div className="daily-jlpt-coverage">
      <p className="small muted">
        Mỗi ngày {total} câu theo cấu trúc đề JLPT {level}, đúng thứ tự もんだい của đề, phần nghe ở
        cuối. Cột “Đủ cho” là số ngày trước khi câu của phần đó quay lại.
      </p>
      {shortParts.length > 0 && (
        <p className="notice-panel" role="status">
          Bài nguồn chưa đủ câu cho {shortParts.map((row) => row.part.label).join("、")}. Reng bù
          bằng câu của phần khác trong cùng phần thi; gắn nhãn もんだい cho câu hoặc chọn ngân hàng
          theo cấu trúc đề.
        </p>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">もんだい</th>
            <th scope="col">Phần thi</th>
            <th scope="col" className="numeric">
              Mỗi ngày
            </th>
            <th scope="col" className="numeric">
              Trong bài nguồn
            </th>
            <th scope="col" className="numeric">
              Đủ cho
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.part.tag}>
              <th scope="row" lang="ja">
                {row.part.label}
              </th>
              <td data-label="Phần thi">{JLPT_SECTION_LABELS[row.part.section]}</td>
              <td className="numeric" data-label="Mỗi ngày">
                {row.count}
              </td>
              <td className="numeric" data-label="Trong bài nguồn">
                {row.available}
              </td>
              <td className="numeric" data-label="Đủ cho">
                {describeDays(row)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

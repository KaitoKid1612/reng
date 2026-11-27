import Link from "next/link";

import { PRINT_BOOKLET_LABELS, PRINT_BOOKLETS } from "@/lib/exam-print";
import { JLPT_LEVELS } from "@/lib/jlpt";
import { JLPT_EXAM_SETS, jlptExamSetNumber } from "@/lib/jlpt-exam-sets";

import type { JlptExamSetKind } from "@/lib/jlpt-exam-sets";

const PRINT_SET_NOTES: Record<JlptExamSetKind, string> = {
  official: "Sách đề chính thức trên jlpt.jp.",
  test: "Đề trọn bộ, phần nghe là bản ghi âm gốc.",
  reng: "Đề thi thử do Reng biên soạn, không phải đề thi thật.",
};

// "Bản in đề JLPT" on the exam page, for a teacher or class owner: every printable exam per level
// with a link to each booklet. The booklets with answers are marked for the teacher.
export function ExamPrintList() {
  return (
    <section className="exam-class" aria-labelledby="exam-print-sets">
      <h2 id="exam-print-sets">Bản in đề JLPT</h2>
      <p className="muted">
        Mỗi đề in riêng từng tập trên khổ A4: đề và phiếu trả lời cho học viên, đáp án và lời thoại
        nghe cho giáo viên. Mở một tập rồi bấm In / Lưu PDF.
      </p>
      {JLPT_LEVELS.map((level) => (
        <div key={level}>
          <h3>{level}</h3>
          <ul className="exam-library">
            {JLPT_EXAM_SETS.filter((set) => set.level === level).map((set) => (
              <li key={set.id} className="exam-library-row">
                <div>
                  <p className="exam-title">
                    Đề {jlptExamSetNumber(set)}: {set.title}
                  </p>
                  <p className="small muted">
                    {set.questions.length} câu · {PRINT_SET_NOTES[set.kind]}
                  </p>
                </div>
                <ul className="exam-print-links">
                  {PRINT_BOOKLETS.map((booklet) => (
                    <li key={booklet}>
                      <Link href={`/exams/print/${set.id}?booklet=${booklet}`}>
                        {PRINT_BOOKLET_LABELS[booklet]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

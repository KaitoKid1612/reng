import Link from "next/link";

import { PRINT_BOOKLET_LABELS, PRINT_BOOKLETS } from "@/lib/exam-print";
import { JLPT_LEVELS } from "@/lib/jlpt";
import { JLPT_EXAM_SETS } from "@/lib/jlpt-exam-sets";

// "Bản in đề JLPT" on the exam page, for a teacher or class owner: every printable exam per level
// with a link to each booklet. The booklets with answers are marked for the teacher.
export function ExamPrintList() {
  return (
    <section className="exam-class" aria-labelledby="exam-print-sets">
      <h2 id="exam-print-sets">Bản in đề JLPT</h2>
      {JLPT_LEVELS.map((level) => (
        <div key={level}>
          <h3>{level}</h3>
          <ul className="exam-library">
            {JLPT_EXAM_SETS.filter((set) => set.level === level).map((set) => (
              <li key={set.id} className="exam-library-row">
                <p className="exam-title">{set.title}</p>
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

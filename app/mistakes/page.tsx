import Link from "next/link";

import { PassageDetails } from "@/components/classroom/passage-details";
import { buttonVariants } from "@/components/ui/button";
import { answerLang } from "@/lib/assignment";
import { requireStudent } from "@/lib/server/account";
import { listMistakes } from "@/lib/server/reviews";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sổ lỗi" };

export default async function MistakesPage() {
  const account = await requireStudent("/mistakes");
  const now = new Date();
  const book = await listMistakes(account.id, now);
  const open = book.entries.filter((entry) => !entry.resolvedAt);
  const resolved = book.entries.filter((entry) => entry.resolvedAt);
  return (
    <div className="lesson-reader">
      <div className="page-heading">
        <div>
          <h1>Sổ lỗi</h1>
          <p>
            Câu từng trả lời sai. Đúng 3 lần liên tiếp khi ôn thì câu được đánh dấu đã giải quyết.
          </p>
        </div>
        <Link href="/review" className={buttonVariants()}>
          Ôn ngay
        </Link>
      </div>
      {book.hidden.map((group) => (
        <p key={group.assignmentTitle} className="notice-panel">
          {group.count} câu sai trong “{group.assignmentTitle}” sẽ hiện sau
          {group.feedbackAt ? ` ${formatStudyDateTime(group.feedbackAt)}` : " khi có kết quả"}.
        </p>
      ))}
      <section className="section-block" aria-labelledby="open-mistakes">
        <h2 id="open-mistakes">Đang cần ôn ({open.length})</h2>
        {open.length === 0 && <p className="muted">Chưa có câu sai nào cần ôn. Giữ vững nhé!</p>}
        {open.map((entry) => (
          <article
            key={`${entry.assignmentId}:${entry.view.id}`}
            className="result-row"
            data-correct="false"
          >
            <p className="small muted">
              {entry.assignmentTitle}, chuỗi đúng {entry.correctStreak}/3
              {Date.parse(entry.due) > now.getTime()
                ? `, ôn lại lúc ${formatStudyDateTime(entry.due)}`
                : ", đến hạn ôn"}
            </p>
            <PassageDetails passage={entry.view.passage} lang={entry.view.lang} />
            <p lang={entry.view.lang} className="question-prompt">
              {entry.view.prompt}
            </p>
            {entry.lastAnswerText && (
              <p>
                Lần sai gần nhất: <span lang={answerLang(entry.view)}>{entry.lastAnswerText}</span>
              </p>
            )}
            <p>
              Đáp án: <strong lang={answerLang(entry.view)}>{entry.correctText}</strong>
            </p>
            <p className="muted">{entry.explain}</p>
          </article>
        ))}
      </section>
      {resolved.length > 0 && (
        <section className="section-block" aria-labelledby="resolved-mistakes">
          <h2 id="resolved-mistakes">Đã giải quyết ({resolved.length})</h2>
          <ul className="item-list">
            {resolved.map((entry) => (
              <li key={`${entry.assignmentId}:${entry.view.id}`}>
                <div>
                  <p lang={entry.view.lang}>{entry.view.prompt}</p>
                  <p className="item-meta">{entry.assignmentTitle}</p>
                </div>
                <span className="status-badge status-correct">Đã giải quyết</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

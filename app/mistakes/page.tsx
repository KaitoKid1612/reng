import Link from "next/link";

import { PassageDetails } from "@/components/classroom/passage-details";
import { FuriganaText } from "@/components/lessons/japanese-text";
import { buttonVariants } from "@/components/ui/button";
import { answerLang } from "@/lib/assignment";
import { requireStudent } from "@/lib/server/account";
import { listMistakes } from "@/lib/server/reviews";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sổ lỗi" };

interface MistakesPageProps {
  searchParams: Promise<{ filter?: string | string[] }>;
}

type MistakeEntry = Awaited<ReturnType<typeof listMistakes>>["entries"][number];

// Daily sets add many questions a day, so open mistakes are grouped by assignment (newest group
// open) and can be narrowed to the ones due for review now.
function groupByAssignment(entries: readonly MistakeEntry[]) {
  const groups = new Map<string, { title: string; entries: MistakeEntry[] }>();
  for (const entry of entries) {
    const group = groups.get(entry.assignmentId) ?? { title: entry.assignmentTitle, entries: [] };
    group.entries.push(entry);
    groups.set(entry.assignmentId, group);
  }
  return [...groups].map(([assignmentId, group]) => ({ assignmentId, ...group }));
}

export default async function MistakesPage({ searchParams }: MistakesPageProps) {
  const account = await requireStudent("/mistakes");
  const now = new Date();
  const onlyDue = (await searchParams).filter === "due";
  const book = await listMistakes(account.id, now);
  const isDue = (entry: MistakeEntry) => Date.parse(entry.due) <= now.getTime();
  const open = book.entries.filter((entry) => !entry.resolvedAt);
  const dueCount = open.filter(isDue).length;
  const groups = groupByAssignment(onlyDue ? open.filter(isDue) : open);
  const resolved = book.entries.filter((entry) => entry.resolvedAt);
  return (
    <div className="lesson-reader">
      <div className="page-heading">
        <div>
          <h1>Sổ lỗi</h1>
          <p>Đúng 3 lần liên tiếp khi ôn thì câu được tính là đã thuộc.</p>
        </div>
        <Link href="/review" className={buttonVariants()}>
          Ôn ngay
        </Link>
      </div>
      {book.hidden.map((group) => (
        // No count: before the results are out, the number of wrong answers would give the score.
        <p key={group.assignmentTitle} className="notice-panel">
          Câu sai trong “{group.assignmentTitle}” sẽ hiện sau
          {group.feedbackAt ? ` ${formatStudyDateTime(group.feedbackAt)}` : " khi có kết quả"}.
        </p>
      ))}
      <section className="section-block" aria-labelledby="open-mistakes">
        <h2 id="open-mistakes">Đang cần ôn ({open.length})</h2>
        {open.length > 0 && (
          <nav className="filter-pills" aria-label="Lọc câu sai">
            <Link href="/mistakes" aria-current={onlyDue ? undefined : "true"} scroll={false}>
              Tất cả <span className="filter-pill-count">{open.length}</span>
            </Link>
            <Link
              href="/mistakes?filter=due"
              aria-current={onlyDue ? "true" : undefined}
              scroll={false}
            >
              Đến hạn ôn <span className="filter-pill-count">{dueCount}</span>
            </Link>
          </nav>
        )}
        {open.length === 0 && <p className="muted">Chưa có câu sai nào cần ôn. Giữ vững nhé!</p>}
        {onlyDue && open.length > 0 && dueCount === 0 && (
          <p className="muted">Chưa có câu nào đến hạn ôn. Quay lại sau nhé.</p>
        )}
        {groups.map((group, index) => (
          <details
            key={group.assignmentId}
            className="collapse-card mistake-group"
            open={index === 0 || onlyDue}
          >
            <summary>
              <span>{group.title}</span>
              <span className="item-meta">
                {group.entries.length} câu
                {!onlyDue && group.entries.some(isDue)
                  ? `, ${group.entries.filter(isDue).length} đến hạn`
                  : ""}
              </span>
            </summary>
            {group.entries.map((entry) => (
              <article key={`${entry.assignmentId}:${entry.view.id}`} className="mistake-card">
                <PassageDetails passage={entry.view.passage} lang={entry.view.lang} />
                <p lang={entry.view.lang} className="mistake-prompt">
                  <FuriganaText text={entry.view.prompt} />
                </p>
                <dl className="mistake-answers">
                  <div className="mistake-answer" data-kind="wrong">
                    <dt>Bạn trả lời</dt>
                    {entry.lastAnswerText ? (
                      <dd lang={answerLang(entry.view)}>
                        <FuriganaText text={entry.lastAnswerText} />
                      </dd>
                    ) : (
                      <dd className="mistake-blank">Bỏ trống</dd>
                    )}
                  </div>
                  <div className="mistake-answer" data-kind="right">
                    <dt>Đáp án</dt>
                    <dd lang={answerLang(entry.view)}>
                      <FuriganaText text={entry.correctText} />
                    </dd>
                  </div>
                </dl>
                {entry.lastAnswerHint && <p className="answer-hint">{entry.lastAnswerHint}</p>}
                {(entry.explain || entry.transcript) && (
                  <details className="result-passage mistake-more">
                    <summary>{entry.transcript ? "Giải thích và lời nghe" : "Giải thích"}</summary>
                    {entry.explain && (
                      <p>
                        <FuriganaText text={entry.explain} />
                      </p>
                    )}
                    {entry.transcript && (
                      <p className="transcript">
                        <strong>Lời nghe: </strong>
                        <span lang={entry.view.lang}>
                          <FuriganaText text={entry.transcript} />
                        </span>
                      </p>
                    )}
                  </details>
                )}
                {(entry.correctStreak > 0 || !isDue(entry)) && (
                  <p className="small muted">
                    {entry.correctStreak > 0 ? `Đúng ${entry.correctStreak}/3 lần ôn` : ""}
                    {entry.correctStreak > 0 && !isDue(entry) ? " · " : ""}
                    {isDue(entry) ? "" : `Ôn lại lúc ${formatStudyDateTime(entry.due)}`}
                  </p>
                )}
              </article>
            ))}
          </details>
        ))}
      </section>
      {resolved.length > 0 && (
        <details className="section-block older-assignments">
          <summary>Đã thuộc ({resolved.length})</summary>
          <ul className="item-list">
            {resolved.map((entry) => (
              <li key={`${entry.assignmentId}:${entry.view.id}`}>
                <div>
                  <p lang={entry.view.lang}>
                    <FuriganaText text={entry.view.prompt} />
                  </p>
                  <p className="item-meta">{entry.assignmentTitle}</p>
                </div>
                <span className="status-badge status-correct">Đã thuộc</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";

import { describeDue } from "@/components/classroom/assignment-labels";
import { buttonVariants } from "@/components/ui/button";

const agendaSchema = z.object({
  agenda: z
    .object({
      dueCardCount: z.number().int(),
      hasMoreDueCards: z.boolean().default(false),
      assignments: z.array(
        z.object({ id: z.string(), title: z.string(), dueAt: z.string().nullable() }),
      ),
    })
    .nullable(),
});

type Agenda = NonNullable<z.infer<typeof agendaSchema>["agenda"]>;

// Signed-in learners see today's work above the welcome text; the home page itself stays static
// for guests, and people with nothing to do see the page as before.
export function HomeAgenda() {
  const [agenda, setAgenda] = useState<Agenda | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me/agenda", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { agenda: null }))
      .then((data: unknown) => setAgenda(agendaSchema.parse(data).agenda))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!agenda || (!agenda.assignments.length && !agenda.dueCardCount)) {
    return null;
  }
  return (
    <section className="home-agenda" aria-labelledby="agenda-title">
      <h2 id="agenda-title">Hôm nay của bạn</h2>
      {agenda.assignments.length > 0 ? (
        <ul className="item-list">
          {agenda.assignments.map((assignment, index) => (
            <li key={assignment.id}>
              <div>
                <Link href={`/assignments/${assignment.id}`}>{assignment.title}</Link>
                <p className="item-meta">{describeDue(assignment.dueAt)}</p>
              </div>
              <Link
                href={`/assignments/${assignment.id}`}
                className={buttonVariants({ variant: index === 0 ? "default" : "outline" })}
              >
                Làm bài
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>Không có bài nào đang chờ.</p>
      )}
      <div className="button-row">
        {agenda.dueCardCount > 0 && (
          <Link href="/review" className={buttonVariants({ variant: "outline" })}>
            Ôn {agenda.dueCardCount}
            {agenda.hasMoreDueCards ? "+" : ""} thẻ
          </Link>
        )}
        <Link href="/classes">Mở lớp của tôi</Link>
      </div>
    </section>
  );
}

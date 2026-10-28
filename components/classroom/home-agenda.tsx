"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";

import { describeDue } from "@/components/classroom/assignment-labels";

const agendaSchema = z.object({
  agenda: z
    .object({
      dueCardCount: z.number().int(),
      assignments: z.array(
        z.object({ id: z.string(), title: z.string(), dueAt: z.string().nullable() }),
      ),
    })
    .nullable(),
});

type Agenda = NonNullable<z.infer<typeof agendaSchema>["agenda"]>;

// Signed-in learners see today's work; the home page itself stays static for guests.
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

  if (!agenda) {
    return null;
  }
  return (
    <section className="home-agenda" aria-labelledby="agenda-title">
      <h2 id="agenda-title">Hôm nay của bạn</h2>
      <p>
        <Link href="/review">{agenda.dueCardCount} thẻ cần ôn hôm nay</Link>
      </p>
      {agenda.assignments.length > 0 && (
        <ul className="item-list">
          {agenda.assignments.map((assignment) => (
            <li key={assignment.id}>
              <Link href={`/assignments/${assignment.id}`}>{assignment.title}</Link>
              <span className="item-meta">{describeDue(assignment.dueAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

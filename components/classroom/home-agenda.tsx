"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";

import { TodayRows } from "@/components/classroom/today-rows";

import type { TodayRow } from "@/lib/learner-today";

// The home page shows the start of the day; Lớp của tôi has the rest.
const HOME_ROWS = 4;

const agendaSchema = z.object({
  agenda: z
    .object({
      rows: z.array(
        z.object({
          key: z.string(),
          kind: z.string(),
          title: z.string(),
          href: z.string(),
          meta: z.string(),
          action: z.string(),
          isAction: z.boolean(),
        }),
      ),
      moreAssignmentCount: z.number().int().nonnegative(),
    })
    .nullable(),
});

type Agenda = NonNullable<z.infer<typeof agendaSchema>["agenda"]>;

// Signed-in learners see today's plan above the welcome text; the home page itself stays static
// for guests, and people with nothing to do today see the page as before.
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

  if (!agenda?.rows.length) {
    return null;
  }
  const rows: TodayRow[] = agenda.rows.slice(0, HOME_ROWS);
  const hidden = agenda.rows.length - rows.length + agenda.moreAssignmentCount;
  return (
    <section className="today-plan" aria-labelledby="agenda-title">
      <h2 id="agenda-title">Hôm nay học gì</h2>
      <TodayRows rows={rows} />
      <p className="small today-more">
        <Link href="/classes">
          {hidden > 0 ? `Xem thêm ${hidden} việc ở Lớp của tôi` : "Mở lớp của tôi"}
        </Link>
      </p>
    </section>
  );
}

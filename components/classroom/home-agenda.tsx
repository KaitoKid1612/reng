"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { z } from "zod";

import { TodayRows } from "@/components/classroom/today-rows";

import type { TodayRow } from "@/lib/learner-today";

// The home page shows the start of the day; Lớp của tôi has the rest.
const HOME_ROWS = 4;

const rowSchema = z.object({
  key: z.string(),
  kind: z.string(),
  title: z.string(),
  href: z.string(),
  meta: z.string(),
  action: z.string(),
  isAction: z.boolean(),
  actionHref: z.string().optional(),
  isExternal: z.boolean().optional(),
});

const homeSchema = z.object({
  agenda: z
    .object({
      rows: z.array(rowSchema),
      moreAssignmentCount: z.number().int().nonnegative(),
    })
    .nullable(),
  // Teachers only: "Hôm nay dạy gì", as on /teach.
  teaching: z
    .object({ rows: z.array(rowSchema), moreCount: z.number().int().nonnegative() })
    .nullable()
    .optional(),
  streak: z
    .object({
      days: z.number().int().nonnegative(),
      hasStudiedToday: z.boolean(),
      previousMilestone: z.number().int().nonnegative(),
      nextMilestone: z.number().int().positive().nullable(),
    })
    .nullable()
    .optional(),
});

export type HomeData = z.infer<typeof homeSchema>;
type Agenda = NonNullable<HomeData["agenda"]>;

const EMPTY_HOME: HomeData = { agenda: null, teaching: null, streak: null };

// Today's plan for the signed-in start page; undefined while it loads.
export function useHomeAgenda() {
  const [data, setData] = useState<HomeData | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me/agenda", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : EMPTY_HOME))
      .then((body: unknown) => setData(homeSchema.parse(body)))
      .catch(() => {
        if (!controller.signal.aborted) {
          setData(EMPTY_HOME);
        }
      });
    return () => controller.abort();
  }, []);

  return data;
}

interface HomeAgendaProps {
  agenda: Agenda | null;
}

// Signed-in learners see today's plan above the shortcuts; people with nothing to do today see no
// panel.
export function HomeAgenda({ agenda }: HomeAgendaProps) {
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

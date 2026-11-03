import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import type { TodayRow } from "@/lib/learner-today";

interface TodayRowsProps {
  rows: readonly TodayRow[];
}

// The first thing to do today gets the main button; everything else stays secondary.
export function TodayRows({ rows }: TodayRowsProps) {
  const primaryKey = rows.find((row) => row.isAction)?.key;
  return (
    <ul className="item-list">
      {rows.map((row) => (
        <li key={row.key}>
          <div>
            <p className="today-kind">{row.kind}</p>
            <h3>
              <Link href={row.href}>{row.title}</Link>
            </h3>
            <p className="item-meta">{row.meta}</p>
          </div>
          <Link
            href={row.href}
            className={buttonVariants({ variant: row.key === primaryKey ? "default" : "outline" })}
          >
            {row.action}
          </Link>
        </li>
      ))}
    </ul>
  );
}

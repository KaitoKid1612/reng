import Link from "next/link";

import type { CSSProperties, ReactNode } from "react";

export interface ScoreColumn {
  key: string;
  /** Short x-axis text, such as "29/10". */
  axisLabel: string;
  /** Full description used by the readout and assistive technology. */
  label: string;
  percent: number | null;
  href?: string;
  /** Marks the column being viewed: "date" for a day, "true" for another period. */
  current?: "date" | "true";
}

interface ScoreColumnChartProps {
  columns: ScoreColumn[];
  /** Readout shown until a column is hovered or focused. */
  readout: string;
  /** Accessible name of the column list. */
  label: string;
  caption: ReactNode;
  targetPercent?: number;
}

interface ColumnMarksProps {
  column: ScoreColumn;
}

const GRID_TICKS = [0, 50, 100];

// Up to five labels at least two columns apart, so neighbours never touch at 360px.
function axisLabelIndexes(count: number) {
  if (count <= 5) {
    return Array.from({ length: count }, (_, index) => index);
  }
  const steps = Math.min(4, Math.floor((count - 1) / 2));
  const indexes = Array.from({ length: steps + 1 }, (_, step) =>
    steps ? Math.round((step * (count - 1)) / steps) : 0,
  );
  return [...new Set(indexes)];
}

// With many columns the outer labels hug the plot edges so they never overflow the card.
function axisLabelStyle(index: number, count: number): CSSProperties {
  if (count > 6 && index === 0) {
    return { left: 0 };
  }
  if (count > 6 && index === count - 1) {
    return { right: 0 };
  }
  return { left: `${((index + 0.5) / count) * 100}%`, transform: "translateX(-50%)" };
}

function ColumnMarks({ column }: ColumnMarksProps) {
  return (
    <>
      {column.percent === null ? (
        <span className="score-chart-empty" />
      ) : (
        <span className="score-chart-bar" style={{ height: `${column.percent}%` }} />
      )}
      <span className="score-chart-tip" aria-hidden="true">
        {column.label}
      </span>
    </>
  );
}

/**
 * Percent columns on a fixed 0–100 scale. Linked columns stay out of the tab order because
 * their pages list the same links as larger targets; plain columns are focusable so keyboard
 * users get the same readout as on hover.
 */
export function ScoreColumnChart({
  columns,
  readout,
  label,
  caption,
  targetPercent,
}: ScoreColumnChartProps) {
  return (
    <figure className="score-chart">
      <p className="score-chart-readout" aria-hidden="true">
        {readout}
      </p>
      <div className="score-chart-body">
        <div className="score-chart-yaxis" aria-hidden="true">
          {GRID_TICKS.map((tick) => (
            <span key={tick} style={{ bottom: `${tick}%` }}>
              {tick}%
            </span>
          ))}
          {targetPercent !== undefined && (
            <span className="score-chart-target-label" style={{ bottom: `${targetPercent}%` }}>
              {targetPercent}%
            </span>
          )}
        </div>
        <div className="score-chart-grid" aria-hidden="true">
          {GRID_TICKS.map((tick) => (
            <span key={tick} style={{ bottom: `${tick}%` }} />
          ))}
          {targetPercent !== undefined && (
            <span className="score-chart-target" style={{ bottom: `${targetPercent}%` }} />
          )}
        </div>
        <ol className="score-chart-columns" aria-label={label}>
          {columns.map((column) => (
            <li key={column.key}>
              {column.href ? (
                <Link
                  href={column.href}
                  className="score-chart-column"
                  aria-label={column.label}
                  aria-current={column.current}
                  tabIndex={-1}
                  prefetch={false}
                >
                  <ColumnMarks column={column} />
                </Link>
              ) : (
                <span className="score-chart-column" aria-current={column.current} tabIndex={0}>
                  <ColumnMarks column={column} />
                  <span className="visually-hidden">{column.label}</span>
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="score-chart-xaxis" aria-hidden="true">
          {axisLabelIndexes(columns.length).flatMap((index) => {
            const column = columns[index];
            return column
              ? [
                  <span key={column.key} style={axisLabelStyle(index, columns.length)}>
                    {column.axisLabel}
                  </span>,
                ]
              : [];
          })}
        </div>
      </div>
      <figcaption className="small muted">{caption}</figcaption>
    </figure>
  );
}

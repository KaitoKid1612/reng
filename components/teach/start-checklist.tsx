import Link from "next/link";

import type { StartStep } from "@/lib/teaching-start";

interface StartChecklistProps {
  steps: StartStep[];
  title?: string;
}

// The page decides whether to show it (showsStartSteps); established teachers never see it.
export function StartChecklist({ steps, title = "Các bước bắt đầu dạy" }: StartChecklistProps) {
  const doneCount = steps.filter((step) => step.isDone).length;
  const nextIndex = steps.findIndex((step) => !step.isDone);
  return (
    <section className="start-checklist" aria-labelledby="start-checklist-title">
      <h2 id="start-checklist-title">{title}</h2>
      <p className="small muted">
        Đã xong {doneCount}/{steps.length} bước. Danh sách tự ẩn khi lớp đã có học viên và bài tập.
      </p>
      <ol>
        {steps.map((step, index) => (
          <li key={step.label} data-done={step.isDone}>
            <span className="start-step-mark" aria-hidden="true">
              {step.isDone ? "✓" : index + 1}
            </span>
            <div>
              {step.isDone ? (
                <span>
                  {step.label}
                  <span className="visually-hidden"> (đã xong)</span>
                </span>
              ) : (
                <Link
                  href={step.href}
                  className={index === nextIndex ? "start-step-next" : undefined}
                >
                  {step.label}
                </Link>
              )}
              <p className="item-meta">{step.hint}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

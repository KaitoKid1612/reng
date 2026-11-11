import { Check, Flame } from "lucide-react";

import type { StreakStatus } from "@/lib/study-streak";

interface StreakCardProps {
  streak: StreakStatus;
  // The heading level fits the page: a section heading on the home page, a tile on Tiến độ.
  headingLevel?: "h2" | "h3";
}

function describeToday({ days, hasStudiedToday }: StreakStatus) {
  if (hasStudiedToday) {
    return "Đã giữ chuỗi hôm nay";
  }
  return days > 0 ? "Học một việc hôm nay để giữ chuỗi" : "Học một việc hôm nay để bắt đầu chuỗi";
}

// The daily goal: any study keeps the streak, and the next milestone gives it a target.
export function StreakCard({ streak, headingLevel: Heading = "h2" }: StreakCardProps) {
  const { days, hasStudiedToday, previousMilestone, nextMilestone } = streak;
  return (
    <section
      className="streak-card"
      data-today={hasStudiedToday ? "done" : "pending"}
      aria-labelledby="streak-title"
    >
      <span className="streak-flame" aria-hidden="true">
        <Flame size={30} />
      </span>
      <div>
        <Heading id="streak-title" className="streak-days">
          <strong>{days}</strong> ngày học liên tiếp
        </Heading>
        <p className="streak-today">
          {hasStudiedToday && <Check size={16} aria-hidden="true" />}
          {describeToday(streak)}
        </p>
        {nextMilestone ? (
          <>
            <progress
              value={days - previousMilestone}
              max={nextMilestone - previousMilestone}
              aria-label={`Tiến tới mốc ${nextMilestone} ngày`}
            />
            <p className="small muted">
              Còn {nextMilestone - days} ngày tới mốc {nextMilestone} ngày
            </p>
          </>
        ) : (
          <p className="small muted">Bạn đã qua mọi mốc chuỗi ngày.</p>
        )}
      </div>
    </section>
  );
}

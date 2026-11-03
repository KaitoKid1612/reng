import { TodayRows } from "@/components/classroom/today-rows";
import { toTodayRows } from "@/lib/learner-today";

import type { TodayPlan as Plan } from "@/lib/learner-today";

interface TodayPlanProps {
  plan: Plan;
  now: Date;
  // Shows each item's class, which matters only with several classes.
  showClass: boolean;
}

export function TodayPlan({ plan, now, showClass }: TodayPlanProps) {
  const rows = toTodayRows(plan.items, now, showClass);
  return (
    <section className="today-plan" aria-labelledby="today-title">
      <h2 id="today-title">Hôm nay học gì</h2>
      {rows.length ? (
        <TodayRows rows={rows} />
      ) : (
        <p className="muted">
          Hôm nay chưa có việc nào đến hạn. Đọc lại bài đã học hoặc luyện thêm ở lớp của bạn nhé.
        </p>
      )}
      {plan.moreAssignmentCount > 0 && (
        <p className="small today-more">
          Còn {plan.moreAssignmentCount} bài tập khác cần làm, xem ở mục{" "}
          <a href="#open-work">Bài tập cần làm</a>.
        </p>
      )}
    </section>
  );
}

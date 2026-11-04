import { TodayRows } from "@/components/classroom/today-rows";

import type { TeacherToday } from "@/lib/teacher-today";

interface TeacherTodayPanelProps {
  today: TeacherToday;
}

export function TeacherTodayPanel({ today }: TeacherTodayPanelProps) {
  return (
    <section className="today-plan" aria-labelledby="teacher-today-title">
      <h2 id="teacher-today-title">Hôm nay dạy gì</h2>
      {today.rows.length ? (
        <TodayRows rows={today.rows} />
      ) : (
        <p className="muted">Hôm nay không có buổi dạy, bài tập đến hạn hay bài nộp mới.</p>
      )}
      {today.moreCount > 0 && (
        <p className="small today-more">
          Còn {today.moreCount} mục khác; xem từng lớp ở danh sách bên dưới.
        </p>
      )}
    </section>
  );
}

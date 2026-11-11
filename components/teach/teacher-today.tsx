import Link from "next/link";

import { TodayRows } from "@/components/classroom/today-rows";

import type { TeacherToday } from "@/lib/teacher-today";

interface TeacherTodayPanelProps {
  today: TeacherToday;
  // Set on the home page, where the class list is on another page.
  isOnHome?: boolean;
}

export function TeacherTodayPanel({ today, isOnHome = false }: TeacherTodayPanelProps) {
  return (
    <section className="today-plan" aria-labelledby="teacher-today-title">
      <h2 id="teacher-today-title">Hôm nay dạy gì</h2>
      {today.rows.length ? (
        <TodayRows rows={today.rows} />
      ) : (
        <p className="muted">Hôm nay không có buổi dạy, bài tập đến hạn hay bài nộp mới.</p>
      )}
      {today.moreCount > 0 && !isOnHome && (
        <p className="small today-more">
          Còn {today.moreCount} mục khác; xem từng lớp ở danh sách bên dưới.
        </p>
      )}
      {isOnHome && (
        <p className="small today-more">
          <Link href="/teach">
            {today.moreCount > 0
              ? `Xem thêm ${today.moreCount} mục ở trang Giảng dạy`
              : "Mở trang Giảng dạy"}
          </Link>
        </p>
      )}
    </section>
  );
}

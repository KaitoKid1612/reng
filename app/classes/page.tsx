import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { TodayPlan } from "@/components/classroom/today-plan";
import { UpcomingSession } from "@/components/classroom/upcoming-session";
import {
  AssignmentStatusBadge,
  describeDue,
  MODE_LABELS,
} from "@/components/classroom/assignment-labels";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/server/account";
import { getLearnerAgenda } from "@/lib/server/learner";
import { planLearnerToday } from "@/lib/server/learner-today";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lớp của tôi" };

export default async function ClassesPage() {
  const account = await requireStudent("/classes");
  const now = new Date();
  const agenda = await getLearnerAgenda(account.id, now);
  const { schedules, plan: today } = await planLearnerToday(agenda, now);
  // With work from several classes, each item says which class it belongs to.
  const classNames = new Map(agenda.classes.map((item) => [item.id, item.name]));
  const hasSeveralClasses = agenda.classes.length > 1;
  const hasOpenWork = agenda.openAssignments.length > 0;
  // "Hôm nay học gì" holds the page's main button whenever it lists something to do.
  const todayHasAction = today.items.some((item) => item.kind !== "session" || item.isLive);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Lớp của tôi</h1>
          <p>Xin chào {account.fullName || account.email}.</p>
        </div>
        <Link href="/join-class" className={buttonVariants({ variant: "outline" })}>
          Vào lớp mới
        </Link>
      </div>
      {agenda.classes.length > 0 && (
        <TodayPlan plan={today} now={now} showClass={hasSeveralClasses} />
      )}
      <section className="section-block" aria-labelledby="open-work">
        <h2 id="open-work">Bài tập cần làm</h2>
        {hasOpenWork ? (
          <ul className="item-list">
            {agenda.openAssignments.map((item, index) => (
              <li key={item.assignment.id}>
                <div>
                  <h3>
                    <Link href={`/assignments/${item.assignment.id}`}>{item.assignment.title}</Link>
                  </h3>
                  <p className="item-meta">
                    {hasSeveralClasses && `${classNames.get(item.assignment.classId) ?? ""} · `}
                    {MODE_LABELS[item.assignment.mode]}, {describeDue(item.assignment.dueAt)}
                  </p>
                </div>
                <div className="button-row item-actions">
                  <AssignmentStatusBadge status={item.status} />
                  <Link
                    href={`/assignments/${item.assignment.id}`}
                    className={buttonVariants({
                      variant: index === 0 && !todayHasAction ? "default" : "outline",
                    })}
                  >
                    {item.status === "in_progress" ? "Làm tiếp" : "Làm bài"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Không có bài nào đang chờ. Ôn lại thẻ từ vựng nhé.</p>
        )}
      </section>
      <section className="section-block" aria-labelledby="review-title">
        <h2 id="review-title">Ôn lại và tiến độ</h2>
        <div className="button-row">
          <Link
            href="/review"
            className={buttonVariants({
              variant:
                !todayHasAction && !hasOpenWork && agenda.dueCardCount > 0 ? "default" : "outline",
            })}
          >
            Ôn tập ({agenda.dueCardCount}
            {agenda.hasMoreDueCards ? "+" : ""} thẻ)
          </Link>
          <Link href="/mistakes" className={buttonVariants({ variant: "outline" })}>
            Sổ lỗi
          </Link>
          <Link href="/progress" className={buttonVariants({ variant: "outline" })}>
            Tiến độ của tôi
          </Link>
        </div>
      </section>
      <section className="section-block" aria-labelledby="my-classes">
        <h2 id="my-classes">Lớp đang học</h2>
        {agenda.classes.length ? (
          <ul className="item-list">
            {agenda.classes.map((item) => (
              <li key={item.id}>
                <div>
                  <h3>
                    <Link href={`/classes/${item.id}`}>{item.name}</Link>
                  </h3>
                  <p className="item-meta">
                    {item.isSelfStudy
                      ? "Lớp tự học của bạn"
                      : `Giảng viên: ${item.teacherName || "chưa cập nhật"}`}
                  </p>
                  <UpcomingSession slots={schedules.get(item.id)?.slots ?? []} now={now} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Bạn chưa vào lớp nào. <Link href="/join-class">Nhập mã lớp từ giảng viên</Link> để bắt
            đầu.
          </p>
        )}
      </section>
      <div className="button-row">
        <Link href="/guide#learner-title" className={buttonVariants({ variant: "ghost" })}>
          Hướng dẫn
        </Link>
        <Link href="/settings/account" className={buttonVariants({ variant: "ghost" })}>
          Tài khoản
        </Link>
        <Link
          href={account.role === "teacher" ? "/teach" : "/teach/start"}
          className={buttonVariants({ variant: "ghost" })}
        >
          {account.role === "teacher" ? "Giảng dạy" : "Đăng ký giảng dạy"}
        </Link>
        <SignOutButton />
      </div>
    </>
  );
}

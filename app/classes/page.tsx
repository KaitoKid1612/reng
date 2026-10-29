import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  AssignmentStatusBadge,
  describeDue,
  MODE_LABELS,
} from "@/components/classroom/assignment-labels";
import { buttonVariants } from "@/components/ui/button";
import { requireStudent } from "@/lib/server/account";
import { getLearnerAgenda } from "@/lib/server/learner";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lớp của tôi" };

export default async function ClassesPage() {
  const account = await requireStudent("/classes");
  const agenda = await getLearnerAgenda(account.id, new Date());
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Lớp của tôi</h1>
          <p>Xin chào {account.fullName || account.email}.</p>
        </div>
        <div className="button-row">
          <Link href="/review" className={buttonVariants()}>
            Ôn tập ({agenda.dueCardCount} thẻ)
          </Link>
          <Link href="/join-class" className={buttonVariants({ variant: "outline" })}>
            Vào lớp mới
          </Link>
        </div>
      </div>
      <section className="section-block" aria-labelledby="open-work">
        <h2 id="open-work">Bài tập cần làm</h2>
        {agenda.openAssignments.length ? (
          <ul className="item-list">
            {agenda.openAssignments.map((item) => (
              <li key={item.assignment.id}>
                <div>
                  <h3>
                    <Link href={`/assignments/${item.assignment.id}`}>{item.assignment.title}</Link>
                  </h3>
                  <p className="item-meta">
                    {MODE_LABELS[item.assignment.mode]}, {describeDue(item.assignment.dueAt)}
                  </p>
                </div>
                <AssignmentStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Không có bài nào đang chờ. Ôn lại thẻ từ vựng nhé.</p>
        )}
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
                  <p className="item-meta">Giảng viên: {item.teacherName || "chưa cập nhật"}</p>
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
        <Link href="/mistakes" className={buttonVariants({ variant: "ghost" })}>
          Sổ lỗi
        </Link>
        <Link href="/progress" className={buttonVariants({ variant: "ghost" })}>
          Tiến độ của tôi
        </Link>
        <Link href="/guide#learner-title" className={buttonVariants({ variant: "ghost" })}>
          Hướng dẫn
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

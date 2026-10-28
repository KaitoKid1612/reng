import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { formatJoinCode } from "@/lib/join-code";
import { requireTeacher } from "@/lib/server/account";
import { listOwnedLessons, listTeacherClasses } from "@/lib/server/classes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giảng dạy" };

export default async function TeachPage() {
  const account = await requireTeacher("/teach");
  const [classes, lessons] = await Promise.all([
    listTeacherClasses(account.id),
    listOwnedLessons(account.id),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Giảng dạy</h1>
          <p>Xin chào {account.fullName || account.email}.</p>
        </div>
        <Link href="/teach/classes" className={buttonVariants()}>
          Tạo lớp
        </Link>
      </div>
      <section className="section-block" aria-labelledby="teacher-classes">
        <h2 id="teacher-classes">Lớp của tôi</h2>
        {classes.length ? (
          <ul className="item-list">
            {classes.map((item) => (
              <li key={item.id}>
                <div>
                  <h3>
                    <Link href={`/teach/classes/${item.id}`}>{item.name}</Link>
                  </h3>
                  <p className="item-meta">
                    {item.memberCount} học viên
                    {item.join_enabled ? `, mã ${formatJoinCode(item.join_code)}` : ", ngừng nhận"}
                    {item.active ? "" : ", đã lưu trữ"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Chưa có lớp nào. <Link href="/teach/classes">Tạo lớp đầu tiên</Link> rồi gửi mã cho học
            viên.
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="teacher-lessons">
        <h2 id="teacher-lessons">Bài học tôi sở hữu</h2>
        {lessons.length ? (
          <ul className="item-list">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <div>
                  <h3>{lesson.title}</h3>
                  <p className="item-meta">
                    {lesson.versions.length} phiên bản, mới nhất số{" "}
                    {lesson.versions[0]?.version_no ?? "—"}
                  </p>
                </div>
                {lesson.publishedVersionId && (
                  <Link href={`/lessons/${lesson.id}/slide?version=${lesson.publishedVersionId}#1`}>
                    Trình chiếu
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Chưa có bài nào thuộc tài khoản này. Người vận hành xuất bản bài bằng script với chủ sở
            hữu là ID {account.id}.
          </p>
        )}
      </section>
      <SignOutButton />
    </>
  );
}

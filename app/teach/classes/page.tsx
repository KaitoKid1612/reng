import Link from "next/link";

import { ClassSettingsForm } from "@/components/teach/class-settings-form";
import { requireTeacher } from "@/lib/server/account";
import { listTeacherClasses } from "@/lib/server/classes";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lớp học" };

export default async function TeacherClassesPage() {
  const account = await requireTeacher("/teach/classes");
  const classes = await listTeacherClasses(account.id);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Lớp học</h1>
          <p>
            <Link href="/teach">Giảng dạy</Link>
          </p>
        </div>
      </div>
      <section className="section-block" aria-labelledby="create-class">
        <h2 id="create-class">Tạo lớp mới</h2>
        <ClassSettingsForm />
      </section>
      {classes.length > 0 && (
        <section className="section-block" aria-labelledby="class-list">
          <h2 id="class-list">Các lớp đã tạo</h2>
          <ul className="item-list">
            {classes.map((item) => (
              <li key={item.id}>
                <Link href={`/teach/classes/${item.id}`}>{item.name}</Link>
                <span className="item-meta">{item.memberCount} học viên</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

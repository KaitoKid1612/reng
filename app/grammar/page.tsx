import Link from "next/link";

import { GrammarSearch } from "@/components/lessons/grammar-search";
import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { listPublicLessons } from "@/lib/lesson-repository";
import { requireStudent } from "@/lib/server/account";
import { loadClassGrammar } from "@/lib/server/class-grammar";
import { loadOrNotFound } from "@/lib/server/pages";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

import type { PublicLesson } from "@/lib/lesson-schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tra cứu ngữ pháp tiếng Nhật",
  description:
    "Tra cứu mẫu câu tiếng Nhật trong các bài học công khai, kèm nghĩa tiếng Việt, giải thích và ví dụ.",
  alternates: { canonical: "/grammar" },
};
export const dynamic = "force-dynamic";

interface GrammarPageProps {
  searchParams: Promise<{ class?: string | string[] }>;
}

// ?class=<id>: the grammar of one class's lessons, for a member who forgot a pattern mid-set.
async function ClassGrammar({ classId }: { classId: string }) {
  const account = await requireStudent(`/grammar?class=${classId}`);
  const { classRow, lessons } = await loadOrNotFound(
    loadClassGrammar(account.id, classId, new Date()),
  );
  return (
    <GrammarSearch
      lessons={lessons}
      classId={classId}
      heading={`Ngữ pháp của lớp ${classRow.name}`}
      intro={
        lessons.length
          ? "Tìm mẫu câu trong các bài lớp đã mở bằng tiếng Nhật hoặc nghĩa tiếng Việt."
          : "Lớp chưa mở bài nào có mẫu câu."
      }
      backHref={`/classes/${classId}`}
    />
  );
}

export default async function GrammarPage({ searchParams }: GrammarPageProps) {
  const classId = (await searchParams).class;
  if (typeof classId === "string") {
    return <ClassGrammar classId={classId} />;
  }
  // Grammar search indexes the Japanese v1 grammar fields.
  const lessons = (await listPublicLessons()).filter(
    (lesson): lesson is PublicLesson => !isPublicTeachingLesson(lesson),
  );
  const navigation = <SubjectStudyNav subjectId="japanese" currentHref="/grammar" />;
  if (!lessons.length) {
    return (
      <>
        {navigation}
        <div className="page-heading">
          <div>
            <h1>Tra cứu ngữ pháp tiếng Nhật</h1>
            <p>
              Chưa có bài học công khai để tra cứu. Mẫu câu của lớp nằm trong từng bài ở{" "}
              <Link href="/classes">Lớp của tôi</Link>.
            </p>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      {navigation}
      <GrammarSearch lessons={lessons} />
    </>
  );
}

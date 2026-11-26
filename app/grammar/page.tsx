import Link from "next/link";

import { GrammarSearch } from "@/components/lessons/grammar-search";
import { SubjectStudyNav } from "@/components/self-study/subject-study-nav";
import { signInPath } from "@/lib/auth-paths";
import { toGrammarEntries } from "@/lib/grammar-search";
import { isLocalLessonSource, listPublicLessons } from "@/lib/lesson-repository";
import { getCurrentAccount, requireStudent } from "@/lib/server/account";
import { loadAccountGrammar, loadClassGrammar, withTopicKeys } from "@/lib/server/class-grammar";
import { loadOrNotFound } from "@/lib/server/pages";
import { isPublicTeachingLesson } from "@/lib/teaching-content";

import type { GrammarSource } from "@/lib/grammar-search";
import type { PublicLesson } from "@/lib/lesson-schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tra cứu ngữ pháp tiếng Nhật",
  description:
    "Tra cứu mẫu câu tiếng Nhật trong các bài học công khai, kèm nghĩa tiếng Việt, giải thích và ví dụ.",
  alternates: { canonical: "/grammar" },
};
export const dynamic = "force-dynamic";

const SIGNED_IN_INTRO = {
  student: "Tìm mẫu câu trong các bài của lớp bạn bằng tiếng Nhật hoặc nghĩa tiếng Việt.",
  teacher:
    "Tìm mẫu câu trong các bài bạn đã xuất bản và bài của lớp bạn học, bằng tiếng Nhật hoặc nghĩa tiếng Việt.",
} as const;

interface GrammarPageProps {
  searchParams: Promise<{ class?: string | string[] }>;
}

// ?class=<id>: the grammar of one class's lessons, for a member who forgot a pattern mid-set.
async function ClassGrammar({ classId }: { classId: string }) {
  const account = await requireStudent(`/grammar?class=${classId}`);
  const { classRow, lessons } = await loadOrNotFound(
    loadClassGrammar(account.id, classId, new Date()),
  );
  const sources = await withTopicKeys(lessons.map((lesson) => ({ lesson, classId })));
  return (
    <GrammarSearch
      entries={toGrammarEntries(sources)}
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
  const account = await getCurrentAccount();
  // Signed in, the lookup covers the reader's classes (and a teacher's own lessons) before the
  // public ones; most lessons belong to classes, so public lessons alone often find nothing.
  const [own, publicLessons] = await Promise.all([
    account ? loadAccountGrammar(account, new Date()) : Promise.resolve<GrammarSource[]>([]),
    listPublicLessons(),
  ]);
  // Grammar search indexes the Japanese v1 grammar fields.
  const publicSources = publicLessons
    .filter((lesson): lesson is PublicLesson => !isPublicTeachingLesson(lesson))
    .map((lesson) => ({ lesson }));
  // Bundled sample lessons (LESSON_SOURCE=local) have no database row and are filed by their ID.
  const local = isLocalLessonSource();
  const keyed = await withTopicKeys(local ? own : [...own, ...publicSources]);
  const entries = toGrammarEntries(local ? [...keyed, ...publicSources] : keyed);
  const navigation = <SubjectStudyNav subjectId="japanese" currentHref="/grammar" />;
  if (!entries.length) {
    return (
      <>
        {navigation}
        <div className="page-heading">
          <div>
            <h1>Tra cứu ngữ pháp tiếng Nhật</h1>
            {account ? (
              <p>
                Các bài trong lớp của bạn chưa có mẫu câu để tra. Xem{" "}
                <Link href="/classes">Lớp của tôi</Link>.
              </p>
            ) : (
              <p>
                <Link href={signInPath("/grammar")}>Đăng nhập</Link> để tra mẫu câu trong các bài
                của lớp bạn.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      {navigation}
      <GrammarSearch
        entries={entries}
        intro={account ? SIGNED_IN_INTRO[account.role] : undefined}
      />
    </>
  );
}

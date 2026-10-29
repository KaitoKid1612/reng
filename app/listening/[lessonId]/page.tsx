import Link from "next/link";
import { notFound } from "next/navigation";

import { ListeningPractice } from "@/components/listening/listening-practice";
import { buttonVariants } from "@/components/ui/button";
import { isListeningQuestion, toQuestionView } from "@/lib/assignment";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";
import { isTeachingVersion } from "@/lib/teaching-content";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện nghe" };

interface ListeningPageProps {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function ListeningPage({ params, searchParams }: ListeningPageProps) {
  const { lessonId } = await params;
  const { version: versionId } = await searchParams;
  const version = await loadAccessibleLessonVersion(lessonId, versionId);
  if (!version) {
    notFound();
  }
  // Views carry audio and prompts only; answers and transcripts come from the check API.
  const views = version.content.questions.filter(isListeningQuestion).map(toQuestionView);
  return (
    <>
      <div className="page-heading">
        <div>
          {!isTeachingVersion(version) && (
            <p lang="ja" className="lesson-japanese-title">
              {version.titleJa}
            </p>
          )}
          <h1>Luyện nghe: {version.title}</h1>
          <p>
            Bấm Nghe để phát, Lùi 5 giây để nghe lại đoạn vừa qua. Transcript hiện sau khi bạn trả
            lời.
          </p>
        </div>
        <Link
          href={`/lessons/${version.lessonId}?version=${version.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Về bài học
        </Link>
      </div>
      {views.length ? (
        <ListeningPractice lessonId={version.lessonId} versionId={version.id} views={views} />
      ) : (
        <p className="notice-panel">Bài này chưa có câu luyện nghe.</p>
      )}
    </>
  );
}

import Link from "next/link";

import { LessonEditor } from "@/components/editor/lesson-editor";
import { requireTeacher } from "@/lib/server/account";
import { loadLessonEditor } from "@/lib/server/lessons";
import { loadOrNotFound } from "@/lib/server/pages";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Soạn bài" };

interface EditLessonPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLessonPage({ params }: EditLessonPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/lessons/${id}/edit`);
  const editor = await loadOrNotFound(loadLessonEditor(account.id, id));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Soạn bài: {editor.draft.metadata.title || editor.lessonId}</h1>
          <p>
            <Link href="/teach">Giảng dạy</Link>, mã bài {editor.lessonId}
          </p>
        </div>
      </div>
      <LessonEditor
        lessonId={editor.lessonId}
        initialDraft={editor.draft}
        initialRevision={editor.revision}
        initialSavedAt={editor.savedAt}
        publishedVersionId={editor.publishedVersionId}
        versionCount={editor.versions.length}
      />
    </>
  );
}

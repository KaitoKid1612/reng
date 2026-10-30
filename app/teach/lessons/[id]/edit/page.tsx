import Link from "next/link";

import { LessonEditorLoader, TeachingEditorLoader } from "@/components/editor/editor-loaders";
import { requireTeacher } from "@/lib/server/account";
import { loadLessonEditor } from "@/lib/server/lessons";
import { loadOrNotFound } from "@/lib/server/pages";
import { loadTeachingEditor, toTeachingDraft } from "@/lib/server/teaching-lessons";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Soạn bài" };

interface EditLessonPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLessonPage({ params }: EditLessonPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/lessons/${id}/edit`);
  // Schema v2 drafts open the guided editor; everything else keeps the v1 editor.
  const teaching = await loadTeachingEditor(account.id, id);
  if (teaching) {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Soạn bài: {teaching.title || "Bài chưa đặt tên"}</h1>
            <p>
              <Link href="/teach">Giảng dạy</Link>
            </p>
          </div>
        </div>
        <TeachingEditorLoader
          lessonId={teaching.lessonId}
          initialDraft={toTeachingDraft(teaching)}
          initialRevision={teaching.revision}
          initialSavedAt={teaching.savedAt}
          initialReviewedIds={teaching.reviewedIds}
          initialPublishedVersionId={teaching.publishedVersionId}
          initialVersionCount={teaching.versionCount}
          visibility={teaching.visibility}
        />
      </>
    );
  }
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
      <LessonEditorLoader
        lessonId={editor.lessonId}
        visibility={editor.visibility}
        initialDraft={editor.draft}
        initialRevision={editor.revision}
        initialSavedAt={editor.savedAt}
        publishedVersionId={editor.publishedVersionId}
        versionCount={editor.versions.length}
      />
    </>
  );
}

import Link from "next/link";

import { VocabularyImport } from "@/components/editor/vocabulary-import";
import { requireTeacher } from "@/lib/server/account";
import { listOwnedLessons } from "@/lib/server/classes";
import { loadLessonEditor } from "@/lib/server/lessons";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nhập từ vựng CSV" };

interface ImportCsvPageProps {
  searchParams: Promise<{ lesson?: string }>;
}

export default async function ImportCsvPage({ searchParams }: ImportCsvPageProps) {
  const account = await requireTeacher("/teach/import-csv");
  const { lesson } = await searchParams;
  const owned = await listOwnedLessons(account.id);
  const editors = await Promise.all(
    owned.map((item) => loadLessonEditor(account.id, item.id).catch(() => null)),
  );
  const lessons = editors.flatMap((editor) =>
    editor
      ? [
          {
            id: editor.lessonId,
            title: editor.draft.metadata.title || editor.lessonId,
            revision: editor.revision,
            vocab: editor.draft.content.vocab.map((item) => ({ jp: item.jp, vi: item.vi })),
          },
        ]
      : [],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Nhập từ vựng</h1>
          <p>
            <Link href="/teach">Giảng dạy</Link>. Từ hợp lệ được thêm vào cuối bản nháp; xem lại
            trong editor rồi xuất bản.
          </p>
        </div>
      </div>
      <VocabularyImport lessons={lessons} initialLessonId={lesson ?? ""} />
    </>
  );
}

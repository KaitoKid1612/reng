import { notFound } from "next/navigation";

import { HistoryArchiveView } from "@/components/history/history-archive-view";
import { LinkLearnerForm } from "@/components/history/link-learner-form";
import { requireAccount } from "@/lib/server/account";
import { loadLearningHistory } from "@/lib/server/learning-history";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chi tiết lịch sử học tập",
  robots: { index: false, follow: false },
};
interface HistoryDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; outcome?: string }>;
}

export default async function HistoryDetailPage({ params, searchParams }: HistoryDetailPageProps) {
  const { id } = await params;
  const account = await requireAccount(`/history/${id}`);
  const record = await loadLearningHistory(id);
  if (!record) {
    notFound();
  }
  return (
    <HistoryArchiveView
      id={id}
      archive={record.payload}
      importedAt={record.imported_at}
      query={await searchParams}
    >
      {!record.learner_id && record.teacher_id === account.id && account.role === "teacher" && (
        <LinkLearnerForm archiveId={id} />
      )}
    </HistoryArchiveView>
  );
}

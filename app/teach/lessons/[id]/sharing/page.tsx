import Link from "next/link";

import { LessonShareForm } from "@/components/teach/lesson-share-form";
import { ShareRevokeForm } from "@/components/teach/share-revoke-form";
import { requireTeacher } from "@/lib/server/account";
import { loadSharingOverview } from "@/lib/server/lesson-sharing";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chia sẻ bài" };

const PERMISSION_LABELS = { view: "Chỉ xem", copy: "Xem và sao chép" } as const;

interface LessonSharingPageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonSharingPage({ params }: LessonSharingPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/lessons/${id}/sharing`);
  const overview = await loadOrNotFound(loadSharingOverview(account.id, id));
  const active = overview.shares.filter((share) => !share.revokedAt);
  const revoked = overview.shares.filter((share) => share.revokedAt);
  let shareForm = <LessonShareForm lessonId={overview.lessonId} versions={overview.versions} />;
  if (overview.isCopy) {
    shareForm = (
      <p className="notice-panel">
        Bài này được sao chép từ giáo viên khác nên chưa chia sẻ tiếp được.
      </p>
    );
  } else if (!overview.versions.length) {
    shareForm = (
      <p className="notice-panel">
        Xuất bản bài trước khi chia sẻ. Người nhận chỉ xem được phiên bản đã xuất bản.
      </p>
    );
  }
  return (
    <div className="narrow-page">
      <h1>Chia sẻ: {overview.title}</h1>
      <p className="muted">
        <Link href="/teach">Giảng dạy</Link> ·{" "}
        <Link href={`/teach/lessons/${overview.lessonId}/edit`}>Soạn bài</Link>
      </p>
      {shareForm}
      <section className="section-block" aria-labelledby="active-shares">
        <h2 id="active-shares">Đang chia sẻ</h2>
        {active.length ? (
          <ul className="item-list">
            {active.map((share) => (
              <li key={share.id}>
                <div>
                  <h3>{share.recipientName || share.recipientEmail}</h3>
                  <p className="item-meta">
                    {share.recipientEmail} · phiên bản {share.versionNo} ·{" "}
                    {PERMISSION_LABELS[share.permission]} · từ{" "}
                    {formatStudyDateTime(share.grantedAt)}
                  </p>
                </div>
                <ShareRevokeForm shareId={share.id} recipientLabel={share.recipientEmail} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Chưa chia sẻ bài này cho ai.</p>
        )}
      </section>
      {revoked.length > 0 && (
        <section className="section-block" aria-labelledby="revoked-shares">
          <h2 id="revoked-shares">Đã thu hồi</h2>
          <ul className="item-list">
            {revoked.map((share) => (
              <li key={share.id}>
                <div>
                  <h3>{share.recipientName || share.recipientEmail}</h3>
                  <p className="item-meta">
                    Phiên bản {share.versionNo} · {PERMISSION_LABELS[share.permission]} · thu hồi{" "}
                    {share.revokedAt ? formatStudyDateTime(share.revokedAt) : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

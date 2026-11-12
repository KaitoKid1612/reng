import { CalendarCheck, Mail } from "lucide-react";
import Link from "next/link";

import { GuideToc } from "@/components/guide/guide-toc";
import { ContactEmail } from "@/components/legal/contact-email";
import { DATA_REQUEST_DAYS, LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  title: string;
  Icon: LucideIcon;
  body: ReactNode;
}

export interface LegalSummaryPoint {
  Icon: LucideIcon;
  text: string;
}

interface LegalDocumentProps {
  path: "/privacy" | "/terms";
  title: string;
  lead: string;
  summary: readonly LegalSummaryPoint[];
  sections: readonly LegalSection[];
}

const DOCUMENTS = [
  { path: "/privacy", label: "Quyền riêng tư" },
  { path: "/terms", label: "Điều khoản sử dụng" },
] as const;

// The privacy policy and the terms share one layout, the same as the user guide: a switch between
// the two, a short summary, then numbered sections as cards beside a contents that follows the
// reader (a bar at the top of a phone screen).
export function LegalDocument({ path, title, lead, summary, sections }: LegalDocumentProps) {
  return (
    <article className="guide-page legal-page">
      <header className="legal-hero">
        <nav className="legal-switch" aria-label="Văn bản pháp lý">
          {DOCUMENTS.map((document) => (
            <Link
              key={document.path}
              href={document.path}
              aria-current={document.path === path ? "page" : undefined}
            >
              {document.label}
            </Link>
          ))}
        </nav>
        <h1>{title}</h1>
        <p className="legal-effective">
          <CalendarCheck size={16} aria-hidden="true" />
          Có hiệu lực từ {LEGAL_EFFECTIVE_DATE}.
        </p>
        <p className="guide-lead">{lead}</p>
        <section className="legal-summary" aria-labelledby="legal-summary-title">
          <h2 id="legal-summary-title">Tóm tắt</h2>
          <ul>
            {summary.map(({ Icon, text }) => (
              <li key={text}>
                <span className="guide-section-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Bản tóm tắt để đọc nhanh; nội dung đầy đủ ở các mục dưới đây.
          </p>
        </section>
      </header>
      <div className="guide-layout">
        <GuideToc
          label={`Mục lục ${title.toLowerCase()}`}
          groups={[
            {
              id: "sections",
              title: "Các mục",
              items: sections.map(({ id, title: sectionTitle }) => ({ id, title: sectionTitle })),
            },
          ]}
        />
        <div className="guide-content">
          {sections.map(({ id, title: sectionTitle, Icon, body }) => (
            <section key={id} id={id} className="guide-section" aria-labelledby={`${id}-heading`}>
              <div className="guide-section-head">
                <span className="guide-section-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <h2 id={`${id}-heading`}>{sectionTitle}</h2>
              </div>
              <div className="legal-body">{body}</div>
            </section>
          ))}
          <aside className="legal-contact" aria-labelledby="legal-contact-title">
            <span className="guide-role-icon" aria-hidden="true">
              <Mail size={24} />
            </span>
            <div className="inline-links">
              <h2 id="legal-contact-title">Cần hỏi thêm?</h2>
              <p>
                Gửi thư tới <ContactEmail />. Yêu cầu về dữ liệu cá nhân được trả lời trong vòng{" "}
                {DATA_REQUEST_DAYS} ngày.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

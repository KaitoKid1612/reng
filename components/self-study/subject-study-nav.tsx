import Link from "next/link";

import { getSelfStudySubject } from "@/lib/self-study";

import type { SelfStudySubjectId } from "@/lib/self-study";

interface SubjectStudyNavProps {
  subjectId: SelfStudySubjectId;
  currentHref: string;
}

// The header has one subject-neutral "Tự học" entry; a subject's tools link to each other here.
export function SubjectStudyNav({ subjectId, currentHref }: SubjectStudyNavProps) {
  const subject = getSelfStudySubject(subjectId);
  return (
    <nav className="subject-nav" aria-label={`Tự học: ${subject.name}`}>
      <p>
        <Link href="/self-study">Tự học</Link>
        <span aria-hidden="true"> / </span>
        {subject.name}
      </p>
      <ul>
        {subject.tools.map((tool) => (
          <li key={tool.href}>
            <Link href={tool.href} aria-current={tool.href === currentHref ? "page" : undefined}>
              {tool.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

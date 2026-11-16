import Link from "next/link";
import { BookOpen } from "lucide-react";

import { JapaneseText } from "@/components/lessons/japanese-text";

import type { GrammarLink } from "@/lib/grammar-links";

interface GrammarLinkListProps {
  links: readonly GrammarLink[];
}

// After an answer: the class lesson that explains the grammar point the question tests. It opens
// in a new tab so a learner in the middle of a set keeps their place.
export function GrammarLinkList({ links }: GrammarLinkListProps) {
  if (!links.length) {
    return null;
  }
  return (
    <ul className="grammar-links">
      {links.map((link) => (
        <li key={link.href}>
          <BookOpen size={16} aria-hidden="true" />
          <Link href={link.href} target="_blank" rel="noopener">
            Ôn lại mẫu <JapaneseText text={link.pattern} />
          </Link>{" "}
          <span className="small muted">({link.lessonTitle})</span>
        </li>
      ))}
    </ul>
  );
}

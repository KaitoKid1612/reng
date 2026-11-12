"use client";

import { useEffect, useRef } from "react";

import { useCurrentSection } from "@/components/use-current-section";

import type { MouseEvent } from "react";

interface ClassSection {
  // The id of the section's heading, or of a block such as the join code.
  id: string;
  label: string;
}

interface ClassSectionNavProps {
  sections: readonly ClassSection[];
}

// The class page holds about ten sections in one column; this bar stays at the top of the window
// so the teacher jumps between them and sees which one they are in.
export function ClassSectionNav({ sections }: ClassSectionNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const currentId = useCurrentSection(sections.map((section) => section.id));

  // On a narrow screen the bar scrolls sideways; keep the current section's link in view.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link) {
      return;
    }
    const isHidden =
      link.offsetLeft < nav.scrollLeft ||
      link.offsetLeft + link.offsetWidth > nav.scrollLeft + nav.clientWidth;
    if (isHidden) {
      nav.scrollTo({ left: link.offsetLeft - 16 });
    }
  }, [currentId]);

  // The jump glides here rather than through a page-wide smooth scroll, which Next.js 16 would
  // also apply when leaving for another page.
  function handleClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    const isMotionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: isMotionReduced ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav ref={navRef} className="class-section-nav" aria-label="Các phần của trang lớp">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={section.id === currentId ? "location" : undefined}
          onClick={(event) => handleClick(event, section.id)}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

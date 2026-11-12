"use client";

import { ChevronDown, ListTree } from "lucide-react";
import { useEffect, useState } from "react";

import { useCurrentSection } from "@/components/use-current-section";

import type { KeyboardEvent } from "react";

export interface GuideTocGroup {
  id: string;
  title: string;
  items: readonly { id: string; title: string }[];
}

interface GuideTocProps {
  groups: readonly GuideTocGroup[];
}

// The guide's table of contents. On a wide screen it is a column that stays beside the text and
// marks the section being read; on a phone it is a bar at the top of the window that names that
// section and opens the full list.
export function GuideToc({ groups }: GuideTocProps) {
  const items = groups.flatMap((group) => group.items);
  const currentId = useCurrentSection(items.map((item) => item.id));
  const current = items.find((item) => item.id === currentId);
  const [isOpen, setIsOpen] = useState(false);

  // A phone list left open would cover the text once the person scrolls on.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    function handleScroll() {
      setIsOpen(false);
    }
    const timer = window.setTimeout(
      () => window.addEventListener("scroll", handleScroll, { once: true, passive: true }),
      300,
    );
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && isOpen) {
      setIsOpen(false);
      event.currentTarget.querySelector<HTMLButtonElement>(".guide-toc-toggle")?.focus();
    }
  }

  return (
    <nav
      className="guide-toc"
      aria-label="Mục lục hướng dẫn"
      data-open={isOpen}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="guide-toc-toggle"
        aria-expanded={isOpen}
        aria-controls="guide-toc-list"
        onClick={() => setIsOpen((value) => !value)}
      >
        <ListTree size={18} aria-hidden="true" />
        <span className="guide-toc-toggle-label">Mục lục</span>
        {current && <span className="guide-toc-current">{current.title}</span>}
        <ChevronDown size={18} aria-hidden="true" className="guide-toc-chevron" />
      </button>
      <div id="guide-toc-list" className="guide-toc-list">
        {groups.map((group) => (
          <div key={group.id} className="guide-toc-group">
            <p id={`toc-${group.id}`} className="guide-toc-group-title">
              {group.title}
            </p>
            <ul aria-labelledby={`toc-${group.id}`}>
              {group.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={item.id === currentId ? "location" : undefined}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}

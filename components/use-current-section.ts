"use client";

import { useEffect, useState } from "react";

// A heading counts as the one being read once it passes this far below the top of the window.
const READING_LINE = 120;

/**
 * The id of the section being read: the last target whose top has passed the reading line, or
 * the last target once the page is scrolled to the bottom (a short last section never reaches
 * the line). Null above the first target.
 */
export function useCurrentSection(ids: readonly string[]) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  // A string key keeps the effect stable when a parent passes a new array with the same ids.
  const key = ids.join(" ");

  useEffect(() => {
    const targets = key.split(" ").filter(Boolean);
    let frame = 0;
    function findCurrent() {
      frame = 0;
      let current: string | null = null;
      for (const id of targets) {
        const target = document.getElementById(id);
        if (target && target.getBoundingClientRect().top <= READING_LINE) {
          current = id;
        }
      }
      const isAtBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (isAtBottom && targets.length) {
        current = targets[targets.length - 1];
      }
      setCurrentId(current);
    }
    function handleScroll() {
      if (!frame) {
        frame = requestAnimationFrame(findCurrent);
      }
    }
    findCurrent();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      cancelAnimationFrame(frame);
    };
  }, [key]);

  return currentId;
}

"use client";

import { useState } from "react";

import type { ReactNode } from "react";

interface UsageDisclosureProps {
  summary: string;
  needsStep: boolean;
  children: ReactNode;
}

// Folded while no class needs a step. A new publish opens it again; a step taken inside never
// folds it, so the teacher keeps seeing the classes and the result of each click.
export function UsageDisclosure({ summary, needsStep, children }: UsageDisclosureProps) {
  const [isOpen, setIsOpen] = useState(needsStep);
  const [lastNeedsStep, setLastNeedsStep] = useState(needsStep);
  if (needsStep !== lastNeedsStep) {
    setLastNeedsStep(needsStep);
    if (needsStep) {
      setIsOpen(true);
    }
  }
  return (
    <details
      className="lesson-usage-details"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

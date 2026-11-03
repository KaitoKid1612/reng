"use client";

import { createContext, use, useState } from "react";

import type { ReactNode } from "react";

interface UsageNoticeAreaProps {
  children: ReactNode;
}

const AnnounceContext = createContext<(message: string) => void>(() => undefined);

export function useUsageAnnounce() {
  return use(AnnounceContext);
}

// A class that gets the newest version drops its button and moves down the list, so the result
// is announced here, where it stays visible.
export function UsageNoticeArea({ children }: UsageNoticeAreaProps) {
  const [notice, setNotice] = useState("");
  return (
    <AnnounceContext value={setNotice}>
      {children}
      <p role="status" className={notice ? "form-notice" : "visually-hidden"}>
        {notice}
      </p>
    </AnnounceContext>
  );
}

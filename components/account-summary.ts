"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { rememberAccountHint } from "@/lib/account-hint";

export interface AccountSummary {
  name: string;
  role: "student" | "teacher";
  isAdmin: boolean;
  // Only people who can read an imported Google Sheet archive get a header link to it.
  hasLearningHistory: boolean;
}

function parseAccount(data: unknown): AccountSummary | null {
  if (!data || typeof data !== "object" || !("user" in data) || !data.user) {
    return null;
  }
  const user: unknown = data.user;
  if (
    typeof user !== "object" ||
    user === null ||
    !("name" in user) ||
    !("role" in user) ||
    typeof user.name !== "string" ||
    (user.role !== "student" && user.role !== "teacher")
  ) {
    return null;
  }
  return {
    name: user.name,
    role: user.role,
    isAdmin: "isAdmin" in user && user.isAdmin === true,
    hasLearningHistory: "hasLearningHistory" in user && user.hasLearningHistory === true,
  };
}

// Loaded after hydration so static pages stay static and cacheable. Undefined while loading,
// null for guests.
export function useAccountSummary() {
  const pathname = usePathname();
  const [account, setAccount] = useState<AccountSummary | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        const next = parseAccount(data);
        rememberAccountHint(next !== null);
        setAccount(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAccount(null);
        }
      });
    return () => controller.abort();
  }, [pathname]);

  return account;
}

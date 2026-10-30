"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface AccountSummary {
  name: string;
  role: "student" | "teacher";
  isAdmin: boolean;
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
  return { name: user.name, role: user.role, isAdmin: "isAdmin" in user && user.isAdmin === true };
}

// Loaded after hydration so static pages stay static and cacheable.
export function AccountLink() {
  const pathname = usePathname();
  const [account, setAccount] = useState<AccountSummary | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => setAccount(parseAccount(data)))
      .catch(() => {
        if (!controller.signal.aborted) {
          setAccount(null);
        }
      });
    return () => controller.abort();
  }, [pathname]);

  if (account === undefined) {
    return null;
  }
  if (!account) {
    return (
      <Link href="/sign-in" aria-current={pathname === "/sign-in" ? "page" : undefined}>
        Đăng nhập
      </Link>
    );
  }
  return (
    <>
      {account.isAdmin && (
        <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined}>
          Quản trị
        </Link>
      )}
      {account.role === "teacher" && (
        <Link href="/teach" aria-current={pathname.startsWith("/teach") ? "page" : undefined}>
          Giảng dạy
        </Link>
      )}
      <Link href="/classes" aria-current={pathname.startsWith("/classes") ? "page" : undefined}>
        Lớp của tôi
      </Link>
    </>
  );
}

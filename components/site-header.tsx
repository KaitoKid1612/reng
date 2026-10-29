"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountLink } from "@/components/account-link";

const NAVIGATION_LINKS = [
  { href: "/for-teachers", label: "Cho giáo viên" },
  { href: "/lessons", label: "Bài học" },
  { href: "/grammar", label: "Ngữ pháp" },
  { href: "/kana", label: "Bảng chữ cái" },
  { href: "/kana/practice", label: "Luyện tập" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Masu, trang chủ">
          <span lang="ja" className="brand-jp">
            ます
          </span>
          <span>
            Masu
            <span className="brand-caption">Học và dạy ngoại ngữ online</span>
          </span>
        </Link>
        <nav aria-label="Điều hướng chính">
          {NAVIGATION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <AccountLink />
        </nav>
      </div>
    </header>
  );
}

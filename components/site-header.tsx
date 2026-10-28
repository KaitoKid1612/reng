"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAVIGATION_LINKS = [
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
            <span className="brand-caption">Tiếng Nhật từ những nét đầu tiên</span>
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
        </nav>
      </div>
    </header>
  );
}

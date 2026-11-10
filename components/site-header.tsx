"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

import { useAccountSummary } from "@/components/account-summary";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SELF_STUDY_PATHS } from "@/lib/self-study";

import type { AccountSummary } from "@/components/account-summary";
import type { KeyboardEvent } from "react";

interface NavigationLink {
  href: string;
  label: string;
  // Shown to visitors only; hidden before the account loads in a browser that was signed in.
  isGuestOnly?: boolean;
  // Account areas stay marked on their inner pages, e.g. a class under /teach.
  isSection?: boolean;
  // Pages at other paths that belong to this entry.
  relatedPaths?: readonly string[];
}

// Ways in for visitors; signed-in people reach the same pages from their own areas.
const GUEST_LINKS: NavigationLink[] = [
  { href: "/join-class", label: "Vào lớp", isGuestOnly: true },
  { href: "/for-teachers", label: "Cho giáo viên", isGuestOnly: true },
];

// Free practice without an account. Subject tools are listed on /self-study, so the header stays
// the same whichever subjects Reng teaches.
const SELF_STUDY_LINK: NavigationLink = {
  href: "/self-study",
  label: "Tự học",
  relatedPaths: SELF_STUDY_PATHS,
};

const GUIDE_LINK: NavigationLink = { href: "/guide", label: "Hướng dẫn" };
const SIGN_IN_LINK: NavigationLink = { href: "/sign-in", label: "Đăng nhập" };

function listAccountLinks(account: AccountSummary): NavigationLink[] {
  const links: NavigationLink[] = [];
  if (account.isAdmin) {
    links.push({ href: "/admin", label: "Quản trị", isSection: true });
  }
  if (account.role === "teacher") {
    links.push({ href: "/teach", label: "Giảng dạy", isSection: true });
  }
  // A teacher's own classes live under Giảng dạy; this entry is where they study as a learner.
  links.push({
    href: "/classes",
    label: account.role === "teacher" ? "Lớp đang học" : "Lớp của tôi",
    isSection: true,
  });
  return links;
}

// Settings, progress and sign-out sit behind one entry, so they are reachable from every page.
const ACCOUNT_LINK: NavigationLink = {
  href: "/settings/account",
  label: "Tài khoản",
  isSection: true,
  relatedPaths: ["/settings/notifications"],
};

// While the account loads the menu matches the server-rendered guest menu, minus sign-in.
function listLinks(account: AccountSummary | null | undefined) {
  if (account) {
    return [...listAccountLinks(account), SELF_STUDY_LINK, GUIDE_LINK, ACCOUNT_LINK];
  }
  const links = [...GUEST_LINKS, SELF_STUDY_LINK, GUIDE_LINK];
  return account === null ? [...links, SIGN_IN_LINK] : links;
}

// On a phone the menu folds away; the person's main page stays one tap from every screen.
function findShortcut(account: AccountSummary | null | undefined) {
  if (account === undefined) {
    return null;
  }
  if (!account) {
    return SIGN_IN_LINK;
  }
  return account.role === "teacher"
    ? { href: "/teach", label: "Giảng dạy", isSection: true }
    : { href: "/classes", label: "Lớp của tôi", isSection: true };
}

function isCurrent(link: NavigationLink, pathname: string) {
  if (link.relatedPaths?.includes(pathname)) {
    return true;
  }
  return link.isSection ? pathname.startsWith(link.href) : pathname === link.href;
}

export function SiteHeader() {
  const pathname = usePathname();
  const account = useAccountSummary();
  const toggleRef = useRef<HTMLButtonElement>(null);
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const isMenuOpen = openPath === pathname;
  const shortcut = findShortcut(account);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && isMenuOpen) {
      setOpenPath(null);
      toggleRef.current?.focus();
    }
  }

  return (
    <header className="site-header" onKeyDown={handleKeyDown}>
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Reng, trang chủ">
          <BrandMark />
          <span>
            Reng
            <span className="brand-caption">Dạy và học online</span>
          </span>
        </Link>
        {shortcut && (
          <Link
            href={shortcut.href}
            className="header-shortcut"
            aria-current={isCurrent(shortcut, pathname) ? "page" : undefined}
          >
            {shortcut.label}
          </Link>
        )}
        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="site-navigation"
          onClick={() => setOpenPath(isMenuOpen ? null : pathname)}
        >
          {isMenuOpen ? "Đóng" : "Menu"}
        </button>
        <nav id="site-navigation" aria-label="Điều hướng chính" data-open={isMenuOpen}>
          {listLinks(account).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link, pathname) ? "page" : undefined}
              data-guest-only={account === undefined && link.isGuestOnly ? "" : undefined}
              onClick={() => setOpenPath(null)}
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

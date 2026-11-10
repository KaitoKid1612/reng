import Link from "next/link";

interface SettingsNavProps {
  current: "account" | "notifications";
}

/** Tabs between the two settings pages, so either one leads to the other. */
export function SettingsNav({ current }: SettingsNavProps) {
  const tabs = [
    { key: "account", href: "/settings/account", label: "Tài khoản" },
    { key: "notifications", href: "/settings/notifications", label: "Nhắc học" },
  ] as const;
  return (
    <nav className="settings-tabs" aria-label="Cài đặt">
      {tabs.map((tab) => (
        <Link key={tab.key} href={tab.href} aria-current={tab.key === current ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

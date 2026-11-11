"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  ChartColumn,
  Compass,
  FilePlus2,
  NotebookPen,
  Presentation,
  RotateCcw,
  School,
} from "lucide-react";
import { useState } from "react";

import { HomeAgenda, useHomeAgenda } from "@/components/classroom/home-agenda";
import { StreakCard } from "@/components/progress/streak-card";
import { TeacherTodayPanel } from "@/components/teach/teacher-today";
import { useAccountSummary } from "@/components/use-account-summary";

import type { AccountSummary } from "@/components/use-account-summary";
import type { LucideIcon } from "lucide-react";

interface Shortcut {
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

const LEARNER_SHORTCUTS: readonly Shortcut[] = [
  {
    href: "/classes",
    title: "Lớp của tôi",
    description: "Bài cần làm, bài đã mở và buổi học tới.",
    Icon: School,
  },
  {
    href: "/review",
    title: "Ôn tập",
    description: "Thẻ từ vựng và câu sai đến hạn ôn hôm nay.",
    Icon: RotateCcw,
  },
  {
    href: "/mistakes",
    title: "Sổ lỗi",
    description: "Những câu đã sai, làm lại đến khi đúng.",
    Icon: NotebookPen,
  },
  {
    href: "/progress",
    title: "Tiến độ",
    description: "Chuỗi ngày học, điểm theo tuần và dạng câu hay sai.",
    Icon: ChartColumn,
  },
];

const TEACHER_SHORTCUTS: readonly Shortcut[] = [
  {
    href: "/teach",
    title: "Giảng dạy",
    description: "Lớp đang dạy, bài nộp mới và việc cần làm hôm nay.",
    Icon: Presentation,
  },
  {
    href: "/teach/lessons/new",
    title: "Soạn bài mới",
    description: "Từ vựng, mẫu câu, slide và câu luyện cho buổi tới.",
    Icon: FilePlus2,
  },
  {
    href: "/classes",
    title: "Lớp đang học",
    description: "Những lớp bạn tham gia với vai trò học viên.",
    Icon: BookOpenCheck,
  },
];

const SELF_STUDY_SHORTCUT: Shortcut = {
  href: "/self-study",
  title: "Tự học",
  description: "Bảng chữ, luyện đọc và bài học công khai.",
  Icon: Compass,
};

function greetingFor(hour: number) {
  if (hour < 11) {
    return "Chào buổi sáng";
  }
  if (hour < 13) {
    return "Chào buổi trưa";
  }
  return hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "numeric",
  month: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});
const HOUR_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Ho_Chi_Minh",
});

interface MemberHomeProps {
  account: AccountSummary;
}

function MemberHome({ account }: MemberHomeProps) {
  // Mounted only in the browser once the account has loaded, so the clock never differs from a
  // server render.
  const [now] = useState(() => new Date());
  const home = useHomeAgenda();
  const shortcuts = [
    ...(account.role === "teacher" ? TEACHER_SHORTCUTS : LEARNER_SHORTCUTS),
    SELF_STUDY_SHORTCUT,
  ];

  return (
    <div className="member-home">
      <div className="member-top">
        <div className="member-greeting">
          <h1>
            {greetingFor(Number(HOUR_FORMAT.format(now)))}, {account.name}
          </h1>
          <p className="muted">{DATE_FORMAT.format(now)}</p>
        </div>
        {home?.streak && <StreakCard streak={home.streak} />}
      </div>
      {home?.teaching && <TeacherTodayPanel today={home.teaching} isOnHome />}
      <HomeAgenda agenda={home?.agenda ?? null} />
      <section aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="member-shortcuts-title">
          Đi nhanh tới
        </h2>
        <div className="link-cards member-shortcuts">
          {shortcuts.map(({ href, title, description, Icon }, index) => (
            <Link
              key={href}
              href={href}
              className="link-card"
              aria-labelledby={`shortcut-${index}-title`}
              aria-describedby={`shortcut-${index}-description`}
            >
              <span className="shortcut-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <span id={`shortcut-${index}-title`} className="link-card-title">
                {title}
              </span>
              <span id={`shortcut-${index}-description`} className="small muted">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// Signed-in people get their own start page in place of the welcome text for visitors. A browser
// that was signed in before hides the visitor sections from the first paint (lib/account-hint.ts)
// and holds this space with a placeholder until the account answers.
export function HomeWelcome() {
  const account = useAccountSummary();
  if (account === undefined) {
    return <div className="member-home-placeholder" aria-hidden="true" />;
  }
  return account ? <MemberHome account={account} /> : null;
}

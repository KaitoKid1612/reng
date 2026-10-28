import Link from "next/link";

import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/klee-one/400.css";
import "reveal.js/reveal.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AudioProvider } from "@/components/audio-provider";
import { audioManifest } from "@/lib/data";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Masu — Học tiếng Nhật từ những nét đầu tiên",
    template: "%s | Masu",
  },
  description: "Làm quen Hiragana, Katakana và luyện đọc tiếng Nhật bằng romaji.",
};
interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi">
      <body>
        <a href="#main-content" className="skip-link">
          Đến nội dung chính
        </a>
        <SiteHeader />
        <AudioProvider assets={audioManifest.assets}>
          <main id="main-content" className="page-container">
            {children}
          </main>
        </AudioProvider>
        <footer className="site-footer">
          <div>
            <span>Masu — Cùng học tiếng Nhật, từng chút một.</span>
            <Link href="/sources">Nguồn dữ liệu</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}

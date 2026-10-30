import Link from "next/link";

import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/klee-one/400.css";
import "reveal.js/reveal.css";
import "./globals.css";
import "./lesson-visuals.css";
import { SiteHeader } from "@/components/site-header";
import { AudioProvider } from "@/components/audio-provider";
import { audioManifest } from "@/lib/data";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

import type { Metadata } from "next";
import type { ReactNode } from "react";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Reng — Lớp học ngoại ngữ online cho giáo viên và học viên",
    template: "%s | Reng",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, locale: "vi_VN", type: "website" },
  twitter: { card: "summary_large_image" },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
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
            <span>Reng — Lớp học ngoại ngữ online cho thầy cô và học viên.</span>
            <nav className="footer-links" aria-label="Liên kết cuối trang">
              <Link href="/guide">Hướng dẫn sử dụng</Link>
              <Link href="/sources">Nguồn dữ liệu</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

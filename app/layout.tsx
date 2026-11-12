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
import "./charts.css";
import { SiteHeader } from "@/components/site-header";
import { AudioProvider } from "@/components/audio-provider";
import { HeadScript } from "@/components/head-script";
import { ACCOUNT_HINT_SCRIPT } from "@/lib/account-hint";
import { audioManifest } from "@/lib/data";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";

import type { Metadata } from "next";
import type { ReactNode } from "react";

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
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
    // The account hint and theme scripts set data attributes on <html> before hydration.
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Inline so it runs while the HTML is parsed, before the first paint. */}
        <HeadScript code={ACCOUNT_HINT_SCRIPT} />
        <HeadScript code={THEME_SCRIPT} />
      </head>
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
            <span>
              {SITE_NAME} — {SITE_TAGLINE}.
            </span>
            <nav className="footer-links" aria-label="Liên kết cuối trang">
              <Link href="/guide">Hướng dẫn sử dụng</Link>
              <Link href="/sources">Nguồn dữ liệu</Link>
              <Link href="/terms">Điều khoản</Link>
              <Link href="/privacy">Quyền riêng tư</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

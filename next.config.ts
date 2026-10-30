import type { NextConfig } from "next";

// Reng is never embedded in another site, so framing is refused (clickjacking on teacher and
// admin buttons); class invite links keep their code out of cross-site Referer headers.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  redirects() {
    return [
      { source: "/kana/luyen", destination: "/kana/practice", permanent: true },
      { source: "/nguon-du-lieu", destination: "/sources", permanent: true },
      { source: "/teach/sign-in", destination: "/sign-in?next=/teach", permanent: true },
    ];
  },
};
export default config;

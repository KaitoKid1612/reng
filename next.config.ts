import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  redirects() {
    return [
      { source: "/kana/luyen", destination: "/kana/practice", permanent: true },
      { source: "/nguon-du-lieu", destination: "/sources", permanent: true },
      { source: "/teach/sign-in", destination: "/sign-in?next=/teach", permanent: true },
    ];
  },
};
export default config;

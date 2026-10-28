import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  redirects() {
    return [
      { source: "/kana/luyen", destination: "/kana/practice", permanent: true },
      { source: "/nguon-du-lieu", destination: "/sources", permanent: true },
    ];
  },
};
export default config;

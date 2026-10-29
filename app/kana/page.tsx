import { KanaChart } from "@/components/kana/kana-chart";
import { kanaItems } from "@/lib/data";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng chữ cái tiếng Nhật Hiragana và Katakana",
  description:
    "Bảng Hiragana và Katakana đầy đủ cho người Việt mới học tiếng Nhật: âm cơ bản, âm đục, âm ghép, có nghe phát âm.",
  alternates: { canonical: "/kana" },
};
export default function KanaPage() {
  return <KanaChart items={kanaItems} />;
}

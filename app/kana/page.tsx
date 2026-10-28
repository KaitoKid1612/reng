import { KanaChart } from "@/components/kana/kana-chart";
import { kanaItems } from "@/lib/data";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bảng chữ cái" };
export default function KanaPage() {
  return <KanaChart items={kanaItems} />;
}

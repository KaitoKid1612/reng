import { KanaPractice } from "@/components/kana/kana-practice";
import { kanaItems } from "@/lib/data";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện đọc kana" };
interface PracticePageProps {
  searchParams: Promise<{ script?: string }>;
}

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const query = await searchParams;
  return (
    <KanaPractice
      items={kanaItems}
      initialScript={query.script === "katakana" ? "katakana" : "hiragana"}
    />
  );
}

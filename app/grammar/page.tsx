import { GrammarSearch } from "@/components/lessons/grammar-search";
import { listPublicLessons } from "@/lib/lesson-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tra cứu ngữ pháp" };
export const dynamic = "force-dynamic";

export default async function GrammarPage() {
  return <GrammarSearch lessons={await listPublicLessons()} />;
}

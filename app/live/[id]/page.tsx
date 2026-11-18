import { notFound } from "next/navigation";
import { z } from "zod";

import { LiveQuizPlayer } from "@/components/live/live-quiz-player";
import { requireStudent } from "@/lib/server/account";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thi đấu cả lớp",
  robots: { index: false, follow: false },
};

interface LivePageProps {
  params: Promise<{ id: string }>;
}

// Opened from the code on the shared slides; signing in first comes back here.
export default async function LivePage({ params }: LivePageProps) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }
  await requireStudent(`/live/${id}`);
  return <LiveQuizPlayer quizId={id} />;
}

import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/server/account";
import { isPlatformAdmin } from "@/lib/server/admin";
import { hasLearningHistory } from "@/lib/server/learning-history";

export async function GET() {
  const account = await getCurrentAccount();
  // The archive link is optional, so a failed lookup only hides it.
  const [isAdmin, hasHistory] = account
    ? await Promise.all([isPlatformAdmin(account.id), hasLearningHistory().catch(() => false)])
    : [false, false];
  return NextResponse.json(
    {
      user: account
        ? { name: account.fullName, role: account.role, isAdmin, hasLearningHistory: hasHistory }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

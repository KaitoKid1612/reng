import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/server/account";
import { isPlatformAdmin } from "@/lib/server/admin";
import { hasJapaneseClass } from "@/lib/server/classes";

export async function GET() {
  const account = await getCurrentAccount();
  const [isAdmin, studiesJapanese] = account
    ? await Promise.all([
        isPlatformAdmin(account.id),
        // The header's JLPT countdown only; a failed read just leaves it out.
        hasJapaneseClass(account.id).catch(() => false),
      ])
    : [false, false];
  return NextResponse.json(
    {
      user: account
        ? { name: account.fullName, role: account.role, isAdmin, hasJapaneseClass: studiesJapanese }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

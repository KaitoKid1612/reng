import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/server/account";
import { isPlatformAdmin } from "@/lib/server/admin";

export async function GET() {
  const account = await getCurrentAccount();
  const isAdmin = account ? await isPlatformAdmin(account.id) : false;
  return NextResponse.json(
    { user: account ? { name: account.fullName, role: account.role, isAdmin } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/server/account";

export async function GET() {
  const account = await getCurrentAccount();
  return NextResponse.json(
    { user: account ? { name: account.fullName, role: account.role } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

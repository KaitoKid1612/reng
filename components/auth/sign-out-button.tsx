"use client";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { clearLocalDrafts } from "@/lib/local-draft";

export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={clearLocalDrafts}>
      <Button type="submit" variant="ghost">
        Đăng xuất
      </Button>
    </form>
  );
}

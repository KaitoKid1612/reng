"use client";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { clearLocalDrafts } from "@/lib/local-draft";

// On a shared computer the next person must not get this person's reminders. The browser
// subscription ends here; the server drops its record the next time a send finds it gone.
async function stopNotifications() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration("/");
  await (await registration?.pushManager?.getSubscription())?.unsubscribe();
}

export function SignOutButton() {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        clearLocalDrafts();
        void stopNotifications().catch(() => undefined);
      }}
    >
      <Button type="submit" variant="ghost">
        Đăng xuất
      </Button>
    </form>
  );
}

"use client";

import { useEffect } from "react";

import { isInPlaceNavigation } from "@/lib/leave-warning";

const LEAVE_MESSAGE =
  "Bài còn thay đổi chưa lưu. Vẫn rời trang? Reng giữ tạm các thay đổi này trên máy này và khôi phục khi bạn mở lại trình soạn.";

// Closing or reloading the tab gets the browser's prompt; links inside Reng change the page
// without unloading it, so they ask here first.
export function useLeaveWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    // A plain link the person already confirmed unloads the page; skip the second prompt.
    let isConfirmed = false;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isConfirmed) {
        event.preventDefault();
      }
    }
    // Capture phase runs before Next.js links handle the click, so cancelling stops navigation.
    function handleClick(event: MouseEvent) {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const target = {
        href: link.href,
        target: link.target,
        hasDownload: link.hasAttribute("download"),
      };
      if (!isInPlaceNavigation(target, event, window.location.href)) {
        return;
      }
      if (window.confirm(LEAVE_MESSAGE)) {
        isConfirmed = true;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty]);
}

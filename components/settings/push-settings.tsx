"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";

import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";

import type { PushActionState } from "@/app/actions/notifications";

type Support = "checking" | "unsupported" | "install-first" | "blocked" | "ready";

const SERVICE_WORKER = "/sw.js";

// iPhone and iPad only offer notifications to a site added to the home screen.
function needsHomeScreen() {
  const isAppleTouch =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isAppleTouch && !isInstalled;
}

function readSupport(): Support {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return needsHomeScreen() ? "install-first" : "unsupported";
  }
  return Notification.permission === "denied" ? "blocked" : "ready";
}

// The permission can change in another tab or the browser's site settings; a focus re-reads it.
function subscribeToSupport(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}

function base64UrlToBytes(value: string) {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

// Settings › Nhắc học: turns study reminders on or off as browser notifications on this device.
export function PushSettings({ publicKey }: { publicKey: string }) {
  const support = useSyncExternalStore(subscribeToSupport, readSupport, () => "checking" as const);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [result, setResult] = useState<PushActionState>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (support !== "ready") {
      return;
    }
    currentSubscription()
      .then((subscription) => setEndpoint(subscription?.endpoint ?? null))
      .catch(() => setEndpoint(null));
  }, [support]);

  function turnOn() {
    startTransition(async () => {
      setResult({});
      try {
        // Asked inside the click, as browsers require.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setResult({
            error:
              permission === "denied"
                ? "Bạn đã chặn thông báo. Mở cài đặt trang (biểu tượng cạnh địa chỉ web), cho phép Thông báo rồi tải lại trang."
                : "Bạn chưa cho phép thông báo nên Reng chưa nhắc được trên thiết bị này.",
          });
          return;
        }
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER, { scope: "/" });
        await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToBytes(publicKey),
          }));
        const saved = await savePushSubscriptionAction(subscription.toJSON());
        setResult(saved);
        if (!saved.error) {
          setEndpoint(subscription.endpoint);
        }
      } catch {
        setResult({ error: "Trình duyệt chưa bật được thông báo. Bạn thử lại nhé." });
      }
    });
  }

  function turnOff() {
    startTransition(async () => {
      setResult({});
      try {
        const subscription = await currentSubscription();
        const known = endpoint ?? subscription?.endpoint;
        await subscription?.unsubscribe();
        setResult(known ? await deletePushSubscriptionAction(known) : {});
        setEndpoint(null);
      } catch {
        setResult({ error: "Chưa tắt được. Bạn thử lại nhé." });
      }
    });
  }

  function sendTest() {
    startTransition(async () => {
      setResult({});
      setResult(await sendTestPushAction());
    });
  }

  return (
    <section className="form-card" aria-labelledby="push-title">
      <h2 id="push-title">Thông báo trên thiết bị này</h2>
      <p className="small muted">
        Reng nhắc lúc 20:00 khi bạn có bài cần làm hoặc thẻ cần ôn, theo lựa chọn Nhắc học bên dưới.
        Mỗi máy và mỗi trình duyệt bật riêng; đăng xuất sẽ tắt thông báo trên máy đó.
      </p>
      {support === "checking" && <p className="small muted">Đang kiểm tra trình duyệt…</p>}
      {support === "install-first" && (
        <p className="notice-panel">
          Trên iPhone, iPad: mở Reng bằng Safari, bấm nút Chia sẻ rồi chọn Thêm vào MH chính. Mở
          Reng từ biểu tượng mới trên màn hình chính và bật thông báo ở đây.
        </p>
      )}
      {support === "unsupported" && (
        <p className="notice-panel">
          Trình duyệt này chưa hỗ trợ thông báo. Dùng Chrome, Edge, Firefox hoặc Safari bản mới.
        </p>
      )}
      {support === "blocked" && (
        <p className="notice-panel">
          Thông báo của Reng đang bị chặn. Mở cài đặt trang (biểu tượng cạnh địa chỉ web), cho phép
          Thông báo rồi tải lại trang.
        </p>
      )}
      {support === "ready" && (
        <>
          <p className="small" role="status">
            {endpoint ? "Thiết bị này đang nhận nhắc học." : "Thiết bị này chưa nhận nhắc học."}
          </p>
          <div className="button-row">
            {endpoint ? (
              <>
                <Button variant="outline" disabled={isPending} onClick={sendTest}>
                  Gửi thử
                </Button>
                <Button variant="ghost" disabled={isPending} onClick={turnOff}>
                  Tắt trên thiết bị này
                </Button>
              </>
            ) : (
              <Button disabled={isPending} onClick={turnOn}>
                {isPending ? "Đang bật…" : "Bật thông báo trên thiết bị này"}
              </Button>
            )}
          </div>
        </>
      )}
      {result.error && (
        <p role="alert" className="error-text">
          {result.error}
        </p>
      )}
      {result.notice && (
        <p role="status" className="form-notice">
          {result.notice}
        </p>
      )}
    </section>
  );
}

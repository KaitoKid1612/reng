// Reng service worker: browser notifications only (lib/server/push.ts sends them). It caches
// nothing, so pages always come from the network as before.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function readMessage(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return { body: event.data ? event.data.text() : "" };
  }
}

// Only a path on this site opens; anything else falls back to the home page.
function sameOriginUrl(path) {
  const url = new URL(typeof path === "string" && path.startsWith("/") ? path : "/", self.location.origin);
  return url.origin === self.location.origin ? url.href : self.location.origin;
}

self.addEventListener("push", (event) => {
  const message = readMessage(event);
  event.waitUntil(
    self.registration.showNotification(message.title || "Reng", {
      body: message.body || "",
      icon: "/app-icon-192.png",
      badge: "/app-icon-192.png",
      tag: message.tag || "reng",
      lang: "vi",
      data: { url: sameOriginUrl(message.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url === url && "focus" in client);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});

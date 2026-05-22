/// <reference lib="webworker" />
const workerConfig = {};
export default workerConfig;

declare let self: ServiceWorkerGlobalScope & { __WB_DISABLE_DEV_LOGS: boolean };

// To disable all workbox logging during development
self.__WB_DISABLE_DEV_LOGS = true;

// Listen for push events
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || "Nueva Notificación";
  const options: NotificationOptions = {
    body: data.body || "Tienes un nuevo mensaje.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: data.url ? { url: data.url } : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // HAL-15: Validar que la URL de la notificación sea del mismo origen.
  // Previene que un payload push malicioso abra URLs de phishing externas.
  const rawUrl: string = event.notification.data?.url || "/";
  let safeUrl = "/";

  try {
    const parsed = new URL(rawUrl, self.registration.scope);
    const scope = new URL(self.registration.scope);
    // Solo permitir URLs del mismo origen
    if (parsed.origin === scope.origin) {
      safeUrl = parsed.pathname + parsed.search + parsed.hash;
    } else {
      console.warn("[SW] Blocked external URL from push notification:", rawUrl);
    }
  } catch {
    // URL malformada — usar fallback
    safeUrl = "/";
  }

  // Check if there is already a window/tab open with the target URL
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.endsWith(safeUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(safeUrl);
        }
      })
  );
});


/// <reference lib="webworker" />
export default null;

declare let self: ServiceWorkerGlobalScope;

// To disable all workbox logging during development
(self as any).__WB_DISABLE_DEV_LOGS = true;

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

  const url = event.notification.data?.url || "/";

  // Check if there is already a window/tab open with the target URL
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

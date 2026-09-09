self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Barbería", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title || "Barbería", {
      body: data.body || "",
      icon: "/favicon.ico",
      data: { url: data.url || "/dashboard/agenda" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/agenda";
  event.waitUntil(clients.openWindow(url));
});

import { precacheAndRoute } from 'workbox-precaching';

// Precarga los archivos estáticos generados por Vite
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nueva notificación', body: event.data.text() };
    }
  }

  const title = data.title || 'Nueva alerta';
  const options = {
    body: data.body || 'Tienes una nueva notificación en el sistema.',
    icon: data.icon || '/vite.svg',
    badge: '/vite.svg',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Si ya hay una pestaña abierta con esa URL o dominio, enfocala
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (urlToOpen && urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Si no, abre una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen || '/');
      }
    })
  );
});

import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precarga los archivos estáticos generados por Vite
precacheAndRoute(self.__WB_MANIFEST || []);

// --- NAVEGADOR DE RESPALDO (Navigation Fallback) ---
// Redirige cualquier recarga de pestaña (ej. /socios) al index.html cacheado si no hay red.
try {
  const handler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [
      new RegExp('/rest/v1/'),
      new RegExp('/storage/v1/')
    ]
  });
  registerRoute(navigationRoute);
} catch (error) {
  console.warn('Navigation fallback error:', error);
}
// --- MODO ESPERA PARA PERMITIR ALERTA VISUAL ---
self.addEventListener('install', (event) => {
  // El SW se instalará pero se quedará en estado "waiting"
  // hasta que reciba el mensaje 'SKIP_WAITING' desde la UI (PWAPrompt)
});

self.addEventListener('activate', (event) => {
  // Obliga al nuevo Service Worker a tomar control de todas las pestañas abiertas
  event.waitUntil(
    clients.claim().then(() => {
      // Elimina la caché venenosa de Supabase de los discos duros de los ingenieros
      return caches.delete('supabase-api-cache');
    })
  );
});

// EVENTO DE AUTO-ACTUALIZACIÓN INMEDIATA (Auto Update)
// Cuando hay un nuevo despliegue (Github/Easypanel), el navegador le enviará este mensaje
// para que el Service Worker viejo se cierre instantáneamente y aplique el código nuevo
// sin necesidad de que el usuario borre su caché manualmente.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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

// Service Worker for Ghanshyamdas Saraf College Announcement Portal Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'New Notice Posted', body: 'Please check the announcement portal.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = { title: 'New Notice Posted', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png', // Fallback icon path (public folder logo)
    badge: '/logo.png',
    data: {
      url: data.url || '/'
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'view', title: 'View Notice' }
    ]
  };

  event.waitUntil(
    (async () => {
      // Check if notification permission is granted before displaying
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        console.warn('[SW] Push received but notification permission is not granted:', Notification.permission);
        return;
      }
      try {
        await self.registration.showNotification(data.title, options);
      } catch (err) {
        console.warn('[SW] Failed to show notification:', err);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and redirect
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      // Otherwise, open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

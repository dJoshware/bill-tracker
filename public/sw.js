self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Bill Reminder';
  const options = {
    body: data.body || 'You have a bill due soon.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'bill-reminder',
    data: data.url || '/',
    actions: [
      { action: 'view', title: 'View Bills' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data || '/'));
  }
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

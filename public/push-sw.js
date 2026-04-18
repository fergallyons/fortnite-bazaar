// Push notification handler — imported by the generated service worker
self.addEventListener('push', function (event) {
  var data = {}
  try { data = event.data.json() } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Cameron's Fortnite Bazaar", {
      body: data.body || 'The Fortnite shop has refreshed — new skins are available!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'fn-shop',
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})

// Triggered by the client when it detects a new shop date
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SHOP_UPDATED') {
    event.waitUntil(
      self.registration.showNotification("Cameron's Fortnite Bazaar", {
        body: '\uD83D\uDED2 New skins just dropped in the shop!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'fn-shop',
      })
    )
  }
})

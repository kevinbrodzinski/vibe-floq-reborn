// Clear service worker script - run this in browser console if you have SW issues
console.log('🧹 Clearing service worker and caches...');

// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => {
    console.log('Unregistering SW:', registration.scope);
    registration.unregister();
  });
});

// Clear all caches
caches.keys().then(keys => {
  keys.forEach(key => {
    console.log('Deleting cache:', key);
    caches.delete(key);
  });
});

// Reload after clearing
setTimeout(() => {
  console.log('✅ Cleared! Reloading...');
  location.reload();
}, 1000);
// Quick debug setup script - paste this in the browser console

// 1. Set debug location to Venice Beach (matches seed data)
localStorage.setItem('floq-debug-forceLoc','33.985,-118.469');

// 2. Enable stub presence mode (overrides mock mode)
const url = new URL(window.location);
url.searchParams.set('presence', 'stub');
window.location.href = url.toString();

// Alternative: enable live mode for real database data
// url.searchParams.set('presence', 'live');

console.log('🔧 Debug setup complete! Location set to Venice Beach, presence mode updated.');
console.log('📍 Location: 33.985, -118.469 (Venice Beach)');
console.log('💾 Demo data should expire in 4 hours from database seeding');
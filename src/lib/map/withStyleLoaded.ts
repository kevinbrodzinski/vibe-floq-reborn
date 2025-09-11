export function withStyleLoaded(map: any, fn: () => void) {
  if (!map) return;
  const run = () => { try { fn(); } catch {/* noop */} };
  map.isStyleLoaded?.() ? run() : map.once('style.load', run);
}
export function withStyleLoaded(map: any, fn: () => void) {
  if (!map) return;
  map.isStyleLoaded?.() ? fn() : map.once('style.load', fn);
}
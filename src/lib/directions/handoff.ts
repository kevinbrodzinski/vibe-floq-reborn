// Safe directions handoff: tries native (Capacitor / app) first,
// then falls back to Google/Apple Maps URLs.
export function openDirections(opts: {
  dest: { lat: number; lng: number };
  label?: string;
  mode?: 'transit' | 'walk' | 'bike' | 'drive';
}) {
  const { dest, label, mode } = opts;
  const q = encodeURIComponent(label ?? `${dest.lat},${dest.lng}`);
  
  // Try native helper if present in your app bundle
  try {
    // Lazy import so SSR won't explode
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@/lib/directions/native');
    if (mod?.openTransitFirstOrRideshare) {
      mod.openTransitFirstOrRideshare({ dest, label, mode });
      return;
    }
  } catch {/* noop */ }

  // Web fallback
  const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const url = isApple
    ? `http://maps.apple.com/?daddr=${dest.lat},${dest.lng}&q=${q}`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest.lat}%2C${dest.lng}&destination_place_id=&travelmode=${mode ?? 'transit'}&dir_action=navigate`;

  try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {/* noop */ }
}
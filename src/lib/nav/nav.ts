/* eslint-disable @typescript-eslint/no-explicit-any */

export function openInbox() {
  window.dispatchEvent(new CustomEvent('ui:rallyInbox:open'));
}

export function closeInbox() {
  window.dispatchEvent(new CustomEvent('ui:rallyInbox:close'));
}

/** Opens a specific rally thread by id */
export function openInboxThread(threadId: string) {
  if (!threadId) return;
  window.dispatchEvent(new CustomEvent('ui:rallyInbox:openThread', { detail: { threadId } }));
}

/** Smooth pan to lng/lat (default zoom = 15) */
export function flyTo(lng: number, lat: number, zoom = 15) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
  window.dispatchEvent(new CustomEvent('ui:map:flyTo', { detail: { lng, lat, zoom } }));
}

/** Pan + show a quick 'pulse' at destination (visual feedback) */
export function flyToAndPulse(lng: number, lat: number, zoom = 15, duration = 1600) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
  window.dispatchEvent(new CustomEvent('ui:map:flyTo', { detail: { lng, lat, zoom } }));
  window.dispatchEvent(new CustomEvent('ui:nav:dest', { detail: { lng, lat, duration } }));
}

/**
 * The "Floq Up" one-liner: pan, pulse, and kick off directions (transit-first).
 * Keeping directions out-of-band means you can reuse this without opening maps, too.
 */
export function floqUp(lat: number, lng: number, label?: string) {
  flyToAndPulse(lng, lat, 15, 1600);
  // Lazy-load to keep main bundle slim and consistent with canonical path
  import('@/lib/directions/native').then(({ openTransitFirstOrRideshare }) => {
    openTransitFirstOrRideshare({ dest: { lat, lng }, label, transitMode: 'rail|bus' });
  }).catch(() => {/* no-op */});
}
export function openInbox() {
  window.dispatchEvent(new CustomEvent('ui:rallyInbox:open'));
}

export function closeInbox() {
  window.dispatchEvent(new CustomEvent('ui:rallyInbox:close'));
}

export function openThread(threadId: string) {
  window.dispatchEvent(new CustomEvent('ui:rallyInbox:openThread', { detail: { threadId } }));
}

export function flyTo(lng: number, lat: number, zoom = 15) {
  window.dispatchEvent(new CustomEvent('ui:map:flyTo', { detail: { lng, lat, zoom } }));
}

export function pulseDest(lng: number, lat: number, duration = 1400) {
  window.dispatchEvent(new CustomEvent('ui:nav:dest', { detail: { lng, lat, duration } }));
}

/** Convenience: pan + pulse in one call */
export function flyToAndPulse(lng: number, lat: number, zoom = 15, duration = 1400) {
  flyTo(lng, lat, zoom);
  pulseDest(lng, lat, duration);
}

/** "Floq Up" → pan + pulse + open directions */
export async function floqUp(lat: number, lng: number, label?: string) {
  flyToAndPulse(lng, lat);
  const { openTransitFirstOrRideshare } = await import('@/lib/directions/native');
  openTransitFirstOrRideshare({ dest: { lat, lng }, label });
}
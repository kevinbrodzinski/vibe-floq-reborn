// src/lib/field/overlayBridge.ts
// Tiny in-memory pub/sub so both the 2D canvas and GL layer share one source of truth.

export type RawOverlayEntity = Record<string, any>;
export type OverlayProvider = () => RawOverlayEntity[];

let provider: OverlayProvider | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const cb of Array.from(listeners)) {
    try { cb(); } catch {}
  }
}

/** Register/replace the current overlay provider */
export function setFieldOverlayProvider(p: OverlayProvider) {
  provider = p;
  emit();
}

/** Optional: clear provider (used on unmounts if needed) */
export function clearFieldOverlayProvider() {
  provider = null;
  emit();
}

/** Read a snapshot (safe even if not set) */
export function getFieldOverlaySnapshot(): RawOverlayEntity[] {
  return provider ? provider() : [];
}

/** Subscribe to overlay changes. Returns an unsubscribe fn. */
export function subscribeFieldOverlay(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Imperative nudge when underlying data changed. */
export function notifyFieldOverlayChanged() {
  emit();
}
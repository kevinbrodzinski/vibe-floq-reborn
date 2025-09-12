/* eslint-disable @typescript-eslint/no-explicit-any */
import type mapboxgl from 'mapbox-gl';

type Updater = (map: mapboxgl.Map) => void;
type Unmounter = (map: mapboxgl.Map) => void;

type Overlay = {
  id: string;
  order: number;
  update: Updater;        // should be idempotent: create source/layers if missing; setData otherwise
  unmount?: Unmounter;    // optional: remove layers/sources (best effort)
  lastHash?: string;
  pending?: boolean;
};

const RAF = (fn: () => void) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(fn) : setTimeout(fn, 16));

export class LayerManager {
  private map: mapboxgl.Map;
  private overlays = new Map<string, Overlay>();
  private onStyle = () => this.remountAll();
  private disposed = false;

  constructor(map: mapboxgl.Map) {
    this.map = map;
    // Re-apply overlays when the style changes
    this.map.on('style.load', this.onStyle);
  }

  /** Register/Update an overlay. The updateFn must be safe to call repeatedly. */
  upsert(id: string, hash: string, updateFn: Updater, opts?: { order?: number; unmount?: Unmounter }) {
    if (this.disposed) return;

    const order = opts?.order ?? 0;
    const next = this.overlays.get(id) ?? { id, order, update: updateFn, unmount: opts?.unmount };
    next.order = order;
    next.update = updateFn;
    next.unmount = opts?.unmount ?? next.unmount;

    // Skip work if unchanged
    if (next.lastHash === hash) {
      this.overlays.set(id, next);
      return;
    }
    next.lastHash = hash;
    this.overlays.set(id, next);

    // Schedule one update in a frame
    if (!next.pending) {
      next.pending = true;
      RAF(() => {
        next.pending = false;
        this.apply(id);
      });
    }
  }

  /** Remove overlay */
  remove(id: string) {
    const o = this.overlays.get(id);
    if (!o) return;
    try {
      if (o.unmount) o.unmount(this.map);
    } catch { /* ignore */ }
    this.overlays.delete(id);
  }

  /** Clean up everything */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try { this.map.off('style.load', this.onStyle); } catch {}
    for (const id of Array.from(this.overlays.keys())) this.remove(id);
    this.overlays.clear();
  }

  /** Re-apply all overlays on new style */
  private remountAll() {
    if (this.disposed) return;
    const list = Array.from(this.overlays.values()).sort((a, b) => a.order - b.order);
    for (const o of list) {
      this.safeApply(o);
    }
  }

  /** Apply one overlay (waits for style) */
  private apply(id: string) {
    const o = this.overlays.get(id);
    if (!o || this.disposed) return;

    if (this.map.isStyleLoaded?.()) {
      this.safeApply(o);
    } else {
      // Wait once for this style load, then apply
      const once = () => {
        try { this.safeApply(o); } finally { this.map.off('style.load', once); }
      };
      this.map.on('style.load', once);
    }
  }

  private safeApply(o: Overlay) {
    try { o.update(this.map); } catch (e) { console.warn(`[LayerManager] overlay "${o.id}" update failed`, e); }
  }
}
